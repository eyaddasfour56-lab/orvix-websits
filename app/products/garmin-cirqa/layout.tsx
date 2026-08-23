import type { ReactNode } from "react";
import { ProductStructuredData, productMetadata } from "@/lib/product-seo";

export async function generateMetadata() {
  return productMetadata("garmin-cirqa");
}

export default function GarminCirqaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ProductStructuredData slug="garmin-cirqa" />
      {children}
    </>
  );
}
