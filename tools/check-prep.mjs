import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const failures = [];

async function walkJson(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", ".handoff", "node_modules", "artifacts", "dist", "coverage", "source-inputs"].includes(entry.name)) {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...await walkJson(path));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      result.push(path);
    }
  }
  return result;
}

const rootPath = fileURLToPath(root);
const jsonFiles = await walkJson(rootPath);
for (const file of jsonFiles) {
  try {
    JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    failures.push(`invalid JSON ${relative(rootPath, file)}: ${error.message}`);
  }
}

const conformanceRoot = new URL("src/diffdevil/contracts/detail/v1/conformance/", root);
let cases = 0;
const caseIds = new Set();
for (const entry of await readdir(conformanceRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) {
    continue;
  }

  const value = JSON.parse(await readFile(new URL(entry.name, conformanceRoot), "utf8"));
  const candidates = Array.isArray(value) ? value : value.cases;
  if (Array.isArray(candidates)) {
    for (const row of candidates) {
      const key = `${entry.name}/${row.id}`;
      if (typeof row.id !== 'string' || row.id.length === 0) failures.push(`conformance case in ${entry.name} has no id`);
      else if (caseIds.has(key)) failures.push(`duplicate conformance case: ${key}`);
      else caseIds.add(key);
      cases++;
    }
  }
}

if (cases === 0) failures.push('No declared conformance cases were found.');

// Documentation meaning and branding are reviewed from their maintained sources.
// Parsing machine contracts does not prove narrative quality or freeze a corpus quota.
if (failures.length > 0) {
  console.error("diffdevil preparation check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`diffdevil preparation check passed: ${jsonFiles.length} JSON assets, ${cases} declared conformance cases.`);
}
