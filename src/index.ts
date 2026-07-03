/**
 * cfc — claude-frontend-cli entrypoint.
 * Tiny hand-rolled arg parser + command dispatch (no external CLI framework).
 */

import { KIT_VERSION } from "./lib/manifest.js";
import type { FlagValue } from "./lib/args.js";
import { error, info } from "./lib/output.js";
import { initCommand } from "./commands/init.js";
import { getCommand } from "./commands/get.js";
import { syncCommand } from "./commands/sync.js";
import { listCommand } from "./commands/list.js";
import { doctorCommand } from "./commands/doctor.js";

export interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, FlagValue>;
}

function parse(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, FlagValue> = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith("-")) {
      const key = tok.replace(/^-+/, "");
      const next = argv[i + 1];
      let value: string | boolean = true;
      if (next && !next.startsWith("-")) {
        value = next;
        i++;
      }
      // Repeated flags (e.g. --set) accumulate into an array.
      const prev = flags[key];
      if (prev === undefined) {
        flags[key] = value;
      } else if (Array.isArray(prev)) {
        prev.push(String(value));
      } else {
        flags[key] = [String(prev), String(value)];
      }
    } else {
      positionals.push(tok);
    }
  }
  const [command = "help", ...rest] = positionals;
  return { command, positionals: rest, flags };
}

const HELP = `cfc — claude-frontend-cli
Firmowy installer konfiguracji Claude Code dla projektów frontend (Nuxt/Vue/TS).

Usage:
  cfc init [--stack <id>] [--with-jira] [--no-mcp] [--yes] [--set KEY=VALUE ...] [--dry-run] [--force]
  cfc get --type <skill|doc|agent> --name <name> [--dry-run] [--force]
  cfc sync [--dry-run] [--force]
  cfc list
  cfc doctor

Options:
  --stack       Frontend stack preset (nuxt-vue | react | generic; default nuxt-vue)
  --with-jira   Include the optional Jira/sprint module
  --no-mcp      Skip the MCP config (.mcp.json) and env template
  --yes         Non-interactive: keep {{placeholders}} unless provided via --set
  --set K=V     Provide a value non-interactively (repeatable; e.g. --set PROJECT_NAME=Acme)
  --dry-run     Preview changes without writing
  --force       Overwrite local edits / existing config
  --tool        Target tool profile (default: claude-code)
  -h, --help    Show help
  -v, --version Show version
`;

async function main(): Promise<void> {
  const args = parse(process.argv.slice(2));

  // Version first — otherwise `cfc --version` (command defaults to "help") would
  // print help instead of the version.
  if (args.flags.version || args.flags.v || args.command === "version") {
    info(KIT_VERSION);
    return;
  }
  if (args.flags.help || args.flags.h || args.command === "help") {
    info(HELP);
    return;
  }

  const projectRoot = process.cwd();

  switch (args.command) {
    case "init":
      await initCommand(args, projectRoot);
      break;
    case "get":
      await getCommand(args, projectRoot);
      break;
    case "sync":
      await syncCommand(args, projectRoot);
      break;
    case "list":
      await listCommand(args, projectRoot);
      break;
    case "doctor":
      await doctorCommand(args, projectRoot);
      break;
    default:
      error(`Unknown command: ${args.command}`);
      info(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
