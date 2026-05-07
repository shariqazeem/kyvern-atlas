"use client";

/**
 * InboxEmptyState — Phase 3.
 *
 * Shown in the desktop right pane when no finding is selected.
 * Friendly, instructive — points back to the master list.
 */

import { ArrowLeft, Inbox } from "lucide-react";

export function InboxEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 hidden lg:flex">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{
          background: "rgba(15,23,42,0.04)",
          border: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        <Inbox
          className="w-5 h-5"
          strokeWidth={1.6}
          style={{ color: "rgba(15,23,42,0.45)" }}
        />
      </div>
      <p
        className="text-[14px] font-medium mb-1"
        style={{ color: "#0A0A0A" }}
      >
        Select a finding to read it here.
      </p>
      <div
        className="inline-flex items-center gap-1 text-[11.5px]"
        style={{ color: "rgba(15,23,42,0.55)" }}
      >
        <ArrowLeft className="w-3 h-3" strokeWidth={2} />
        Pick one from the list
      </div>
    </div>
  );
}
