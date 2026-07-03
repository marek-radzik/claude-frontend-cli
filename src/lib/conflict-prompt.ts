/**
 * Interactive conflict resolution for locally-edited managed files.
 * TTY-aware: non-interactive runs default to "skip" (never clobber silently).
 */

import * as p from "@clack/prompts";

export type ConflictResolution = "overwrite" | "save_user" | "skip";

export interface ConflictInfo {
  artifactType: string;
  path: string;
}

export type ConflictResolver = (info: ConflictInfo) => Promise<ConflictResolution>;

/** Resolver used when `--force` is set: always overwrite, no prompt. */
export const forceResolver: ConflictResolver = async () => "overwrite";

/** Resolver used in non-TTY / `--yes`: keep local file. */
export const skipResolver: ConflictResolver = async () => "skip";

export function createConflictResolver(tty: boolean): ConflictResolver {
  let applyToAll: ConflictResolution | null = null;

  return async (info: ConflictInfo): Promise<ConflictResolution> => {
    if (!tty) return "skip";
    if (applyToAll) return applyToAll;

    const choice = await p.select({
      message: `${info.artifactType} was modified locally: ${info.path}`,
      options: [
        { value: "overwrite", label: "Overwrite", hint: "replace with kit version" },
        { value: "save_user", label: "Save .user copy", hint: "back up local, then overwrite" },
        { value: "skip", label: "Skip", hint: "keep local, don't update" },
        { value: "apply_all", label: "Apply to all remaining", hint: "reuse one choice for the rest" },
      ],
    });

    if (p.isCancel(choice)) return "skip";

    if (choice === "apply_all") {
      const bulk = await p.select({
        message: "Resolution for all remaining conflicts?",
        options: [
          { value: "overwrite", label: "Overwrite all" },
          { value: "save_user", label: "Save .user copies for all" },
          { value: "skip", label: "Skip all" },
        ],
      });
      if (p.isCancel(bulk)) return "skip";
      applyToAll = bulk as ConflictResolution;
      return applyToAll;
    }

    return choice as ConflictResolution;
  };
}
