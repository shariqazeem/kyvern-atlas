import Link from "next/link";

/* ════════════════════════════════════════════════════════════════════
   Footer — minimalist. Brand, three columns, fine print.
   ════════════════════════════════════════════════════════════════════ */

/**
 * Footer link groups — simplified after the reframe.
 *
 * Before: two "product" columns ("Pay side · Vault" / "Earn side · Pulse")
 * that made Kyvern look like two separate companies. After: one "Product"
 * column that describes WHAT Kyvern does, a "Developers" column with the
 * technical surfaces, and a "Company" column. No more brand splitting.
 */
const LINKS = {
  Product: [
    { label: "Start free", href: "/app" },
    { label: "How it works", href: "/#stack" },
    { label: "Live demo", href: "/demo" },
  ],
  Developers: [
    { label: "Documentation", href: "/docs" },
    { label: "SDK on npm", href: "https://www.npmjs.com/package/@kyvernlabs/sdk" },
    { label: "Kyvern program", href: "https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet" },
    { label: "Built on Squads v4", href: "https://squads.so" },
  ],
  Company: [
    { label: "GitHub", href: "https://github.com/shariqazeem/kyvernlabs" },
    { label: "Contact", href: "mailto:hi@kyvernlabs.com" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer
      className="relative pt-20 pb-10 px-6"
      style={{ borderTop: "0.5px solid var(--border)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-5"
            >
              <div
                className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                style={{ background: "var(--text-primary)" }}
              >
                <span className="text-white text-[13px] font-bold tracking-tight">
                  K
                </span>
              </div>
              <span
                className="text-[15px] font-semibold tracking-tight"
                style={{
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Kyvern
              </span>
            </Link>
            <p
              className="text-[13px] leading-[1.6] max-w-[240px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Per-agent vaults on Solana. Budgets, allowlists, and a kill
              switch the chain itself enforces.
            </p>
          </div>

          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <p
                className="text-[11px] font-medium uppercase tracking-[0.08em] mb-4"
                style={{ color: "var(--text-quaternary)" }}
              >
                {category}
              </p>
              <div className="space-y-2.5">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-[13.5px] transition-colors duration-200"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-20 mb-8 h-px"
          style={{ background: "var(--border)" }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p
            className="text-[12px]"
            style={{ color: "var(--text-quaternary)" }}
          >
            &copy; {new Date().getFullYear()} Kyvern · Kyvern policy program + Squads v4 · Solana devnet · pre-alpha
          </p>
          {/* Bottom-bar kept intentionally minimal — just the builder's
              signature. Privacy + Terms live in the Company column above. */}
          <Link
            href="https://x.com/shariqshkt"
            target="_blank"
            className="text-[12px] transition-colors"
            style={{ color: "var(--text-quaternary)" }}
          >
            Built by @shariqshkt
          </Link>
        </div>
      </div>
    </footer>
  );
}
