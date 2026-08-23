import type { Metadata } from "next";
import StorePolicyPage from "@/components/StorePolicyPage";
export const metadata: Metadata = { title: "Privacy Policy", description: "How ORVIX processes order, account, tracking, support and analytics information.", alternates: { canonical: "/policies/privacy" } };
export default function PrivacyPolicyPage() { return <StorePolicyPage policy="privacy" />; }
