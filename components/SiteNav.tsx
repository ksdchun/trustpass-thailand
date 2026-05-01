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
