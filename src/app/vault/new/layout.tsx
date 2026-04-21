import type { Metadata } from "next";
import { ConnectGate } from "@/components/dashboard/connect-gate";

export const metadata: Metadata = {
  title: "Create a vault · Kyvern",
  robots: { index: false, follow: false },
};

/**
 * /vault/new — the cinematic wizard.
 *
 * The wizard makes on-chain calls on behalf of a signed-in user. Before
 * we show the "5 steps to your agent's Visa" experience, we require a
 * real Privy session (email / Google / wallet), exactly like the rest of
 * /app. Without the gate, users got handed the wizard immediately and
 * the deploy step failed with a confusing on-chain error because the
 * Privy wallet hadn't been created yet.
 *
 * Intentionally NOT wrapped in AppShell — the wizard owns its own full-
 * screen FlowShell chrome. ConnectGate renders a clean standalone
 * "welcome back" view when the user isn't authenticated yet; once they
 * sign in, the wizard FlowShell takes over the viewport.
 */
export default function NewVaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConnectGate>{children}</ConnectGate>;
}
