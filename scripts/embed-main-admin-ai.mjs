import fs from "node:fs";

const filePath = "app/admin/page.tsx";
let source = fs.readFileSync(filePath, "utf8");
let changed = false;

const importLine = 'import OrvixAiPanel from "./OrvixAiPanel";\n';

if (!source.includes(importLine.trim())) {
  const importMarker = 'import Link from "next/link";\n';
  if (!source.includes(importMarker)) throw new Error("Could not find admin import marker.");
  source = source.replace(importMarker, `${importMarker}${importLine}`);
  changed = true;
}

const panelMarkup = `          <OrvixAiPanel\n            onActionComplete={() =>\n              void loadDashboard(true)\n            }\n          />\n\n`;

if (!source.includes("<OrvixAiPanel")) {
  const renderMarker = `          </header>\n\n          {message && (`;
  if (!source.includes(renderMarker)) throw new Error("Could not find authenticated dashboard render marker.");
  source = source.replace(renderMarker, `          </header>\n\n${panelMarkup}          {message && (`);
  changed = true;
}

if (!changed) {
  console.log("Main admin already contains ORVIX AI.");
  process.exit(0);
}

fs.writeFileSync(filePath, source);
console.log("Embedded ORVIX AI into app/admin/page.tsx.");
