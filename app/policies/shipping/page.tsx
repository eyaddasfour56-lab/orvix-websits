import type { Metadata } from "next";
import StorePolicyPage from "@/components/StorePolicyPage";
export const metadata: Metadata = { title: "Shipping Policy", description: "ORVIX delivery coverage, fees, pre-order journey and courier hand-off information.", alternates: { canonical: "/policies/shipping" } };
export default function ShippingPolicyPage() { return <StorePolicyPage policy="shipping" />; }
