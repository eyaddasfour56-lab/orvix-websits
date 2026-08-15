import { readFile, writeFile } from "node:fs/promises";

const targets = [
  "app/checkout/page.tsx",
  "app/api/order/route.ts",
];

const from = "const PRODUCT_PRICE = 7900;";
const to = "const PRODUCT_PRICE = 8500;";

for (const path of targets) {
  const source = await readFile(path, "utf8");

  if (source.includes(to)) {
    continue;
  }

  if (!source.includes(from)) {
    throw new Error(`Expected product price constant was not found in ${path}`);
  }

  await writeFile(path, source.replace(from, to), "utf8");
  console.log(`Updated ${path} to 8500 EGP`);
}
