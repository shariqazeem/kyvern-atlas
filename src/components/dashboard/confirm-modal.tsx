"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel",
  variant = "default", onConfirm, onCancel,
}: ConfirmModalProps) {
  const isDanger = variant === "danger";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-sm"
          >
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xl p-6 mx-4">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDanger ? "bg-red-50" : "bg-amber-50"}`}>
                  <AlertTriangle className={`w-5 h-5 ${isDanger ? "text-red-500" : "text-amber-500"}`} />
                </div>
                <button onClick={onCancel} className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <h3 className="text-[15px] font-semibold mb-1">{title}</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed mb-6">{description}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 h-9 rounded-lg border border-black/[0.08] text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={() => { onConfirm(); onCancel(); }}
                  className={`flex-1 h-9 rounded-lg text-[13px] font-medium text-white transition-colors ${
                    isDanger ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
