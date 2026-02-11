#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const mm = require("minimatch");

const minimatch = typeof mm === "function" ? mm : mm.minimatch;

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (e) {
    return "";
  }
}

function resolveRef(ref) {
  if (!ref) return "";
  if (run(`git rev-parse --verify --quiet "${ref}"`)) return ref;
  if (!ref.startsWith("origin/")) {
    const originRef = `origin/${ref}`;
    if (run(`git rev-parse --verify --quiet "${originRef}"`)) return originRef;
  }
  return ref;
}

const repoRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(repoRoot, ".worktrees.json");
if (!fs.existsSync(manifestPath)) {
  console.error("Manifest .worktrees.json not found at repo root");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function findRule(branch) {
  return (manifest.worktrees || [])
    .map((rule) => ({
      ...rule,
      matchLen: branch.startsWith(rule.branchPrefix) ? rule.branchPrefix.length : 0,
    }))
    .reduce((best, next) => (next.matchLen > best.matchLen ? next : best), {
      branchPrefix: "",
      allowedPaths: manifest.defaultAllowed || [],
      matchLen: 0,
    });
}

function branchToLane(branch) {
  const m = branch.match(/^V1\/(senderrapp|senderrplace|admin)\//);
  return m ? m[1] : "";
}

async function main() {
  const envBranch = process.env.BRANCH || process.env.GITHUB_HEAD_REF || "";
  const branch = envBranch || run("git rev-parse --abbrev-ref HEAD");
  if (!branch) {
    console.error("Could not determine branch. Set BRANCH env or run on a checked-out branch.");
    process.exit(2);
  }

  const protectedBranches = new Set(manifest.protectedBranches || []);
  if (protectedBranches.has(branch) && process.env.ALLOW_PROTECTED_BRANCH !== "1") {
    console.error(
      `Branch "${branch}" is protected by policy. Create a feature branch from a V1/base-* branch instead.`,
    );
    process.exit(4);
  }

  const matchedRule = findRule(branch);
  const lane = branchToLane(branch);
  const envBase = process.env.BASE_BRANCH || process.env.GITHUB_BASE_REF || "";
  const laneBase = lane && manifest.baseBranches ? manifest.baseBranches[lane] : "";
  const branchBase = matchedRule.baseBranch || "";
  const baseRaw = envBase || laneBase || branchBase || "main";
  const baseRef = resolveRef(baseRaw);
  const branchRef = resolveRef(branch);

  try {
    execSync("git fetch --no-tags --quiet origin", { stdio: "ignore" });
  } catch (e) {
    // Continue; local refs may already be enough for local validation.
  }

  const changed = run(`git diff --name-only "${baseRef}"..."${branchRef}"`)
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    .sort();

  const allowed = matchedRule.allowedPaths || manifest.defaultAllowed || [];
  const allowAll = allowed.includes("**");
  const violations = [];
  for (const file of changed) {
    if (allowAll) continue;
    const ok = allowed.some((glob) => minimatch(file, glob, { dot: true }));
    if (!ok) violations.push(file);
  }

  console.log(`Branch: ${branchRef}`);
  console.log(`Base: ${baseRef}`);
  console.log(`Rule: ${matchedRule.branchPrefix || "DEFAULT"}`);
  console.log(`Changed files: ${changed.length}`);
  console.log(`Allowed globs: ${allowed.length}`);

  const reportPath = path.join(repoRoot, "worktrees-report.md");
  const report = [];
  report.push(`# Worktrees Validation Report - ${branch}`);
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`Base: ${baseRef}`);
  report.push(`Rule: ${matchedRule.branchPrefix || "DEFAULT"}`);
  report.push("");
  report.push("## Changed files");
  if (changed.length === 0) {
    report.push("- (none)");
  } else {
    for (const file of changed) report.push(`- ${file}`);
  }
  report.push("");
  report.push("## Allowed globs");
  for (const glob of allowed) report.push(`- ${glob}`);
  report.push("");
  if (violations.length) {
    report.push("## Violations");
    for (const file of violations) report.push(`- ${file}`);
  } else {
    report.push("## Result");
    report.push("No violations found.");
  }
  fs.writeFileSync(reportPath, report.join("\n"));
  console.log(`Report written to ${reportPath}`);

  if (violations.length) {
    console.error("\nWorktree validation failed. Branch touches paths outside its allowed scope.");
    process.exit(3);
  }

  console.log("\nWorktree validation succeeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
