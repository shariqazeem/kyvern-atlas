"use client";

/**
 * ConfigFields — dynamic form renderer for ability configuration.
 * Renders sliders, toggles, text inputs, and select controls
 * from an ability's configSchema.
 */

import type { AbilityConfigField } from "@/lib/abilities/types";

interface ConfigFieldsProps {
  schema: AbilityConfigField[];
  values: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
}

export function ConfigFields({ schema, values, onChange }: ConfigFieldsProps) {
  return (
    <div className="space-y-5">
      {schema.map((field) => (
        <div key={field.key}>
          <label className="block text-[13px] font-medium text-[#111] mb-1.5">
            {field.label}
          </label>
          {field.hint && (
            <p className="text-[11px] text-[#9CA3AF] mb-2">{field.hint}</p>
          )}

          {field.type === "text" && (
            <input
              type="text"
              value={String(values[field.key] ?? field.default)}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.hint}
              className="w-full h-10 px-3 rounded-[10px] text-[13px] text-[#111] outline-none transition-colors focus:ring-2 focus:ring-[#111]/10"
              style={{
                background: "#F9FAFB",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            />
          )}

          {field.type === "slider" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#9CA3AF]">
                  ${(field.min ?? 0).toFixed(3)}
                </span>
                <span className="text-[13px] font-mono font-semibold text-[#111]">
                  ${Number(values[field.key] ?? field.default).toFixed(3)}
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  ${(field.max ?? 1).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={field.min ?? 0}
                max={field.max ?? 1}
                step={field.step ?? 0.001}
                value={Number(values[field.key] ?? field.default)}
                onChange={(e) => onChange(field.key, parseFloat(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #111 ${((Number(values[field.key] ?? field.default) - (field.min ?? 0)) / ((field.max ?? 1) - (field.min ?? 0))) * 100}%, #E5E7EB ${((Number(values[field.key] ?? field.default) - (field.min ?? 0)) / ((field.max ?? 1) - (field.min ?? 0))) * 100}%)`,
                }}
              />
            </div>
          )}

          {field.type === "toggle" && (
            <button
              onClick={() =>
                onChange(field.key, !(values[field.key] ?? field.default))
              }
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{
                background: (values[field.key] ?? field.default)
                  ? "#22C55E"
                  : "#D1D5DB",
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{
                  left: (values[field.key] ?? field.default)
                    ? "calc(100% - 22px)"
                    : "2px",
                }}
              />
            </button>
          )}

          {field.type === "select" && field.options && (
            <div className="flex gap-2">
              {field.options.map((opt) => {
                const selected =
                  String(values[field.key] ?? field.default) === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onChange(field.key, opt.value)}
                    className="h-8 px-3 rounded-full text-[12px] font-medium transition-colors"
                    style={{
                      background: selected ? "#111" : "#F3F4F6",
                      color: selected ? "#fff" : "#6B7280",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
