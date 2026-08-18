import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  target_url: string;
  severity: string;
  created_at: string;
  read_at?: string | null;
};

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const rows = await supabaseAdminJson<NotificationRow[]>(
      "admin_notifications?select=id,kind,title,body,target_url,severity,created_at,read_at&order=created_at.desc&limit=30"
    );
    const unread = rows.filter((row) => !row.read_at).length;
    return NextResponse.json(
      {
        success: true,
        unread,
        notifications: rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          title: row.title,
          body: row.body,
          targetUrl: row.target_url || "/admin",
          severity: row.severity || "info",
          createdAt: row.created_at,
          readAt: row.read_at || null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Admin notifications GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string; all?: boolean };
    const now = new Date().toISOString();
    if (body.all) {
      await supabaseAdminJson("admin_notifications?read_at=is.null", {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ read_at: now }),
      });
    } else {
      const id = String(body.id || "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return NextResponse.json({ success: false, message: "A valid notification ID is required." }, { status: 400 });
      }
      await supabaseAdminJson(`admin_notifications?id=eq.${postgrestValue(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ read_at: now }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin notifications PATCH error:", error);
    return NextResponse.json({ success: false, message: "Could not update notifications." }, { status: 500 });
  }
}
