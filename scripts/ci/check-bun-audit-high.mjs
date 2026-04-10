#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);

function getInstalledVersion(packageName) {
  try {
    const pkgPath = new URL(`../../node_modules/${packageName}/package.json`, import.meta.url);
    if (!existsSync(pkgPath)) return null;
    const pkg = require(pkgPath.pathname);
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function isInstalledVersionVulnerable(packageName, vulnerableVersionsRange) {
  if (!vulnerableVersionsRange) return true; // assume vulnerable if no range given
  const installedVersion = getInstalledVersion(packageName);
  if (!installedVersion) return true; // assume vulnerable if can't determine

  try {
    const semver = require("semver");
    return semver.satisfies(installedVersion, vulnerableVersionsRange, { includePrerelease: false });
  } catch {
    // If semver check fails, conservatively assume vulnerable
    return true;
  }
}

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

    const vulnerableVersions = String(advisory?.vulnerable_versions ?? "");
    if (!isInstalledVersionVulnerable(packageName, vulnerableVersions)) {
      continue;
    }

    blockingFindings.push({
      packageName,
      installedVersion: getInstalledVersion(packageName) ?? "unknown",
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
  const installed = finding.installedVersion ? ` | installed: ${finding.installedVersion}` : "";
  console.error(
    `- [${finding.severity}] ${finding.packageName} :: ${finding.title} [${finding.id}]${range}${installed}${link}`,
  );
}

process.exit(1);
