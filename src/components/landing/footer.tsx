import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-[10px] font-bold">K</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">KyvernLabs</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/pulse/dashboard" className="hover:text-foreground transition-colors">
            Pulse
          </Link>
          <Link href="/pulse/dashboard/setup" className="hover:text-foreground transition-colors">
            Docs
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Built by{" "}
          <span className="font-medium text-foreground">@shariqshkt</span>
        </p>
      </div>
    </footer>
  );
}
