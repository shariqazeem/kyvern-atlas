"use client";

/**
 * FiltersBar — Phase 3.
 *
 *   [All N] [Unread N]  [All workers ▼]
 */

import { ChevronDown } from "lucide-react";

export type InboxFilter = "all" | "unread" | "critical" | "onchain";

interface WorkerBrief {
  id: string;
  name: string;
  emoji: string;
}

interface Props {
  filter: InboxFilter;
  onFilter: (f: InboxFilter) => void;
  workerFilter: string;
  onWorkerFilter: (id: string) => void;
  workers: WorkerBrief[];
  unreadCount: number;
  totalCount: number;
}

export function FiltersBar({
  filter,
  onFilter,
  workerFilter,
  onWorkerFilter,
  workers,
  unreadCount,
  totalCount,
}: Props) {
  return (
    <div className="flex items-center flex-wrap gap-2">
      <Pill
        active={filter === "all"}
        onClick={() => onFilter("all")}
        label={`All ${totalCount}`}
      />
      <Pill
        active={filter === "unread"}
        onClick={() => onFilter("unread")}
        label={`Unread ${unreadCount}`}
      />
      <WorkerSelect
        value={workerFilter}
        onChange={onWorkerFilter}
        workers={workers}
      />
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1 transition active:scale-[0.97]"
      style={{
        background: active ? "#0A0A0A" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#0A0A0A",
        border: active
          ? "1px solid rgba(0,0,0,0.85)"
          : "1px solid rgba(15,23,42,0.10)",
        fontSize: 11.5,
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

function WorkerSelect({
  value,
  onChange,
  workers,
}: {
  value: string;
  onChange: (id: string) => void;
  workers: WorkerBrief[];
}) {
  const selected = workers.find((w) => w.id === value);
  const label = selected
    ? `${selected.emoji} ${selected.name}`
    : `All workers`;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full pl-3 pr-7 py-1 transition active:scale-[0.97] cursor-pointer"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.10)",
          fontSize: 11.5,
          color: "#0A0A0A",
        }}
        aria-label="Filter by worker"
      >
        <option value="all">All workers</option>
        {workers.map((w) => (
          <option key={w.id} value={w.id}>
            {w.emoji} {w.name}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
        strokeWidth={2}
        style={{ color: "rgba(15,23,42,0.55)" }}
      />
      {/* visual label for screen-reader-equivalent display purposes */}
      <span className="sr-only">{label}</span>
    </div>
  );
}
