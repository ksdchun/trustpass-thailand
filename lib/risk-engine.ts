import riskPatterns from "@/data/risk_patterns.json";
import contacts from "@/data/emergency_contacts.json";
import { SYSTEM_PROMPT, languageInstruction } from "@/lib/system-prompt";
import type { GroundingSignal, RiskCheckRequest, RiskCheckResult, RiskLevel, RiskPattern } from "@/lib/types";

const typedPatterns = riskPatterns as RiskPattern[];

const levelWeight: Record<RiskLevel, number> = {
  Low: 0,
  Caution: 1,
  High: 2,
  Emergency: 3
};

const defaultEvidence = [
  "Screenshots or photos of the conversation, flyer, receipt, contract, or QR payment",
  "Business name, phone number, account name, profile name, and license number if shown",
  "Location, time, quoted price, vehicle plate, or pickup point if relevant"
];

const defaultThaiPhrase = "ขอเวลาตรวจสอบข้อมูลก่อนดำเนินการต่อครับ/ค่ะ";

export function classifyWithLocalRules(request: RiskCheckRequest): RiskCheckResult {
  const clarificationText = Object.values(request.clarificationAnswers || {}).join(" ");
  const combined = `${request.message} ${request.extractedText ?? ""} ${request.evidenceText ?? ""} ${clarificationText} ${request.city}`.toLowerCase();
  const matches = typedPatterns
    .map((pattern) => {
      const hits = patternApplies(pattern.id, combined)
        ? pattern.signals.filter((signal) => combined.includes(signal.toLowerCase()))
        : [];
      return { pattern, hits };
    })
    .filter((match) => match.hits.length > 0)
    .sort((a, b) => {
      const levelDiff = levelWeight[b.pattern.riskLevel] - levelWeight[a.pattern.riskLevel];
      return levelDiff || b.hits.length - a.hits.length;
    });

  if (matches.length === 0) {
    const isChinese = request.language === "Chinese";
    return {
      risk_level: "Low",
      category: isChinese ? "未发现强烈诈骗模式" : "No strong scam pattern detected",
      suspicious_signals: [],
      why_it_matters: isChinese
        ? "未发现符合泰国旅游诈骗规律的强烈信号。付款或出行前请仍核实商家身份、价格、收据和取消条款。"
        : "The message does not match the strongest tourism scam patterns. Still verify business identity, price, receipt, and cancellation terms before paying or travelling.",
      safe_next_steps: isChinese
        ? ["付款前索取正式收据和书面条款。", "请酒店工作人员或可信平台协助核实运营商。", "如有任何异常，请截图保存位置信息。"]
        : ["Ask for an official receipt and written terms before paying.", "Use hotel staff or a trusted platform to verify the operator.", "Save screenshots and location details if anything feels unusual."],
      thai_phrase: defaultThaiPhrase,
      evidence_to_save: defaultEvidence,
      contact_recommendation: isChinese
        ? "根据现有信息，无需上报。请确认基本信息，如有不明之处可询问酒店工作人员。"
        : "No escalation is recommended from the current information. Confirm basic details and ask hotel staff only if something feels unclear or changes.",
      incident_report_summary: buildReport(isChinese ? "未发现强烈诈骗模式" : "No strong scam pattern detected", "Low", request.city, [], isChinese),
      source: "local-demo"
    };
  }

  const isChinese = request.language === "Chinese";
  const strongest = matches[0].pattern;
  const allSignals = Array.from(new Set(matches.flatMap((match) => displaySignalsForMatch(match.pattern.id, match.hits, combined)))).slice(0, 8);
  const actionSet = Array.from(new Set(matches.flatMap((match) => match.pattern.actions))).slice(0, 5);

  return {
    risk_level: strongest.riskLevel,
    category: strongest.category,
    suspicious_signals: allSignals,
    why_it_matters: strongest.why,
    safe_next_steps: actionSet,
    thai_phrase: strongest.thaiPhrase,
    evidence_to_save: evidenceFor(strongest.category, isChinese),
    contact_recommendation: contactFor(strongest.riskLevel, isChinese),
    incident_report_summary: buildReport(strongest.category, strongest.riskLevel, request.city, allSignals, isChinese),
    source: "local-demo"
  };
}

export function buildPrompt(request: RiskCheckRequest, baseline: RiskCheckResult, grounding: GroundingSignal[]) {
  return [
    {
      role: "system" as const,
      content: `${SYSTEM_PROMPT}\n\n${languageInstruction(request.language)}`
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          task: "Classify tourist scam/fraud risk in Thailand. Return JSON matching the schema in the system prompt.",
          tourist_input: {
            message: request.message,
            extracted_evidence_text: request.extractedText ?? null,
            evidence_text: request.evidenceText ?? null,
            ignored_evidence_text: request.ignoredEvidenceText ?? null,
            evidence_relevance: request.evidenceRelevance ?? null,
            city: request.city,
            incident_date_iso: request.incidentDateIso ?? null,
            user_location: request.userLocation ?? null,
            clarification_answers: request.clarificationAnswers ?? null,
            output_language: request.language,
            attachments: request.attachmentsMetadata ?? []
          },
          local_rule_baseline: baseline,
          grounding_context: grounding,
          emergency_contacts: contacts
        },
        null,
        2
      )
    }
  ];
}

export function normalizeRiskResult(input: unknown, fallback: RiskCheckResult, source: RiskCheckResult["source"]): RiskCheckResult {
  if (!input || typeof input !== "object") return fallback;
  const value = input as Partial<RiskCheckResult>;
  const level = value.risk_level && ["Low", "Caution", "High", "Emergency"].includes(value.risk_level)
    ? value.risk_level
    : fallback.risk_level;

  return {
    risk_level: level as RiskLevel,
    category: value.category || fallback.category,
    suspicious_signals: arrayOr(value.suspicious_signals, fallback.suspicious_signals),
    why_it_matters: value.why_it_matters || fallback.why_it_matters,
    safe_next_steps: arrayOr(value.safe_next_steps, fallback.safe_next_steps),
    thai_phrase: value.thai_phrase || fallback.thai_phrase,
    evidence_to_save: arrayOr(value.evidence_to_save, fallback.evidence_to_save),
    contact_recommendation: value.contact_recommendation || fallback.contact_recommendation,
    incident_report_summary: {
      english: value.incident_report_summary?.english || fallback.incident_report_summary.english,
      thai: value.incident_report_summary?.thai || fallback.incident_report_summary.thai
    },
    grounding: fallback.grounding || groundingOr(value.grounding, fallback.grounding),
    source
  };
}

function patternApplies(patternId: string, text: string) {
  if (patternId === "taxi_meter_refusal") {
    return hasTaxiOrRideContext(text);
  }
  return true;
}

function hasTaxiOrRideContext(text: string) {
  return /\btaxi\b|cab|meter|fare|grab|bolt|tuk-?tuk|driver.*(?:take|ride|drive)|(?:ride|drive).*from/i.test(text);
}

function displaySignalsForMatch(patternId: string, hits: string[], text: string) {
  const hasHit = (...phrases: string[]) => phrases.some((phrase) => hits.includes(phrase) || text.includes(phrase));

  if (patternId === "taxi_meter_refusal") {
    return [
      hasHit("meter broken", "meter is broken", "meter not working", "no meter") ? "Meter refusal or meter unavailable" : null,
      hasHit("fixed fare", "800 baht", "overcharge") ? "Fixed fare quote needs route/fare verification" : null
    ].filter((signal): signal is string => Boolean(signal));
  }

  if (patternId === "personal_transfer_tour") {
    return [
      hasHit("full payment", "deposit now") ? "Full advance payment requested" : null,
      hasHit("personal account", "bank transfer") ? "Payment account appears personal" : null,
      hasHit("no license") ? "Missing operator or TAT license details" : null,
      hasHit("line only") ? "Informal LINE-only sales channel" : null,
      hasHit("limited time") ? "Time pressure or limited-time payment push" : null
    ].filter((signal): signal is string => Boolean(signal));
  }

  if (patternId === "qr_payment_mismatch") {
    return [
      hasHit("different name", "personal name", "personal account") ? "Payment account appears personal or mismatched" : null,
      hasHit("qr", "qr payment", "scan to pay") ? "QR payment requested before identity is verified" : null,
      hasHit("account name") ? "Account name needs business verification" : null
    ].filter((signal): signal is string => Boolean(signal));
  }

  if (patternId === "passport_retention") {
    return [
      hasHit("keep passport", "hold passport", "original passport", "passport deposit", "leave your passport") ? "Original passport requested as deposit" : null
    ].filter((signal): signal is string => Boolean(signal));
  }

  if (patternId === "tuktuk_detour_shop") {
    return [
      hasHit("temple is closed") ? "Attraction closure claim redirects the route" : null,
      hasHit("gem shop", "tailor shop", "government shop", "free stop", "detour") ? "Shop detour or commission stop suggested" : null,
      hasHit("special price") ? "Special-price pressure used to change plan" : null
    ].filter((signal): signal is string => Boolean(signal));
  }

  if (patternId === "rental_damage_cash_pressure") {
    return [
      hasHit("20,000 baht", "pay cash now") ? "Large cash damage demand without neutral inspection" : null,
      hasHit("no receipt") ? "No receipt or written damage estimate offered" : null,
      hasHit("no police") ? "Pressure to avoid police, insurer, or neutral process" : null,
      hasHit("scratch", "damage", "jet ski") ? "Rental damage claim under pressure" : null,
      hasHit("keep passport") ? "Passport leverage present in rental dispute" : null
    ].filter((signal): signal is string => Boolean(signal));
  }

  if (patternId === "fake_job_casting_lure") {
    return [
      hasHit("casting", "modeling", "modelling", "paid photoshoot", "job offer") ? "Job or casting offer from informal channel" : null,
      hasHit("airport pickup", "free transport", "driver will pick you up") ? "Controlled pickup or free transport offered" : null,
      hasHit("mae sot", "border", "myanmar") ? "Travel toward Mae Sot, Myanmar, or border area" : null,
      hasHit("do not tell", "keep secret", "change hotel") ? "Secrecy or isolation instruction" : null
    ].filter((signal): signal is string => Boolean(signal));
  }

  return hits;
}

function arrayOr(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

function groundingOr(value: unknown, fallback?: GroundingSignal[]) {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter((item): item is GroundingSignal => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<GroundingSignal>;
      return Boolean(candidate.tool && candidate.title && candidate.summary && candidate.confidence);
    })
    .slice(0, 4);
}

function evidenceFor(category: string, isChinese = false) {
  if (category.includes("Taxi") || category.includes("出租车")) {
    return isChinese
      ? ["出租车车牌", "上下车地点", "时间", "报价", "司机或车辆信息（如安全可记录）"]
      : ["Taxi plate", "Pickup and destination", "Time", "Quoted fare", "Driver or vehicle details if safe"];
  }
  if (category.includes("casting") || category.includes("job") || category.includes("招聘") || category.includes("选角")) {
    return isChinese
      ? ["聊天截图", "电话号码", "账号名称", "接车地点", "车牌（如安全可记录）", "招聘/选角邀约详情"]
      : ["Chat screenshots", "Phone number", "Profile name", "Pickup location", "Vehicle plate if safe", "Job/casting offer details"];
  }
  if (category.includes("Rental") || category.includes("租赁")) {
    return isChinese
      ? ["租赁合同", "店名", "收据", "使用前车辆照片", "护照/押金条款"]
      : ["Rental contract", "Shop name", "Receipt", "Vehicle photos before use", "Passport/deposit terms"];
  }
  if (category.includes("payment") || category.includes("tour") || category.includes("付款") || category.includes("旅游")) {
    return isChinese
      ? ["传单或聊天截图", "QR/付款账户名称", "商家名称", "许可证号（如显示）", "收据或取消条款"]
      : ["Flyer or chat screenshot", "QR/payment account name", "Business name", "License number if shown", "Receipt or cancellation terms"];
  }
  return defaultEvidence;
}

function contactFor(level: RiskLevel, isChinese = false) {
  if (level === "Emergency") {
    return isChinese
      ? "立即停止并转移到安全的公共场所。根据情况联系旅游警察1155、酒店保安、紧急医疗或您的大使馆/领事馆。"
      : "Stop immediately and move to a safe public place. Contact Tourist Police 1155, hotel security, emergency medical help, or your embassy/consulate as relevant.";
  }
  if (level === "High") {
    return isChinese
      ? "核实前请勿继续。请先联系酒店工作人员、官方平台或相关公司寻求帮助；若遭受威胁、施压、阻拦或已被诈骗，请拨打旅游警察1155。"
      : "Do not proceed until verified. Ask hotel staff, the official platform, or the relevant company for help first; contact Tourist Police 1155 if pressured, threatened, blocked, or already defrauded.";
  }
  if (level === "Caution") {
    return isChinese
      ? "请先冷静地通过工作人员、酒店前台或可信平台进行核实。仅在遭受施压、威胁、拒绝放行或出现重大纠纷时才需要联系旅游警察1155。"
      : "Verify calmly first through staff, hotel front desk, or a trusted platform. Tourist Police 1155 is only needed if pressure, threats, refusal to let you leave, or a major dispute appears.";
  }
  return isChinese
    ? "无需上报。正常进行，确认相关信息，如有需要保留收据即可。"
    : "No escalation recommended. Proceed normally, confirm the details, and keep receipts only if useful.";
}

function buildReport(category: string, level: RiskLevel, city: string, signals: string[], isChinese = false) {
  const signalText = signals.length ? signals.join(", ") : (isChinese ? "未发现强烈信号" : "no strong signals detected");
  return {
    english: `TrustPass check in ${city}: ${level} risk for ${category}. Signals: ${signalText}. Tourist should verify before proceeding and save evidence.`,
    thai: `รายงาน TrustPass ในพื้นที่ ${city}: ระดับความเสี่ยง ${level} หมวด ${category} สัญญาณที่พบ: ${signalText} ควรตรวจสอบก่อนดำเนินการและเก็บหลักฐานไว้`
  };
}
