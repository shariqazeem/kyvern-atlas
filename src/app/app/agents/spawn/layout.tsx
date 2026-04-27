import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hire a worker",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
