import Link from "next/link";
import Image from "next/image";

const LINKS = {
  Product: [
    { label: "Pulse", href: "/pulse" },
    { label: "Dashboard", href: "/pulse/dashboard" },
    { label: "x402 Services", href: "/services" },
    { label: "Setup Guide", href: "/pulse/dashboard/setup" },
    { label: "Pricing", href: "/pulse#pricing" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Ecosystem: [
    { label: "x402 Protocol", href: "https://x402.org" },
    { label: "x402 Foundation", href: "https://x402.org" },
    { label: "Base", href: "https://base.org" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-black/[0.04] py-16 lg:py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Image src="/og-image.jpg" alt="KyvernLabs" width={24} height={24} className="rounded-md" />
              <span className="text-[13px] font-semibold tracking-tight">KyvernLabs</span>
            </div>
            <p className="text-[13px] text-quaternary leading-relaxed">
              The infrastructure company
              <br />
              for the x402 economy.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
                {category}
              </p>
              <div className="space-y-2.5">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-[13px] text-tertiary hover:text-primary transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-black/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-quaternary">
            &copy; {new Date().getFullYear()} KyvernLabs. All rights reserved.
          </p>
          <p className="text-[12px] text-quaternary">
            Built by{" "}
            <span className="text-tertiary font-medium">@shariqshkt</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
