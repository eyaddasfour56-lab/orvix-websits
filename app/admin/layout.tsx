import type { Metadata } from "next";
import { ReactNode } from "react";
import AdminLayoutFrame from "@/components/AdminLayoutFrame";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutFrame>{children}</AdminLayoutFrame>;
}
