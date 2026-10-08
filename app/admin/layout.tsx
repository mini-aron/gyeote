import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "관리 · 곁에",
  robots: { index: false, follow: false },
};

export default async function Layout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
