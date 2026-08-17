import { readFile, writeFile } from "node:fs/promises";

async function updateFile(path, transform) {
  const source = await readFile(path, "utf8");
  const next = transform(source);

  if (next === source) {
    console.log(`${path} is already synced.`);
    return;
  }

  await writeFile(path, next, "utf8");
  console.log(`Updated ${path}.`);
}

await updateFile("app/checkout/page.tsx", (source) => {
  let next = source;

  next = next.replace(
    "const PRODUCT_PRICE = 8500;",
    "const FALLBACK_PRODUCT_PRICE = 8500;"
  );

  if (!next.includes("const [productPrice, setProductPrice]")) {
    const quantityAnchor =
      "  const [quantity, setQuantity] = useState(1);";

    if (!next.includes(quantityAnchor)) {
      throw new Error("Could not find checkout quantity state anchor.");
    }

    next = next.replace(
      quantityAnchor,
      `${quantityAnchor}\n\n  const [productPrice, setProductPrice] =\n    useState(FALLBACK_PRODUCT_PRICE);`
    );
  }

  next = next.replace(
    "  const productsTotal =\n    PRODUCT_PRICE * quantity;",
    "  const productsTotal =\n    productPrice * quantity;"
  );

  next = next.replace(
    "            productPrice: PRODUCT_PRICE,",
    "            productPrice,"
  );

  if (!next.includes("async function loadProductSettings()")) {
    const effectAnchor =
      "  useEffect(() => {\n    const timeoutId = window.setTimeout(";

    if (!next.includes(effectAnchor)) {
      throw new Error("Could not find checkout product settings effect anchor.");
    }

    const productEffect = `  useEffect(() => {\n    let cancelled = false;\n\n    async function loadProductSettings() {\n      try {\n        const response = await fetch(\n          \`/api/products?slug=\${encodeURIComponent(\n            PRODUCT_SLUG\n          )}\`,\n          { cache: \"no-store\" }\n        );\n\n        const result = await response.json();\n        const livePrice = Number(\n          result?.product?.price\n        );\n\n        if (\n          !cancelled &&\n          response.ok &&\n          result?.success &&\n          Number.isFinite(livePrice) &&\n          livePrice > 0\n        ) {\n          setProductPrice(livePrice);\n        }\n      } catch (error) {\n        console.error(\n          \"Could not load live checkout price:\",\n          error\n        );\n      }\n    }\n\n    void loadProductSettings();\n\n    return () => {\n      cancelled = true;\n    };\n  }, []);\n\n`;

    next = next.replace(
      effectAnchor,
      `${productEffect}${effectAnchor}`
    );
  }

  return next;
});

await updateFile("app/api/order/route.ts", (source) => {
  let next = source.replace(
    "const PRODUCT_PRICE = 8500;\n",
    ""
  );

  const oldProductBlock = `    /*\n      الأسعار الأساسية من السيرفر،\n      وليس من الـCheckout.\n    */\n    const productName =\n      PRODUCT_NAME;\n\n    const productSlug =\n      PRODUCT_SLUG;\n\n    const productPrice =\n      PRODUCT_PRICE;`;

  if (!next.includes("const liveProductResponse = await fetch(")) {
    if (!next.includes(oldProductBlock)) {
      throw new Error("Could not find server product pricing block.");
    }

    const liveProductBlock = [
      "    /*",
      "      السعر والتوفر يأتوا من Products في Supabase.",
      "      أي تعديل من Admin > Products & Stock ينعكس هنا فورًا.",
      "    */",
      "    const liveProductResponse = await fetch(",
      "      `${supabaseUrl}/rest/v1/products?slug=eq.${encodeURIComponent(",
      "        PRODUCT_SLUG",
      "      )}&select=name,slug,price,status,stock_quantity,allow_purchase&limit=1`,",
      "      {",
      "        headers: {",
      "          apikey: supabaseSecretKey,",
      "          Authorization:",
      "            `Bearer ${supabaseSecretKey}`,",
      "          \"Content-Type\":",
      "            \"application/json\",",
      "        },",
      "        cache: \"no-store\",",
      "      }",
      "    );",
      "",
      "    if (!liveProductResponse.ok) {",
      "      console.error(",
      "        \"Product pricing lookup failed:\",",
      "        await liveProductResponse.text()",
      "      );",
      "",
      "      return NextResponse.json(",
      "        {",
      "          success: false,",
      "          message:",
      "            \"Could not verify the product price right now.\",",
      "        },",
      "        { status: 500 }",
      "      );",
      "    }",
      "",
      "    const liveProductRows =",
      "      await liveProductResponse.json();",
      "",
      "    const liveProduct =",
      "      Array.isArray(liveProductRows)",
      "        ? liveProductRows[0]",
      "        : null;",
      "",
      "    if (!liveProduct) {",
      "      return NextResponse.json(",
      "        {",
      "          success: false,",
      "          message:",
      "            \"This product is not available right now.\",",
      "        },",
      "        { status: 404 }",
      "      );",
      "    }",
      "",
      "    const productName = String(",
      "      liveProduct.name || PRODUCT_NAME",
      "    );",
      "",
      "    const productSlug = String(",
      "      liveProduct.slug || PRODUCT_SLUG",
      "    );",
      "",
      "    const productPrice = Number(",
      "      liveProduct.price || 0",
      "    );",
      "",
      "    const availableStock = Math.max(",
      "      0,",
      "      Number(",
      "        liveProduct.stock_quantity || 0",
      "      )",
      "    );",
      "",
      "    const availableForSale =",
      "      liveProduct.status === \"available\" &&",
      "      Boolean(liveProduct.allow_purchase) &&",
      "      availableStock > 0 &&",
      "      productPrice > 0;",
      "",
      "    if (!availableForSale) {",
      "      return NextResponse.json(",
      "        {",
      "          success: false,",
      "          message:",
      "            \"This product is currently unavailable for sale.\",",
      "        },",
      "        { status: 409 }",
      "      );",
      "    }",
      "",
      "    if (quantity > availableStock) {",
      "      return NextResponse.json(",
      "        {",
      "          success: false,",
      "          message:",
      "            `Only ${availableStock} item(s) are currently available.`,",
      "        },",
      "        { status: 409 }",
      "      );",
      "    }",
    ].join("\n");

    next = next.replace(
      oldProductBlock,
      liveProductBlock
    );
  }

  return next;
});

await updateFile("components/AdminShell.tsx", (source) => {
  let next = source;

  const oldCoreItems = `      { label: "Inventory", href: "/admin/inventory", keywords: "stock inventory quantity low stock" },\n      { label: "Products", href: "/admin/products", keywords: "products price catalog fitbit garmin" },`;

  const newCoreItem = `      { label: "Products & Stock", href: "/admin/products", keywords: "products price catalog fitbit garmin stock inventory quantity availability sale" },`;

  if (next.includes(oldCoreItems)) {
    next = next.replace(
      oldCoreItems,
      newCoreItem
    );
  }

  return next;
});

await updateFile("app/admin/products/page.tsx", (source) => {
  return source
    .replaceAll("Allow Purchase", "Available for Sale")
    .replace(
      "              Manage Products\n",
      "              Manage Products & Stock\n"
    );
});
