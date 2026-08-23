"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminPwaRefresh from "@/components/AdminPwaRefresh";
import AdminShell from "@/components/AdminShell";
import AdminUiPolish from "@/components/AdminUiPolish";

const BUYER_PREVIEW_PATH = "/admin/buyer-preview";

export default function AdminLayoutFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === BUYER_PREVIEW_PATH) {
    return children;
  }

  return (
    <>
      <AdminPwaRefresh />
      <AdminUiPolish />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
