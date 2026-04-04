import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-[80px] font-bold tracking-[-0.05em] text-black/[0.06]">404</p>
        <h1 className="text-[18px] font-semibold tracking-tight -mt-4">Page not found</h1>
        <p className="text-[14px] text-tertiary mt-2 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center h-10 px-5 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/pulse/dashboard"
            className="inline-flex items-center h-10 px-5 rounded-lg border border-black/[0.08] text-[13px] font-medium text-secondary hover:text-primary transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
