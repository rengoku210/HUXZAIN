// scripts/route-audit.ts
import * as fs from "fs";
import * as path from "path";

// Utility to recursively collect .tsx route files
function collectRouteFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules and build output
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build")
        continue;
      collectRouteFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractRoutePath(filePath: string): string | null {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/createFileRoute\("([^\"]+)"\)/);
  return match ? match[1] : null;
}

function auditRoutes(projectRoot: string) {
  const routeDir = path.join(projectRoot, "src", "routes");
  const files = collectRouteFiles(routeDir);
  const pathMap = new Map<string, string[]>();
  const ignored: string[] = [];
  const orphan: string[] = [];

  for (const file of files) {
    // ignore placeholder files (prefixed with '-')
    if (path.basename(file).startsWith("-")) {
      ignored.push(file);
      continue;
    }
    const routePath = extractRoutePath(file);
    if (!routePath) {
      orphan.push(file);
      continue;
    }
    if (!pathMap.has(routePath)) pathMap.set(routePath, []);
    pathMap.get(routePath)!.push(file);
  }

  const duplicates: Record<string, string[]> = {};
  for (const [route, files] of pathMap.entries()) {
    if (files.length > 1) duplicates[route] = files;
  }

  // Console output
  console.log("=== Route Audit Report ===");
  if (Object.keys(duplicates).length) {
    console.log("Duplicate route definitions detected:");
    for (const [route, files] of Object.entries(duplicates)) {
      console.log(`  ${route}:`);
      files.forEach((f) => console.log(`    - ${f}`));
    }
  } else {
    console.log("No duplicate routes found.");
  }

  if (ignored.length) {
    console.log("Ignored placeholder files:");
    ignored.forEach((f) => console.log(`  - ${f}`));
  }

  if (orphan.length) {
    console.log("Files without a Route export (orphan):");
    orphan.forEach((f) => console.log(`  - ${f}`));
  }

  // Generate markdown report
  const reportLines: string[] = [];
  reportLines.push("# Route Audit Report");
  reportLines.push("");
  reportLines.push(`Generated on ${new Date().toISOString()}`);
  reportLines.push("");

  if (Object.keys(duplicates).length) {
    reportLines.push("## Duplicate Routes");
    for (const [route, files] of Object.entries(duplicates)) {
      reportLines.push(`- **${route}**`);
      files.forEach((f) => reportLines.push(`  - ${f}`));
    }
    reportLines.push("");
  } else {
    reportLines.push("## No duplicate routes detected\n");
  }

  if (ignored.length) {
    reportLines.push("## Ignored Placeholder Files");
    ignored.forEach((f) => reportLines.push(`- ${f}`));
    reportLines.push("");
  }

  if (orphan.length) {
    reportLines.push("## Orphan Files (no Route export)");
    orphan.forEach((f) => reportLines.push(`- ${f}`));
    reportLines.push("");
  }

  reportLines.push("## Summary");
  reportLines.push(`- Total route files scanned: ${files.length}`);
  reportLines.push(`- Duplicate definitions: ${Object.keys(duplicates).length}`);
  reportLines.push(`- Ignored placeholders: ${ignored.length}`);
  reportLines.push(`- Orphan files: ${orphan.length}`);

  const reportPath = path.join(projectRoot, "route-audit-report.md");
  fs.writeFileSync(reportPath, reportLines.join("\n"), "utf8");
  console.log(`\nMarkdown report written to ${reportPath}`);
}

auditRoutes(process.cwd());
