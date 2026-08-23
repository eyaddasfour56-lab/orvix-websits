import type { Metadata } from "next";
import StorePolicyPage from "@/components/StorePolicyPage";
export const metadata: Metadata = { title: "Terms of Use", description: "The terms for using the ORVIX website and placing an order.", alternates: { canonical: "/policies/terms" } };
export default function TermsPolicyPage() { return <StorePolicyPage policy="terms" />; }
