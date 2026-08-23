import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Edit Order", robots: { index: false, follow: false } };
export default function EditOrderLayout({ children }: { children: ReactNode }) { return children; }
