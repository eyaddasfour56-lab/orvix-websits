import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin-auth";

const allowedStatuses = [
  "waiting",
  "notified",
  "cancelled",
];

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    if (!hasAdminPermission(request, "customers")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase settings are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const status = String(
      body.status || ""
    )
      .trim()
      .toLowerCase();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Waitlist entry ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid waitlist status.",
        },
        {
          status: 400,
        }
      );
    }

    const updateData = {
      status,

      notified_at:
        status === "notified"
          ? new Date().toISOString()
          : null,
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/product_waitlist?id=eq.${encodeURIComponent(
        id
      )}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Update waitlist entry error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not update waitlist entry.",
        },
        {
          status: 500,
        }
      );
    }

    const updatedEntries =
      await response.json();

    if (
      !Array.isArray(updatedEntries) ||
      updatedEntries.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Waitlist entry was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Waitlist entry updated successfully.",
      entry: updatedEntries[0],
    });
  } catch (error) {
    console.error(
      "Waitlist update API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not update waitlist entry.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    if (!hasAdminPermission(request, "customers")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase settings are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Waitlist entry ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/product_waitlist?id=eq.${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            "application/json",
          Prefer: "return=representation",
        },
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Delete waitlist entry error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not delete waitlist entry.",
        },
        {
          status: 500,
        }
      );
    }

    const deletedEntries =
      await response.json();

    if (
      !Array.isArray(deletedEntries) ||
      deletedEntries.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Waitlist entry was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Waitlist entry deleted successfully.",
      entry: deletedEntries[0],
    });
  } catch (error) {
    console.error(
      "Waitlist delete API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not delete waitlist entry.",
      },
      {
        status: 500,
      }
    );
  }
}
