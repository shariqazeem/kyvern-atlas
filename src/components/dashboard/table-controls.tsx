"use client";

import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search..." }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-quaternary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 rounded-lg border border-black/[0.08] text-[13px] placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-pulse/20 focus:border-pulse/30 transition-all"
      />
    </div>
  );
}

interface FilterDropdownProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}

export function FilterDropdown({ value, onChange, options, label }: FilterDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 rounded-lg border border-black/[0.08] text-[12px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-pulse/20"
      aria-label={label}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ offset, limit, total, onPrev, onNext }: PaginationProps) {
  if (total <= limit) return null;

  const start = offset + 1;
  const end = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div className="flex items-center justify-between pt-3">
      <span className="text-[12px] text-tertiary">
        Showing {start}–{end} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-black/[0.08] text-[11px] font-medium disabled:opacity-30 hover:bg-[#FAFAFA] transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-black/[0.08] text-[11px] font-medium disabled:opacity-30 hover:bg-[#FAFAFA] transition-colors"
        >
          Next
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
