import {
  NextRequest,
  NextResponse,
} from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  BostaApiError,
  getBostaAwbResponse,
} from "@/lib/bosta";
import {
  postgrestValue,
  supabaseAdminJson,
} from "@/lib/supabase-admin";

type AwbOrder = {
  bosta_tracking_number?: string | null;
};

function decodeBase64Pdf(
  value: string
) {
  const cleanValue = value
    .replace(
      /^data:application\/pdf;base64,/i,
      ""
    )
    .replace(/\s/g, "")
    .replace(/^"|"$/g, "");

  if (!cleanValue) {
    return null;
  }

  try {
    const pdf = Buffer.from(
      cleanValue,
      "base64"
    );

    return pdf.subarray(0, 4).toString() ===
      "%PDF"
      ? pdf
      : null;
  } catch {
    return null;
  }
}

function extractPdf(buffer: Buffer) {
  if (
    buffer.subarray(0, 4).toString() ===
    "%PDF"
  ) {
    return buffer;
  }

  const text = buffer
    .toString("utf8")
    .trim();

  const directPdf =
    decodeBase64Pdf(text);

  if (directPdf) {
    return directPdf;
  }

  try {
    const parsed = JSON.parse(text) as
      | string
      | Record<string, unknown>;

    if (typeof parsed === "string") {
      return decodeBase64Pdf(parsed);
    }

    const candidates = [
      parsed.data,
      parsed.pdf,
      parsed.awb,
      parsed.base64,
      parsed.file,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        const pdf =
          decodeBase64Pdf(candidate);

        if (pdf) {
          return pdf;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function GET(
  request: NextRequest
) {
  if (!isAdminAuthenticated(request)) {
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

  try {
    const batchId =
      request.nextUrl.searchParams
        .get("batchId")
        ?.trim() || "";

    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(
        batchId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid batch ID.",
        },
        {
          status: 400,
        }
      );
    }

    const requestedSize =
      request.nextUrl.searchParams
        .get("size")
        ?.toUpperCase() === "A6"
        ? "A6"
        : "A4";

    const language =
      request.nextUrl.searchParams
        .get("lang")
        ?.toLowerCase() === "ar"
        ? "ar"
        : "en";

    const orders = await supabaseAdminJson<
      AwbOrder[]
    >(
      `orders?select=bosta_tracking_number&bosta_batch_id=eq.${postgrestValue(
        batchId
      )}&order=created_at.asc`
    );

    const trackingNumbers = orders
      .map(
        (order) =>
          order.bosta_tracking_number
      )
      .filter(
        (trackingNumber): trackingNumber is string =>
          Boolean(trackingNumber)
      );

    if (
      orders.length === 0 ||
      trackingNumbers.length !==
        orders.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Every order in this Bosta pickup needs a tracking number before printing AWBs.",
        },
        {
          status: 400,
        }
      );
    }

    const bostaResponse =
      await getBostaAwbResponse(
        trackingNumbers,
        requestedSize,
        language
      );

    const responseBuffer = Buffer.from(
      await bostaResponse.arrayBuffer()
    );

    const pdf =
      extractPdf(responseBuffer);

    if (!pdf) {
      throw new BostaApiError(
        "Bosta did not return a printable PDF.",
        502,
        null,
        responseBuffer
          .toString("utf8")
          .slice(0, 300)
      );
    }

    const arrayBuffer =
      pdf.buffer.slice(
        pdf.byteOffset,
        pdf.byteOffset + pdf.byteLength
      ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/pdf",
        "Content-Disposition":
          `inline; filename="orvix-bosta-${batchId}-${requestedSize}.pdf"`,
        "Cache-Control":
          "private, no-store",
      },
    });
  } catch (error) {
    console.error(
      "Bosta AWB API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not print Bosta AWBs.",
      },
      {
        status: 502,
      }
    );
  }
}
