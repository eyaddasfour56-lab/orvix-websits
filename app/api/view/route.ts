import { NextResponse } from "next/server";

import {
  SupabaseAdminError,
  supabaseAdminFetch,
} from "@/lib/supabase-admin";

const IDENTIFIER_PATTERN =
  /^[A-Za-z0-9_-]{8,100}$/;

function cleanPath(value: unknown) {
  const path = String(value || "/")
    .trim()
    .slice(0, 300);

  if (!path.startsWith("/")) {
    return "/";
  }

  return path;
}

function cleanIdentifier(
  value: unknown
) {
  const identifier = String(
    value || ""
  ).trim();

  if (
    !IDENTIFIER_PATTERN.test(
      identifier
    )
  ) {
    return null;
  }

  return identifier;
}

function cleanReferrer(value: unknown) {
  const referrer = String(
    value || ""
  )
    .trim()
    .slice(0, 500);

  return referrer || null;
}

function getDeviceType(
  userAgent: string
) {
  if (
    /bot|crawler|spider|preview|facebookexternalhit|slurp/i.test(
      userAgent
    )
  ) {
    return "bot";
  }

  if (
    /ipad|tablet|playbook|silk/i.test(
      userAgent
    )
  ) {
    return "tablet";
  }

  if (
    /mobile|iphone|ipod|android/i.test(
      userAgent
    )
  ) {
    return "mobile";
  }

  return "desktop";
}

function isPrivatePath(path: string) {
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/api" ||
    path.startsWith("/api/") ||
    path.startsWith("/_next/")
  );
}

export async function POST(
  request: Request
) {
  try {
    if (
      request.headers.get(
        "sec-fetch-site"
      ) === "cross-site"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Cross-site request rejected.",
        },
        { status: 403 }
      );
    }

    const body = await request
      .json()
      .catch(() => ({}));

    const path = cleanPath(body.path);
    const visitorId =
      cleanIdentifier(body.visitorId);
    const sessionId =
      cleanIdentifier(body.sessionId);

    if (
      isPrivatePath(path) ||
      !visitorId ||
      !sessionId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid analytics event.",
        },
        { status: 400 }
      );
    }

    const userAgent =
      request.headers.get(
        "user-agent"
      ) || "unknown";

    const deviceType =
      getDeviceType(userAgent);

    if (deviceType === "bot") {
      return NextResponse.json({
        success: true,
        tracked: false,
      });
    }

    await supabaseAdminFetch(
      "site_views",
      {
        method: "POST",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          path,
          visitor_id: visitorId,
          session_id: sessionId,
          referrer: cleanReferrer(
            body.referrer
          ),
          device_type: deviceType,
        }),
      }
    );

    return NextResponse.json({
      success: true,
      tracked: true,
    });
  } catch (error) {
    console.error(
      "View API error:",
      error instanceof SupabaseAdminError
        ? error.details
        : error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Could not record view.",
      },
      { status: 500 }
    );
  }
}
