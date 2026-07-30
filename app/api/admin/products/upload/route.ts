import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";

const BUCKET_NAME = "product-images";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function cleanFileName(fileName: string) {
  const extension =
    fileName
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";

  const originalName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const safeName =
    originalName || "product-image";

  return {
    safeName,
    extension,
  };
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .map((part) =>
      encodeURIComponent(part)
    )
    .join("/");
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
      Check the existing admin session by calling
      the protected products API and forwarding
      the current admin cookie.
    */
    const authenticationResponse =
      await fetch(
        new URL(
          "/api/admin/products",
          request.url
        ),
        {
          method: "GET",
          headers: {
            cookie:
              request.headers.get(
                "cookie"
              ) || "",
          },
          cache: "no-store",
        }
      );

    if (
      authenticationResponse.status === 401
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your admin session expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    if (!authenticationResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Could not verify the admin session.",
        },
        {
          status: 500,
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
            "Supabase environment variables are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (
      !uploadedFile ||
      !(uploadedFile instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please choose an image to upload.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !uploadedFile.type.startsWith(
        "image/"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only image files are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploadedFile.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected image is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      uploadedFile.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The image must be 20 MB or smaller.",
        },
        {
          status: 400,
        }
      );
    }

    const { safeName, extension } =
      cleanFileName(
        uploadedFile.name
      );

    const uniquePart = `${Date.now()}-${crypto.randomUUID()}`;

    const storagePath =
      `products/${safeName}-${uniquePart}.${extension}`;

    const encodedStoragePath =
      encodeStoragePath(storagePath);

    const imageBuffer =
      await uploadedFile.arrayBuffer();

    const uploadResponse =
      await fetch(
        `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${encodedStoragePath}`,
        {
          method: "POST",
          headers: {
            apikey:
              supabaseSecretKey,

            Authorization:
              `Bearer ${supabaseSecretKey}`,

            "Content-Type":
              uploadedFile.type,

            "x-upsert": "false",
          },
          body: imageBuffer,
        }
      );

    if (!uploadResponse.ok) {
      const uploadError =
        await uploadResponse.text();

      console.error(
        "Supabase image upload error:",
        uploadError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not upload the image to storage.",
        },
        {
          status: 500,
        }
      );
    }

    const publicUrl =
      `${supabaseUrl}/storage/v1/object/public/` +
      `${BUCKET_NAME}/${encodedStoragePath}`;

    return NextResponse.json({
      success: true,
      message:
        "Image uploaded successfully.",
      imageUrl: publicUrl,
      storagePath,
    });
  } catch (error) {
    console.error(
      "Product image upload API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "An unexpected error occurred while uploading the image.",
      },
      {
        status: 500,
      }
    );
  }
}