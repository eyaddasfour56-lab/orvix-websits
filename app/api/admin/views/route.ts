import {
  NextRequest,
  NextResponse,
} from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  SupabaseAdminError,
  postgrestValue,
  supabaseAdminFetch,
  supabaseAdminJson,
} from "@/lib/supabase-admin";

type SiteView = {
  id: number;
  path: string;
  visitor_id: string;
  session_id: string | null;
  referrer: string | null;
  device_type: string | null;
  created_at: string;
};

const CAIRO_TIME_ZONE =
  "Africa/Cairo";

const DELETE_ALL_CLICKS_CONFIRMATION =
  "DELETE ALL CLICKS";

function getZonedParts(
  date: Date,
  timeZone: string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(
        (part) =>
          part.type !== "literal"
      )
      .map((part) => [
        part.type,
        Number(part.value),
      ])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string
) {
  const targetAsUtc = Date.UTC(
    year,
    month - 1,
    day
  );

  let result = targetAsUtc;

  for (
    let attempt = 0;
    attempt < 3;
    attempt += 1
  ) {
    const parts = getZonedParts(
      new Date(result),
      timeZone
    );

    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );

    result +=
      targetAsUtc -
      representedAsUtc;
  }

  return new Date(result);
}

function getCairoDayRange(
  now = new Date()
) {
  const today = getZonedParts(
    now,
    CAIRO_TIME_ZONE
  );

  const nextCalendarDay = new Date(
    Date.UTC(
      today.year,
      today.month - 1,
      today.day + 1
    )
  );

  return {
    start: zonedDateTimeToUtc(
      today.year,
      today.month,
      today.day,
      CAIRO_TIME_ZONE
    ),
    end: zonedDateTimeToUtc(
      nextCalendarDay.getUTCFullYear(),
      nextCalendarDay.getUTCMonth() + 1,
      nextCalendarDay.getUTCDate(),
      CAIRO_TIME_ZONE
    ),
  };
}

function readExactCount(
  response: Response
) {
  const contentRange =
    response.headers.get(
      "content-range"
    );

  if (!contentRange) {
    return 0;
  }

  const count = Number(
    contentRange.split("/").at(-1)
  );

  return Number.isFinite(count)
    ? count
    : 0;
}

async function getExactCount(
  filters = ""
) {
  const response =
    await supabaseAdminFetch(
      `site_views?select=id${filters}`,
      {
        method: "HEAD",
        headers: {
          Prefer: "count=exact",
          Range: "0-0",
        },
      }
    );

  return readExactCount(response);
}

async function getUniqueVisitorCount(
  filters: string,
  totalRows: number
) {
  const uniqueVisitorIds =
    new Set<string>();
  const pageSize = 1_000;

  for (
    let offset = 0;
    offset < totalRows;
    offset += pageSize
  ) {
    const rows =
      await supabaseAdminJson<
        Array<{
          visitor_id: string;
        }>
      >(
        "site_views?select=visitor_id" +
          filters +
          "&order=id.asc&limit=" +
          pageSize +
          "&offset=" +
          offset
      );

    if (!Array.isArray(rows)) {
      break;
    }

    rows.forEach((row) => {
      if (row.visitor_id) {
        uniqueVisitorIds.add(
          row.visitor_id
        );
      }
    });

    if (rows.length < pageSize) {
      break;
    }
  }

  return uniqueVisitorIds.size;
}

export async function GET(
  request: NextRequest
) {
  try {
    if (
      !isAdminAuthenticated(request)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { start, end } =
      getCairoDayRange();

    const todayFilters =
      `&created_at=gte.${postgrestValue(
        start.toISOString()
      )}` +
      `&created_at=lt.${postgrestValue(
        end.toISOString()
      )}`;

    const [
      totalViews,
      viewsToday,
      recentViews,
    ] = await Promise.all([
      getExactCount(),
      getExactCount(todayFilters),
      supabaseAdminJson<SiteView[]>(
        "site_views?select=id,path,visitor_id,session_id,referrer,device_type,created_at&order=created_at.desc&limit=100"
      ),
    ]);

    const uniqueVisitorsToday =
      await getUniqueVisitorCount(
        todayFilters,
        viewsToday
      );

    return NextResponse.json({
      success: true,
      totalViews,
      viewsToday,
      uniqueVisitorsToday,
      recentViews: Array.isArray(
        recentViews
      )
        ? recentViews
        : [],
      timeZone: CAIRO_TIME_ZONE,
    });
  } catch (error) {
    console.error(
      "Admin views API error:",
      error instanceof SupabaseAdminError
        ? error.details
        : error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not load website views.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    if (
      !isAdminAuthenticated(request)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as {
      confirmation?: unknown;
    } | null;

    if (
      body?.confirmation !==
      DELETE_ALL_CLICKS_CONFIRMATION
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Confirmation text is incorrect.",
        },
        { status: 400 }
      );
    }

    const deletedViews =
      await getExactCount();

    await supabaseAdminFetch(
      "site_views?id=not.is.null",
      {
        method: "DELETE",
        headers: {
          Prefer: "return=minimal",
        },
      }
    );

    return NextResponse.json({
      success: true,
      deletedViews,
      message:
        "All website clicks were deleted.",
    });
  } catch (error) {
    console.error(
      "Delete admin views API error:",
      error instanceof SupabaseAdminError
        ? error.details
        : error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not delete website clicks.",
      },
      { status: 500 }
    );
  }
}
