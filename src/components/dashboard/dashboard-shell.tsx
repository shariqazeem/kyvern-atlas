"use client";

import { DashboardErrorBoundary } from "@/components/dashboard/error-boundary";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <DashboardErrorBoundary>{children}</DashboardErrorBoundary>;
}
