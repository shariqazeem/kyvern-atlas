"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  ArrowLeftRight,
  Globe,
  Users,
  Key,
  Code2,
  CreditCard,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/pulse/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pulse/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/pulse/dashboard/endpoints", label: "Endpoints", icon: Globe },
  { href: "/pulse/dashboard/customers", label: "Customers", icon: Users },
  { href: "/pulse/dashboard/keys", label: "API Keys", icon: Key },
  { href: "/pulse/dashboard/setup", label: "Setup Guide", icon: Code2 },
  { href: "/pulse/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 -ml-2 text-tertiary hover:text-primary transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[57px] left-0 right-0 bg-white border-b border-black/[0.06] shadow-premium-lg z-40 p-3"
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/pulse/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-[#F0F0F0] text-primary"
                      : "text-tertiary hover:text-primary hover:bg-[#FAFAFA]"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
