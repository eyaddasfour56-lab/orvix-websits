import Link from "next/link";
import { ReactNode } from "react";

export default async function DynamicProductLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      {children}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 p-3 backdrop-blur-xl sm:hidden">
        <Link
          href={`/checkout/${encodeURIComponent(slug)}`}
          className="flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-base font-black text-black"
        >
          Buy Now · Secure Checkout
        </Link>
      </div>
      <Link
        href={`/checkout/${encodeURIComponent(slug)}`}
        className="fixed bottom-6 right-6 z-40 hidden rounded-full bg-white px-6 py-4 text-sm font-black text-black shadow-2xl transition hover:bg-gray-200 sm:inline-flex"
      >
        Buy Now · Secure Checkout
      </Link>
    </>
  );
}
