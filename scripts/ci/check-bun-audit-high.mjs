#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const BLOCKING_SEVERITIES = new Set(["high", "critical"]);

const result = spawnSync("bun", ["audit", "--json"], {
  encoding: "utf8",
  shell: false,
});

const combinedOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.replaceAll(ANSI_PATTERN, "");
const jsonStart = combinedOutput.indexOf("{");

const extractFirstJsonObject = (text, startIndex) => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
};

if (jsonStart === -1) {
  if (result.status === 0) {
    console.log("bun audit returned no advisories.");
    process.exit(0);
  }

  console.error("Unable to parse bun audit output as JSON.");
  console.error(combinedOutput.trim());
  process.exit(result.status ?? 1);
}

let report;
try {
  const jsonPayload = extractFirstJsonObject(combinedOutput, jsonStart);
  if (!jsonPayload) {
    throw new Error("Unable to extract JSON object from bun audit output.");
  }

  report = JSON.parse(jsonPayload);
} catch (error) {
  console.error("Invalid bun audit JSON payload.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const blockingFindings = [];

for (const [packageName, advisories] of Object.entries(report)) {
  if (!Array.isArray(advisories)) {
    continue;
  }

  for (const advisory of advisories) {
    const severity = String(advisory?.severity ?? "unknown").toLowerCase();
    if (!BLOCKING_SEVERITIES.has(severity)) {
      continue;
    }

    blockingFindings.push({
      packageName,
      severity,
      title: String(advisory?.title ?? "Untitled advisory"),
      id: String(advisory?.id ?? "unknown"),
      url: String(advisory?.url ?? ""),
      vulnerableVersions: String(advisory?.vulnerable_versions ?? ""),
    });
  }
}

if (blockingFindings.length === 0) {
  console.log("No high/critical dependency advisories detected.");
  process.exit(0);
}

console.error("Blocking high/critical advisories found:");
for (const finding of blockingFindings) {
  const link = finding.url ? ` (${finding.url})` : "";
  const range = finding.vulnerableVersions ? ` | vulnerable: ${finding.vulnerableVersions}` : "";
  console.error(
    `- [${finding.severity}] ${finding.packageName} :: ${finding.title} [${finding.id}]${range}${link}`,
  );
}

process.exit(1);
