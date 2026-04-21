#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════
 * create-kyvern-agent
 *
 *   npx create-kyvern-agent my-agent
 *
 * Scaffolds a working Solana AI-agent project wired to a Kyvern vault:
 *
 *   - TypeScript + Node 18+
 *   - @kyvernlabs/sdk OnChainVault pre-configured
 *   - Sample agent that pays three test merchants, demonstrating the
 *     allowed → blocked → kill-switch flow
 *   - .env.example with KYVERN_* + RPC_URL slots
 *   - README with a 60-second run recipe
 *
 * Zero interactive prompts. The defaults "just work" on devnet against
 * the deployed kyvern_policy program. Users can point it at mainnet by
 * editing one env var.
 *
 * Design note: this is a plain Node CLI (no extra deps, one file) so
 * `npx create-kyvern-agent` resolves in under 5 seconds. No transpile
 * step, no build, no postinstall.
 * ════════════════════════════════════════════════════════════════════
 */

import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../templates/langchain");

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

function log(msg = "") {
  process.stdout.write(msg + "\n");
}

function die(msg) {
  process.stderr.write(`${RED}✗${RESET} ${msg}\n`);
  process.exit(1);
}

async function main() {
  const rawName = process.argv[2];
  const name = rawName && rawName.trim().length > 0 ? rawName : "my-kyvern-agent";

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    die(
      `invalid project name: "${name}". Use lowercase letters, digits, and dashes only.`,
    );
  }

  const target = resolve(process.cwd(), name);

  if (existsSync(target)) {
    die(`directory "${name}" already exists. Pick a new name or remove it first.`);
  }

  if (!existsSync(TEMPLATE_DIR)) {
    die(`template directory missing: ${TEMPLATE_DIR}`);
  }

  log();
  log(`${CYAN}${BOLD}Kyvern Agent${RESET} ${DIM}·${RESET} scaffolding into ./${name}`);
  log();

  await mkdir(target, { recursive: true });

  // Recursive copy of templates/langchain → target
  await cp(TEMPLATE_DIR, target, { recursive: true });

  // Rename gitignore.template → .gitignore (npm strips .gitignore from
  // published packages; the .template shim gets around it).
  const gitignoreShim = join(target, "gitignore.template");
  if (existsSync(gitignoreShim)) {
    const content = await readFile(gitignoreShim, "utf8");
    await writeFile(join(target, ".gitignore"), content);
    const { unlink } = await import("node:fs/promises");
    await unlink(gitignoreShim);
  }

  // Rewrite package.json `name` field with the project name.
  const pkgPath = join(target, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
    pkg.name = name;
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  log(`${GREEN}✓${RESET} files written`);
  log();
  log(`${BOLD}Next:${RESET}`);
  log(`  ${DIM}$${RESET} cd ${name}`);
  log(`  ${DIM}$${RESET} npm install`);
  log(`  ${DIM}$${RESET} cp .env.example .env         ${DIM}# paste your vault details${RESET}`);
  log(`  ${DIM}$${RESET} npm run agent                ${DIM}# watches Explorer fill up${RESET}`);
  log();
  log(`${YELLOW}Note:${RESET} You need a Kyvern vault + agent key before running.`);
  log(`  Create one at ${CYAN}https://kyvernlabs.com/vault/new${RESET} (60 seconds),`);
  log(`  or run ${CYAN}npx tsx scripts/demo-e2e.ts${RESET} from the kyvernlabs monorepo.`);
  log();
  log(`Read ${CYAN}${name}/README.md${RESET} for the full tour.`);
  log();
}

main().catch((e) => {
  die(e?.stack ?? String(e));
});
