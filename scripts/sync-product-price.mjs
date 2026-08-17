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

// Keep the legacy Fitbit checkout pointed at the public live product price.
// Order creation itself is now handled by the atomic /api/order-v3 pipeline,
// so this build helper must never rewrite app/api/order/route.ts again.
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

  next = next.replace(
    "                      {formatMoney(\n                        PRODUCT_PRICE\n                      )} {copy.each}",
    "                      {formatMoney(\n                        productPrice\n                      )} {copy.each}"
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

await updateFile("app/admin/products/page.tsx", (source) => {
  return source
    .replaceAll("Allow Purchase", "Available for Sale")
    .replace(
      "              Manage Products\n",
      "              Manage Products & Stock\n"
    );
});
