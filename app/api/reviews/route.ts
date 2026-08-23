import { NextRequest, NextResponse } from "next/server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

type ReviewRow = {
  id: string;
  customer_name?: string | null;
  rating?: number | null;
  review_text?: string | null;
  photo_urls?: string[] | null;
  created_at?: string | null;
};

function publicName(value: unknown) {
  const parts = String(value || "ORVIX Customer").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "ORVIX Customer";
  return `${parts[0]} ${parts.at(-1)?.slice(0, 1).toUpperCase()}.`;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("productSlug")?.trim().toLowerCase() || "";
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) {
    return NextResponse.json({ success: false, message: "A valid product is required." }, { status: 400 });
  }

  try {
    const rows = await supabaseAdminJson<ReviewRow[]>(
      `reviews?product_slug=eq.${postgrestValue(slug)}&status=eq.approved&select=id,customer_name,rating,review_text,photo_urls,created_at&order=approved_at.desc,created_at.desc&limit=50`
    );
    const reviews = rows.map((review) => ({
      id: review.id,
      name: publicName(review.customer_name),
      rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
      comment: String(review.review_text || ""),
      photoUrls: Array.isArray(review.photo_urls) ? review.photo_urls.slice(0, 3) : [],
      createdAt: review.created_at || null,
      verifiedPurchase: true,
    }));
    const averageRating = reviews.length
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : 0;

    return NextResponse.json(
      { success: true, reviews, statistics: { reviewCount: reviews.length, averageRating: Number(averageRating.toFixed(1)) } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("Public reviews API error:", error);
    return NextResponse.json({ success: false, message: "Could not load reviews." }, { status: 500 });
  }
}
