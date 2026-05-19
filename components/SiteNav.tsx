"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/lib/language-context";
import { translations } from "@/lib/translations";

export function SiteNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { lang, setLang } = useLanguage();
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-30 border-b border-fluent-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-azure text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-ink sm:text-base">TrustPass Thailand</span>
              <span className="block truncate text-[11px] text-fluent-muted sm:text-xs">{t.navSubtitle}</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {t.navItems.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-[8px] px-3 py-2 text-sm font-semibold text-fluent-muted transition hover:bg-fluent-panel hover:text-azure">
                  {item.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-fluent-border bg-white px-2.5 text-xs font-semibold text-fluent-muted transition hover:border-azure hover:text-azure"
              aria-label="Switch language"
            >
              <span className={lang === "en" ? "text-azure" : "text-fluent-muted"}>EN</span>
              <span className="text-fluent-muted/50">|</span>
              <span className={lang === "zh" ? "text-azure" : "text-fluent-muted"}>中文</span>
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-fluent-border bg-white text-fluent-muted transition hover:border-azure hover:text-azure md:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-controls="site-nav-mobile-menu"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen ? (
          <nav id="site-nav-mobile-menu" className="mt-4 grid gap-1 border-t border-fluent-border pt-3 md:hidden" aria-label="Mobile primary">
            {t.navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-[8px] px-3 py-3 text-sm font-semibold text-fluent-muted transition hover:bg-fluent-panel hover:text-azure"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
