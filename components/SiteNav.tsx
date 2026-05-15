import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { navItems } from "@/lib/demo-content";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-fluent-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-azure text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-ink">TrustPass Thailand</span>
            <span className="block text-xs text-fluent-muted">AI Scam & Fraud Shield</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-[8px] px-3 py-2 text-sm font-semibold text-fluent-muted transition hover:bg-fluent-panel hover:text-azure">
                {item.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-fluent-border bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-md">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-azure text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-ink">TrustPass Thailand</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-fluent-muted">
            Tourism trust infrastructure. Preventive layer between tourists, local operators, and authorities. Powered by Azure AI.
          </p>
        </div>
        <nav className="grid gap-2 text-xs text-fluent-muted">
          <Link href="/" className="font-semibold text-ink hover:text-azure">Overview</Link>
          <Link href="/check" className="hover:text-azure">Risk Check</Link>
          <Link href="/scenarios" className="hover:text-azure">Scenarios</Link>
          <Link href="/dashboard" className="hover:text-azure">B2G Dashboard</Link>
          <Link href="/responsible-ai" className="hover:text-azure">Responsible AI &amp; Limitations</Link>
        </nav>
        <div className="text-xs text-fluent-muted">
          <p className="font-semibold text-ink">Emergency contacts</p>
          <p className="mt-2">Tourist Police &middot; 1155</p>
          <p>Medical emergency &middot; 1669</p>
          <p className="mt-3 text-[10px] leading-relaxed">
            TrustPass risk assessments are guidance, not legal advice. Always verify before acting.
          </p>
        </div>
      </div>
    </footer>
  );
}
