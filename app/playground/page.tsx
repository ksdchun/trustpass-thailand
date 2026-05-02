import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AzureChatPlayground } from "@/components/AzureChatPlayground";
import { SiteNav } from "@/components/SiteNav";

export default function PlaygroundPage() {
  return (
    <main className="min-h-screen">
      <SiteNav />
      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 max-w-5xl">
          <Link href="/check" className="inline-flex items-center gap-2 text-sm font-semibold text-azure hover:text-fluent-blueDark">
            <ArrowLeft className="h-4 w-4" />
            Back to risk check
          </Link>
        </div>
      </div>
      <AzureChatPlayground />
    </main>
  );
}
