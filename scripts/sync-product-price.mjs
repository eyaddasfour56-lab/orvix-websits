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

    const liveProductBlock = `    /*\n      السعر والتوفر يأتوا من Products في Supabase.\n      أي تعديل من Admin > Products & Stock ينعكس هنا فورًا.\n    */\n    const liveProductResponse = await fetch(\n      \`${supabaseUrl}/rest/v1/products?slug=eq.\${encodeURIComponent(\n        PRODUCT_SLUG\n      )}&select=name,slug,price,status,stock_quantity,allow_purchase&limit=1\`,\n      {\n        headers: {\n          apikey: supabaseSecretKey,\n          Authorization:\n            \`Bearer \${supabaseSecretKey}\`,\n          \"Content-Type\":\n            \"application/json\",\n        },\n        cache: \"no-store\",\n      }\n    );\n\n    if (!liveProductResponse.ok) {\n      console.error(\n        \"Product pricing lookup failed:\",\n        await liveProductResponse.text()\n      );\n\n      return NextResponse.json(\n        {\n          success: false,\n          message:\n            \"Could not verify the product price right now.\",\n        },\n        { status: 500 }\n      );\n    }\n\n    const liveProductRows =\n      await liveProductResponse.json();\n\n    const liveProduct =\n      Array.isArray(liveProductRows)\n        ? liveProductRows[0]\n        : null;\n\n    if (!liveProduct) {\n      return NextResponse.json(\n        {\n          success: false,\n          message:\n            \"This product is not available right now.\",\n        },\n        { status: 404 }\n      );\n    }\n\n    const productName = String(\n      liveProduct.name || PRODUCT_NAME\n    );\n\n    const productSlug = String(\n      liveProduct.slug || PRODUCT_SLUG\n    );\n\n    const productPrice = Number(\n      liveProduct.price || 0\n    );\n\n    const availableStock = Math.max(\n      0,\n      Number(\n        liveProduct.stock_quantity || 0\n      )\n    );\n\n    const availableForSale =\n      liveProduct.status === \"available\" &&\n      Boolean(liveProduct.allow_purchase) &&\n      availableStock > 0 &&\n      productPrice > 0;\n\n    if (!availableForSale) {\n      return NextResponse.json(\n        {\n          success: false,\n          message:\n            \"This product is currently unavailable for sale.\",\n        },\n        { status: 409 }\n      );\n    }\n\n    if (quantity > availableStock) {\n      return NextResponse.json(\n        {\n          success: false,\n          message:\n            \`Only \${availableStock} item(s) are currently available.\`,\n        },\n        { status: 409 }\n      );\n    }`;

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
