"use client";

/* ════════════════════════════════════════════════════════════════════
   AppShell — the unified chrome for every authenticated Kyvern page.

   Structure:
     ┌──────────────────────────────────────────────────┐
     │  AppTopbar (wallet, notifications, create)       │
     ├──────────┬───────────────────────────────────────┤
     │          │                                       │
     │ Sidebar  │  children (page content)              │
     │          │                                       │
     └──────────┴───────────────────────────────────────┘

   All motion + spacing + tokens anchored here. Child pages should focus
   on content, not layout. Responsive: sidebar collapses to a drawer on
   <md, topbar stays sticky.
   ════════════════════════════════════════════════════════════════════ */

import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { CommandPalette } from "@/components/dashboard/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Cmd+K global — mounted at the shell so every authenticated page
          (both /app/* pay-side and /pulse/dashboard/* earn-side) gets the
          same palette. The pulse layout previously mounted its own copy
          — we now drop it from there since AppShell is the source of
          truth. */}
      <CommandPalette />
      <AppTopbar />
      <div className="flex">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <main className="flex-1 min-w-0 px-5 md:px-8 py-8 max-w-[1240px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
