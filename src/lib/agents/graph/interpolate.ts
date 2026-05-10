/**
 * Variable interpolation for step configs.
 *
 * Replaces {{path.to.value}} in user-supplied strings with values
 * pulled from the run context's vars bag. Supports:
 *
 *   {{step1.output.text}}              — nested object access
 *   {{trigger.payload.amount}}         — top-level reserved keys
 *   {{items[0].id}}                    — array indexing
 *   {{?optional.path}}                 — leading ? = empty string on miss
 *
 * Strict (default): throws if a path is undefined.
 * Soft (?-prefix): returns "" if the path is undefined.
 *
 * Pure function — no side effects, no DB calls. Fully unit-testable.
 *
 * Format: only flat string substitution. Object/array values are
 * JSON.stringified on the fly so they can be embedded in HTTP bodies
 * and prompts. For "I want the raw object," step config supports
 * objects directly (HttpStepConfig.body is a record, not a string).
 */

const TOKEN_RE = /\{\{(\??)([^}]+?)\}\}/g;

export class InterpolationError extends Error {
  constructor(public path: string, public reason: string) {
    super(`interpolation failed at {{${path}}}: ${reason}`);
    this.name = "InterpolationError";
  }
}

/** Resolve a dotted path like "step1.output.foo" against a context.
 *  Supports `name[N]` array indexing inside any segment. */
export function resolvePath(
  ctx: Record<string, unknown>,
  rawPath: string,
): { found: boolean; value: unknown } {
  const path = rawPath.trim();
  if (!path) return { found: false, value: undefined };

  // Split on '.', but handle [N] inline. Examples:
  //   "step1.output.items[0].id"
  //     → ["step1", "output", "items", "0", "id"]
  const parts: string[] = [];
  for (const seg of path.split(".")) {
    const m = seg.match(/^([^[]+)((?:\[[0-9]+\])*)$/);
    if (!m) {
      // Path has weird characters (e.g. "x.y[]z") — treat as miss.
      return { found: false, value: undefined };
    }
    parts.push(m[1]);
    const idxs = m[2].matchAll(/\[(\d+)\]/g);
    for (const idx of idxs) parts.push(idx[1]);
  }

  let cursor: unknown = ctx;
  for (const part of parts) {
    if (cursor == null) return { found: false, value: undefined };
    if (typeof cursor !== "object") return { found: false, value: undefined };
    const c = cursor as Record<string, unknown>;
    if (!(part in c)) return { found: false, value: undefined };
    cursor = c[part];
  }
  return { found: true, value: cursor };
}

/** Stringify a resolved value for embedding into a string. Strings
 *  pass through. Numbers/booleans use String(). null → "". Objects
 *  + arrays JSON.stringify. */
function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/** Substitute every {{...}} in `template` against `vars`. */
export function interpolate(
  template: string,
  vars: Record<string, unknown>,
): string {
  return template.replace(TOKEN_RE, (_match, optionalMark: string, path: string) => {
    const isOptional = optionalMark === "?";
    const { found, value } = resolvePath(vars, path);
    if (!found) {
      if (isOptional) return "";
      throw new InterpolationError(path, "path not found in run context");
    }
    return stringifyValue(value);
  });
}

/** Recursively interpolate every string leaf in a JSON-like object,
 *  preserving structure. Used for HttpStepConfig.body, headers, etc.
 *  Arrays/objects walk; numbers/booleans/null pass through. */
export function interpolateDeep(
  value: unknown,
  vars: Record<string, unknown>,
): unknown {
  if (typeof value === "string") return interpolate(value, vars);
  if (Array.isArray(value)) return value.map((v) => interpolateDeep(v, vars));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolateDeep(v, vars);
    }
    return out;
  }
  return value;
}

/** Resolve a value that may be a number-or-string-template. Used
 *  for amount fields where the user might enter `0.05` literally
 *  or `{{step1.output.amount}}` for dynamic values. Throws if the
 *  resolved value isn't a finite number. */
export function resolveNumber(
  value: number | string,
  vars: Record<string, unknown>,
  fieldName: string,
): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${fieldName} is not a finite number`);
    }
    return value;
  }
  const interpolated = interpolate(value, vars).trim();
  const parsed = Number(interpolated);
  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${fieldName} resolved to "${interpolated}" which is not a number`,
    );
  }
  return parsed;
}
