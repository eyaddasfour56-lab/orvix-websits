import Link from "next/link";

type TrustItem = {
  icon: string;
  title: string;
  text: string;
  href?: string;
};

const items: TrustItem[] = [
  {
    icon: "✓",
    title: "Secure checkout",
    text: "Pricing and stock are verified before your order is accepted.",
  },
  {
    icon: "↗",
    title: "Order tracking",
    text: "Follow confirmation, shipping and delivery from one order page.",
    href: "/track-order",
  },
  {
    icon: "◎",
    title: "Delivery across Egypt",
    text: "Delivery fees are calculated from your selected Bosta city.",
  },
  {
    icon: "?",
    title: "ORVIX support",
    text: "Need help with an order? Reach support without losing your order details.",
    href: "/chat",
  },
];

export default function TrustStrip({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="Why shop with ORVIX"
      className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}
    >
      {items.map((item) => {
        const content = (
          <div className="flex h-full gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/20 hover:bg-white/[0.055]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-black">
              {item.icon}
            </span>
            <div>
              <p className="text-sm font-black text-white">{item.title}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-white/38">{item.text}</p>
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.title} href={item.href} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            {content}
          </Link>
        ) : (
          <div key={item.title}>{content}</div>
        );
      })}
    </section>
  );
}
