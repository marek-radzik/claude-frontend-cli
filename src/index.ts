/**
 * cfc — claude-frontend-cli entrypoint.
 * Tiny hand-rolled arg parser + command dispatch (no external CLI framework).
 */

import { KIT_VERSION } from "./lib/manifest.js";
import { error, info } from "./lib/output.js";
import { initCommand } from "./commands/init.js";
import { getCommand } from "./commands/get.js";
import { syncCommand } from "./commands/sync.js";
import { listCommand } from "./commands/list.js";
import { doctorCommand } from "./commands/doctor.js";

export interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parse(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith("-")) {
      const key = tok.replace(/^-+/, "");
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
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
  cfc init [--with-jira] [--yes] [--dry-run] [--force] [--tool claude-code]
  cfc get --type <skill|doc|agent> --name <name> [--dry-run] [--force]
  cfc sync [--dry-run] [--force]
  cfc list
  cfc doctor

Options:
  --with-jira   Include the optional Jira/sprint module
  --yes         Non-interactive: keep {{placeholders}} for manual fill-in
  --dry-run     Preview changes without writing
  --force       Overwrite local edits / existing config
  --tool        Target tool profile (default: claude-code)
  -h, --help    Show help
  -v, --version Show version
`;

async function main(): Promise<void> {
  const args = parse(process.argv.slice(2));

  if (args.flags.help || args.flags.h || args.command === "help") {
    info(HELP);
    return;
  }
  if (args.flags.version || args.flags.v || args.command === "version") {
    info(KIT_VERSION);
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
