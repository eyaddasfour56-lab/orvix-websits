import type { Metadata } from "next";
import StorePolicyPage from "@/components/StorePolicyPage";
export const metadata: Metadata = { title: "Warranty & Product Support", description: "ORVIX product support, conformity and warranty information.", alternates: { canonical: "/policies/warranty" } };
export default function WarrantyPolicyPage() { return <StorePolicyPage policy="warranty" />; }
