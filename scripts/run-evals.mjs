#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const GOLD_PATH = resolve(REPO_ROOT, "data/eval/gold_cases.json");
const RESULTS_DIR = resolve(REPO_ROOT, "data/eval");
const LATEST_JSON = resolve(RESULTS_DIR, "results-latest.json");

const BASE_URL = process.env.TRUSTPASS_BASE_URL || "http://localhost:3000";
const MODEL = process.env.AZURE_OPENAI_DEPLOYMENT || "unknown";
const TIMEOUT_MS = Number(process.env.EVAL_TIMEOUT_MS || 25000);
const ACCURACY_FLOOR = Number(process.env.EVAL_ACCURACY_FLOOR || 0.8);

const LEVEL_ORDER = ["Low", "Caution", "High", "Emergency"];

async function main() {
  if (!existsSync(GOLD_PATH)) {
    console.error(`Gold cases file not found at ${GOLD_PATH}`);
    process.exit(2);
  }

  const raw = await readFile(GOLD_PATH, "utf8");
  /** @type {Array<GoldCase>} */
  const cases = JSON.parse(raw);
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error("Gold cases file is empty or not an array.");
    process.exit(2);
  }

  const perCase = [];
  let index = 0;
  for (const goldCase of cases) {
    index += 1;
    const label = `[${index}/${cases.length}] ${goldCase.id}`;
    process.stdout.write(`${label} ... `);
    const result = await scoreCase(goldCase);
    perCase.push(result);
    process.stdout.write(`${result.passed ? "PASS" : "FAIL"} (${result.actual_level || result.status})\n`);
  }

  const summary = summarize(perCase);
  const timestampIso = new Date().toISOString();
  const safeTimestamp = timestampIso.replace(/[:.]/g, "-");

  await mkdir(RESULTS_DIR, { recursive: true });

  const latestPayload = {
    timestamp_iso: timestampIso,
    model: MODEL,
    base_url: BASE_URL,
    case_count: cases.length,
    summary,
    per_case: perCase
  };
  await writeFile(LATEST_JSON, JSON.stringify(latestPayload, null, 2));

  const markdownPath = resolve(RESULTS_DIR, `results-${safeTimestamp}.md`);
  await writeFile(markdownPath, renderMarkdown(latestPayload));

  console.log("\nSummary:");
  console.log(`  risk_level_accuracy:     ${formatRate(summary.risk_level_accuracy)}`);
  console.log(`  risk_level_proximity:    ${formatRate(summary.risk_level_proximity)}`);
  console.log(`  category_recall:         ${formatRate(summary.category_recall)}`);
  console.log(`  signal_f1 (macro avg):   ${summary.signal_f1.toFixed(3)}`);
  console.log(`  grounding_tool_coverage: ${formatRate(summary.grounding_tool_coverage)}`);
  console.log(`  latency_p50_ms:          ${summary.latency_p50_ms}`);
  console.log(`  latency_p95_ms:          ${summary.latency_p95_ms}`);
  console.log(`\nWrote ${LATEST_JSON}`);
  console.log(`Wrote ${markdownPath}`);

  if (summary.risk_level_accuracy < ACCURACY_FLOOR) {
    console.error(
      `\nFAILED: risk_level_accuracy ${formatRate(summary.risk_level_accuracy)} < required floor ${formatRate(ACCURACY_FLOOR)}`
    );
    process.exit(1);
  }
}

/**
 * @typedef {{
 *   id: string;
 *   tags?: string[];
 *   input: {
 *     message: string;
 *     city: string;
 *     language: string;
 *     evidenceText?: string;
 *     incidentDateIso?: string;
 *     clarificationAnswers?: Record<string, string>;
 *   };
 *   expected: {
 *     risk_level: string;
 *     risk_level_proximity_acceptable?: string[];
 *     category_keywords?: string[];
 *     must_include_signals?: string[];
 *     must_not_include_signals?: string[];
 *     min_grounding_tools?: string[];
 *   };
 * }} GoldCase
 */

async function scoreCase(goldCase) {
  const expected = goldCase.expected || {};
  const minGroundingTools = expected.min_grounding_tools || [];
  const mustInclude = expected.must_include_signals || [];
  const mustNotInclude = expected.must_not_include_signals || [];
  const categoryKeywords = (expected.category_keywords || []).map((kw) => kw.toLowerCase());
  const proximityAcceptable = expected.risk_level_proximity_acceptable || [];

  const body = {
    message: goldCase.input.message,
    city: goldCase.input.city,
    language: goldCase.input.language,
    incidentDateIso: goldCase.input.incidentDateIso || new Date().toISOString()
  };
  if (goldCase.input.evidenceText) body.evidenceText = goldCase.input.evidenceText;
  if (goldCase.input.clarificationAnswers) body.clarificationAnswers = goldCase.input.clarificationAnswers;

  const start = Date.now();
  let response;
  let data;
  let errorText = null;

  try {
    response = await fetchWithTimeout(`${BASE_URL}/api/situation/analyze`, body, TIMEOUT_MS);
    data = await response.json();
  } catch (error) {
    errorText = error instanceof Error ? error.message : String(error);
  }

  const latencyMs = Date.now() - start;
  if (errorText || !response || !response.ok) {
    return failedCase(goldCase, latencyMs, errorText || `HTTP ${response?.status ?? "?"}`);
  }

  const status = typeof data?.status === "string" ? data.status : "unknown";
  const actualLevel = inferActualLevel(status, data);
  const actualCategory = inferActualCategory(status, data);
  const actualSignals = Array.isArray(data?.signals) ? data.signals.filter((sig) => typeof sig === "string") : [];
  const actualGrounding = Array.isArray(data?.grounding) ? data.grounding : [];
  const actualGroundingTools = actualGrounding
    .map((g) => (typeof g?.tool === "string" ? g.tool : null))
    .filter((t) => Boolean(t));

  const riskLevelExact = levelMatches(actualLevel, expected.risk_level);
  const riskLevelProximity =
    riskLevelExact || isProximityAcceptable(actualLevel, expected.risk_level, proximityAcceptable);

  const categoryMatch = matchesAnyKeyword(actualCategory, categoryKeywords);
  const signalF1 = computeSignalF1(actualSignals, mustInclude, mustNotInclude);
  const groundingMissing = minGroundingTools.filter((tool) => !actualGroundingTools.includes(tool));
  const groundingHit = groundingMissing.length === 0;

  const passed =
    riskLevelExact &&
    (categoryKeywords.length === 0 || categoryMatch) &&
    signalF1.f1 >= 0.5 &&
    groundingHit;

  return {
    id: goldCase.id,
    tags: goldCase.tags || [],
    passed,
    status,
    expected_level: expected.risk_level,
    actual_level: actualLevel,
    risk_level_exact: riskLevelExact,
    risk_level_proximity: riskLevelProximity,
    actual_category: actualCategory,
    category_match: categoryMatch,
    category_keywords: categoryKeywords,
    signal_f1: Number(signalF1.f1.toFixed(3)),
    signal_precision: Number(signalF1.precision.toFixed(3)),
    signal_recall: Number(signalF1.recall.toFixed(3)),
    must_include_signals: mustInclude,
    must_not_include_signals: mustNotInclude,
    matched_must_include: signalF1.matchedRequired,
    matched_forbidden: signalF1.matchedForbidden,
    actual_signals: actualSignals,
    grounding_tools_present: actualGroundingTools,
    grounding_tools_missing: groundingMissing,
    min_grounding_tools: minGroundingTools,
    latency_ms: latencyMs
  };
}

function failedCase(goldCase, latencyMs, reason) {
  const expected = goldCase.expected || {};
  return {
    id: goldCase.id,
    tags: goldCase.tags || [],
    passed: false,
    status: "error",
    expected_level: expected.risk_level,
    actual_level: null,
    risk_level_exact: false,
    risk_level_proximity: false,
    actual_category: "",
    category_match: false,
    category_keywords: (expected.category_keywords || []).map((kw) => kw.toLowerCase()),
    signal_f1: 0,
    signal_precision: 0,
    signal_recall: 0,
    must_include_signals: expected.must_include_signals || [],
    must_not_include_signals: expected.must_not_include_signals || [],
    matched_must_include: [],
    matched_forbidden: [],
    actual_signals: [],
    grounding_tools_present: [],
    grounding_tools_missing: expected.min_grounding_tools || [],
    min_grounding_tools: expected.min_grounding_tools || [],
    latency_ms: latencyMs,
    error: reason
  };
}

function inferActualLevel(status, data) {
  if (status === "completed" && typeof data?.risk_level === "string") return data.risk_level;
  if (status === "out_of_scope" || status === "evidence_mismatch") return "Low";
  if (status === "needs_clarification") return "Caution";
  return null;
}

function inferActualCategory(status, data) {
  if (typeof data?.category === "string" && data.category.length > 0) return data.category;
  if (status === "out_of_scope") {
    const summary = typeof data?.message === "string" ? data.message : "";
    return `Out of scope. ${summary}`.trim();
  }
  if (status === "evidence_mismatch") {
    const summary = typeof data?.reason === "string" ? data.reason : "";
    return `Evidence mismatch. ${summary}`.trim();
  }
  if (status === "needs_clarification") {
    const summary = typeof data?.question === "string" ? data.question : "";
    return `More context needed. ${summary}`.trim();
  }
  return "";
}

function levelMatches(actual, expected) {
  if (!actual || !expected) return false;
  return String(actual).toLowerCase() === String(expected).toLowerCase();
}

function isProximityAcceptable(actual, expected, acceptable) {
  if (!actual) return false;

  const acceptableSet = new Set((acceptable || []).map((level) => String(level).toLowerCase()));
  if (acceptableSet.has(String(actual).toLowerCase())) {
    if (!isOppositeEnds(actual, expected)) return true;
  }
  return false;
}

function isOppositeEnds(a, b) {
  const aIdx = LEVEL_ORDER.indexOf(a);
  const bIdx = LEVEL_ORDER.indexOf(b);
  if (aIdx < 0 || bIdx < 0) return false;
  const min = Math.min(aIdx, bIdx);
  const max = Math.max(aIdx, bIdx);
  return (min === 0 && max === 3);
}

function matchesAnyKeyword(category, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const lower = String(category || "").toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function computeSignalF1(actualSignals, mustInclude, mustNotInclude) {
  const actualText = (actualSignals || []).map((sig) => String(sig).toLowerCase());

  const matchedRequired = (mustInclude || []).filter((req) =>
    actualText.some((sig) => sig.includes(String(req).toLowerCase()))
  );
  const matchedForbidden = (mustNotInclude || []).filter((forbidden) =>
    actualText.some((sig) => sig.includes(String(forbidden).toLowerCase()))
  );

  const truePositive = matchedRequired.length;
  const falseNegative = (mustInclude || []).length - truePositive;
  const falsePositive = matchedForbidden.length;

  const precisionDenom = truePositive + falsePositive;
  const recallDenom = truePositive + falseNegative;
  const precision = precisionDenom > 0 ? truePositive / precisionDenom : (mustInclude || []).length === 0 ? 1 : 0;
  const recall = recallDenom > 0 ? truePositive / recallDenom : 1;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 1;

  return { precision, recall, f1, matchedRequired, matchedForbidden };
}

async function fetchWithTimeout(url, body, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function summarize(perCase) {
  const count = perCase.length || 1;
  const exact = perCase.filter((c) => c.risk_level_exact).length;
  const proximity = perCase.filter((c) => c.risk_level_proximity).length;
  const categoryMatches = perCase.filter((c) => c.category_keywords.length === 0 || c.category_match).length;
  const signalF1Sum = perCase.reduce((sum, c) => sum + (c.signal_f1 || 0), 0);
  const groundingHits = perCase.filter(
    (c) => (c.min_grounding_tools || []).length === 0 || (c.grounding_tools_missing || []).length === 0
  ).length;
  const latencies = perCase
    .map((c) => c.latency_ms)
    .filter((ms) => typeof ms === "number" && Number.isFinite(ms))
    .sort((a, b) => a - b);

  return {
    risk_level_accuracy: exact / count,
    risk_level_proximity: proximity / count,
    category_recall: categoryMatches / count,
    signal_f1: signalF1Sum / count,
    grounding_tool_coverage: groundingHits / count,
    latency_p50_ms: percentile(latencies, 0.5),
    latency_p95_ms: percentile(latencies, 0.95)
  };
}

function percentile(sortedValues, fraction) {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor(sortedValues.length * fraction)));
  return sortedValues[index];
}

function formatRate(value) {
  if (!Number.isFinite(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function renderMarkdown(payload) {
  const { timestamp_iso, model, base_url, case_count, summary, per_case } = payload;
  const lines = [];
  lines.push(`# TrustPass Thailand eval results`);
  lines.push("");
  lines.push(`- Timestamp: ${timestamp_iso}`);
  lines.push(`- Model: ${model}`);
  lines.push(`- Base URL: ${base_url}`);
  lines.push(`- Cases: ${case_count}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| risk_level_accuracy | ${formatRate(summary.risk_level_accuracy)} |`);
  lines.push(`| risk_level_proximity | ${formatRate(summary.risk_level_proximity)} |`);
  lines.push(`| category_recall | ${formatRate(summary.category_recall)} |`);
  lines.push(`| signal_f1 (macro avg) | ${summary.signal_f1.toFixed(3)} |`);
  lines.push(`| grounding_tool_coverage | ${formatRate(summary.grounding_tool_coverage)} |`);
  lines.push(`| latency_p50_ms | ${summary.latency_p50_ms} |`);
  lines.push(`| latency_p95_ms | ${summary.latency_p95_ms} |`);
  lines.push("");
  lines.push("## Per-case detail");
  lines.push("");

  for (const c of per_case) {
    lines.push(`### ${c.id}`);
    if (c.tags?.length) lines.push(`Tags: ${c.tags.join(", ")}`);
    lines.push("");
    lines.push(`- Passed: ${c.passed ? "yes" : "no"}`);
    lines.push(`- Status: ${c.status}`);
    lines.push(`- Risk level: expected ${c.expected_level}, actual ${c.actual_level ?? "n/a"} (exact ${c.risk_level_exact ? "yes" : "no"}, proximity ${c.risk_level_proximity ? "yes" : "no"})`);
    lines.push(`- Category: ${c.actual_category || "n/a"} (keywords match ${c.category_match ? "yes" : "no"})`);
    lines.push(`- Signal F1: ${c.signal_f1.toFixed(3)} (precision ${c.signal_precision.toFixed(3)}, recall ${c.signal_recall.toFixed(3)})`);
    if (c.must_include_signals?.length) {
      lines.push(`- Required signals matched: ${c.matched_must_include.length}/${c.must_include_signals.length}`);
      const missing = c.must_include_signals.filter((sig) => !c.matched_must_include.includes(sig));
      if (missing.length) lines.push(`  - Missing: ${missing.join("; ")}`);
    }
    if (c.matched_forbidden?.length) {
      lines.push(`- Forbidden signals matched (bad): ${c.matched_forbidden.join("; ")}`);
    }
    if (c.min_grounding_tools?.length) {
      lines.push(`- Grounding tools required: ${c.min_grounding_tools.join(", ")}`);
      lines.push(`- Grounding tools present: ${c.grounding_tools_present.join(", ") || "none"}`);
      if (c.grounding_tools_missing.length) lines.push(`  - Missing: ${c.grounding_tools_missing.join(", ")}`);
    }
    lines.push(`- Latency: ${c.latency_ms} ms`);
    if (c.error) lines.push(`- Error: ${c.error}`);
    if (c.actual_signals?.length) {
      lines.push(`- Actual signals: ${c.actual_signals.join("; ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(2);
});
