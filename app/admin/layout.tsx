import type { Metadata } from "next";
import { ReactNode } from "react";
import AdminPwaRefresh from "@/components/AdminPwaRefresh";
import AdminShell from "@/components/AdminShell";
import AdminUiPolish from "@/components/AdminUiPolish";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminPwaRefresh />
      <AdminUiPolish />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
