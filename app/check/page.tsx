import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { TrustPassChat } from "@/components/TrustPassChat";

export default function CheckPage() {
  return (
    <main className="min-h-screen">
      <SiteNav />
      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 max-w-7xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-azure hover:text-fluent-blueDark">
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
        </div>
        <Suspense fallback={<div className="mx-auto h-64 w-full max-w-7xl animate-pulse rounded-md bg-slate-100" aria-hidden />}>
          <TrustPassChat />
        </Suspense>
      </div>
      <SiteFooter />
    </main>
  );
}
