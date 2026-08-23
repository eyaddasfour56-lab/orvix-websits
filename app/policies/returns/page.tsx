import type { Metadata } from "next";
import StorePolicyPage from "@/components/StorePolicyPage";
export const metadata: Metadata = { title: "Returns & Refunds", description: "Read the ORVIX return, exchange and refund request process.", alternates: { canonical: "/policies/returns" } };
export default function ReturnsPolicyPage() { return <StorePolicyPage policy="returns" />; }
