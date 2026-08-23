import type { ReactNode } from "react";
import { ProductStructuredData, productMetadata } from "@/lib/product-seo";

export async function generateMetadata() {
  return productMetadata("google-fitbit-air");
}

export default function GoogleFitbitAirLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ProductStructuredData slug="google-fitbit-air" />
      {children}
    </>
  );
}
