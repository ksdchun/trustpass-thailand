"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Hotel, ShieldCheck, Sparkles } from "lucide-react";

const AUTO_REDIRECT_MS = 2200;
const ALLOWED_CITIES = new Set(["Bangkok", "Phuket", "Pattaya", "Chiang Mai"]);
const ALLOWED_LANGS = new Set(["English", "Thai", "Chinese"]);

function prettifyHotelName(raw: string): string {
  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

function toSafeCity(value: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/(^|\s)(\w)/g, (_match, _whitespace, letter) => `${_whitespace}${letter.toUpperCase()}`);
  return ALLOWED_CITIES.has(normalized) ? normalized : null;
}

function toSafeLanguage(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  const canonical = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  return ALLOWED_LANGS.has(canonical) ? canonical : null;
}

function buildContinueHref(opts: {
  city: string | null;
  language: string | null;
  hotelSlug: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.city) params.set("city", opts.city);
  if (opts.language) params.set("lang", opts.language);
  if (opts.hotelSlug) params.set("referrer", `hotel:${opts.hotelSlug}`);
  const qs = params.toString();
  return qs ? `/check?${qs}` : "/check";
}

function WelcomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawHotel = searchParams.get("hotel");
  const hotelDisplay = rawHotel ? prettifyHotelName(rawHotel) : null;
  const hotelSlug = rawHotel ? rawHotel.trim() : null;
  const city = toSafeCity(searchParams.get("city"));
  const language = toSafeLanguage(searchParams.get("lang"));

  const continueHref = useMemo(
    () => buildContinueHref({ city, language, hotelSlug }),
    [city, language, hotelSlug],
  );

  const [countdownMs, setCountdownMs] = useState(AUTO_REDIRECT_MS);
  const [autoRedirectPaused, setAutoRedirectPaused] = useState(false);

  useEffect(() => {
    if (autoRedirectPaused) return;
    const interval = window.setInterval(() => {
      setCountdownMs((current) => Math.max(0, current - 100));
    }, 100);
    return () => window.clearInterval(interval);
  }, [autoRedirectPaused]);

  useEffect(() => {
    if (autoRedirectPaused) return;
    if (countdownMs > 0) return;
    router.replace(continueHref);
  }, [autoRedirectPaused, countdownMs, continueHref, router]);

  const progressPct = Math.max(0, Math.min(100, 100 - (countdownMs / AUTO_REDIRECT_MS) * 100));
  const seconds = Math.ceil(countdownMs / 1000);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0078D4] via-[#106EBE] to-[#0B5394] px-4 py-10 text-white"
      onClick={() => setAutoRedirectPaused(true)}
    >
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-3 text-white/90">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">TrustPass Thailand</p>
            <p className="text-base font-semibold">Tourism trust infrastructure</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/10 p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-lg">
          {hotelDisplay ? (
            <>
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                <Hotel className="h-4 w-4" />
                Hotel partner
              </div>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Welcome from {hotelDisplay}
              </h1>
              <p className="mt-4 text-base text-white/85 sm:text-lg">
                TrustPass is here for your stay. If something feels off — a taxi quote, a tour seller, a rental form, a chat
                offer — open TrustPass first. We turn messy evidence into a clear risk read and a short list of safer next
                steps in seconds.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                <Sparkles className="h-4 w-4" />
                Welcome
              </div>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Welcome to TrustPass</h1>
              <p className="mt-4 text-base text-white/85 sm:text-lg">
                A preventive layer between tourists, local operators, and authorities — built on Azure AI and Thailand-specific
                grounding so suspicious situations get caught before payments, travel, or document hand-offs.
              </p>
            </>
          )}

          {(city || language) && (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-medium text-white/85">
              <span className="uppercase tracking-wider text-white/70">Pre-filled</span>
              {city && <span className="rounded-full bg-white/15 px-2.5 py-1">City · {city}</span>}
              {language && <span className="rounded-full bg-white/15 px-2.5 py-1">Language · {language}</span>}
            </div>
          )}

          <Link
            href={continueHref}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0078D4] shadow-lg transition hover:translate-y-[-1px] hover:shadow-xl"
            onClick={() => setAutoRedirectPaused(true)}
          >
            Continue to TrustPass
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-6">
            {autoRedirectPaused ? (
              <p className="text-xs text-white/70">Auto-redirect paused. Tap Continue when you&apos;re ready.</p>
            ) : (
              <>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/70">
                  Auto-forwarding in {seconds}s. Tap anywhere to pause.
                </p>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/70">
          Risk assessments are guidance, not legal advice. In emergencies, dial Tourist Police 1155.
        </p>
      </div>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0078D4]" aria-hidden />}>
      <WelcomeContent />
    </Suspense>
  );
}
