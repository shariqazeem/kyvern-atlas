/**
 * Safe expression evaluator for branch.condition.
 *
 * Hand-rolled recursive-descent parser + evaluator. NO eval(), NO
 * new Function(). Supports a deliberately tiny grammar:
 *
 *   expr       = or_expr
 *   or_expr    = and_expr ('||' and_expr)*
 *   and_expr   = not_expr ('&&' not_expr)*
 *   not_expr   = '!' not_expr | comparison
 *   comparison = primary (cmp_op primary)?
 *   cmp_op     = '==' | '!=' | '<' | '<=' | '>' | '>='
 *   primary    = number | string | 'true' | 'false' | 'null' |
 *                ident | '(' expr ')'
 *   ident      = name ('.' name)* ('[' integer ']')*
 *
 * Identifiers resolve through the same resolvePath() the interpolation
 * module uses. A missing identifier evaluates to undefined; comparing
 * undefined to anything returns false (truthy/falsy semantics match
 * JS — undefined && anything is false, so branches don't crash on
 * partial data).
 *
 * Pure function — no side effects, fully unit-testable.
 */

import { resolvePath } from "./interpolate";

export class ExpressionError extends Error {
  constructor(message: string, public input: string) {
    super(`expression error in "${input}": ${message}`);
    this.name = "ExpressionError";
  }
}

type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "null" }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: "==" | "!=" | "<" | "<=" | ">" | ">=" | "&&" | "||" | "!" | "(" | ")" };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];

    // Whitespace
    if (/\s/.test(c)) { i++; continue; }

    // Two-char operators
    const two = src.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "&&" || two === "||") {
      tokens.push({ kind: "op", value: two });
      i += 2;
      continue;
    }

    // Single-char operators
    if (c === "<" || c === ">" || c === "!" || c === "(" || c === ")") {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(c) || (c === "-" && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      if (src[j] === "-") j++;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const numStr = src.slice(i, j);
      const num = Number(numStr);
      if (!Number.isFinite(num)) {
        throw new ExpressionError(`bad number "${numStr}"`, src);
      }
      tokens.push({ kind: "number", value: num });
      i = j;
      continue;
    }

    // Strings (single or double-quoted, no escapes for v1)
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\") { j += 2; continue; } // skip escaped chars
        j++;
      }
      if (j >= src.length) {
        throw new ExpressionError("unterminated string literal", src);
      }
      tokens.push({ kind: "string", value: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }

    // Identifiers + literals
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_.\[\]]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (word === "true") tokens.push({ kind: "bool", value: true });
      else if (word === "false") tokens.push({ kind: "bool", value: false });
      else if (word === "null") tokens.push({ kind: "null" });
      else tokens.push({ kind: "ident", value: word });
      i = j;
      continue;
    }

    throw new ExpressionError(`unexpected character "${c}" at position ${i}`, src);
  }
  return tokens;
}

interface ParserState {
  tokens: Token[];
  pos: number;
  src: string;
}

function peek(s: ParserState): Token | null {
  return s.tokens[s.pos] ?? null;
}
function consume(s: ParserState): Token {
  const t = s.tokens[s.pos];
  if (!t) throw new ExpressionError("unexpected end of expression", s.src);
  s.pos++;
  return t;
}

type AstNode =
  | { kind: "literal"; value: unknown }
  | { kind: "ident"; path: string }
  | { kind: "not"; child: AstNode }
  | { kind: "binop"; op: string; left: AstNode; right: AstNode };

function parseExpr(s: ParserState): AstNode {
  return parseOr(s);
}

function parseOr(s: ParserState): AstNode {
  let left = parseAnd(s);
  while (peek(s)?.kind === "op" && (peek(s) as { value: string }).value === "||") {
    consume(s);
    const right = parseAnd(s);
    left = { kind: "binop", op: "||", left, right };
  }
  return left;
}

function parseAnd(s: ParserState): AstNode {
  let left = parseNot(s);
  while (peek(s)?.kind === "op" && (peek(s) as { value: string }).value === "&&") {
    consume(s);
    const right = parseNot(s);
    left = { kind: "binop", op: "&&", left, right };
  }
  return left;
}

function parseNot(s: ParserState): AstNode {
  if (peek(s)?.kind === "op" && (peek(s) as { value: string }).value === "!") {
    consume(s);
    return { kind: "not", child: parseNot(s) };
  }
  return parseComparison(s);
}

function parseComparison(s: ParserState): AstNode {
  const left = parsePrimary(s);
  const op = peek(s);
  if (
    op?.kind === "op" &&
    ["==", "!=", "<", "<=", ">", ">="].includes((op as { value: string }).value)
  ) {
    consume(s);
    const right = parsePrimary(s);
    return { kind: "binop", op: (op as { value: string }).value, left, right };
  }
  return left;
}

function parsePrimary(s: ParserState): AstNode {
  const t = consume(s);
  switch (t.kind) {
    case "number":
    case "string":
    case "bool":
      return { kind: "literal", value: t.value };
    case "null":
      return { kind: "literal", value: null };
    case "ident":
      return { kind: "ident", path: t.value };
    case "op":
      if (t.value === "(") {
        const inner = parseExpr(s);
        const close = consume(s);
        if (close.kind !== "op" || close.value !== ")") {
          throw new ExpressionError(`expected ')' got ${JSON.stringify(close)}`, s.src);
        }
        return inner;
      }
      throw new ExpressionError(`unexpected operator "${t.value}"`, s.src);
  }
}

function evalAst(node: AstNode, vars: Record<string, unknown>): unknown {
  switch (node.kind) {
    case "literal":
      return node.value;
    case "ident": {
      const r = resolvePath(vars, node.path);
      return r.found ? r.value : undefined;
    }
    case "not":
      return !evalAst(node.child, vars);
    case "binop": {
      const op = node.op;
      // Short-circuit logical ops to match JS semantics.
      if (op === "&&") {
        const l = evalAst(node.left, vars);
        if (!l) return false;
        return Boolean(evalAst(node.right, vars));
      }
      if (op === "||") {
        const l = evalAst(node.left, vars);
        if (l) return Boolean(l);
        return Boolean(evalAst(node.right, vars));
      }
      const l = evalAst(node.left, vars);
      const r = evalAst(node.right, vars);
      switch (op) {
        case "==": return l === r;
        case "!=": return l !== r;
        case "<":  return typeof l === "number" && typeof r === "number" && l < r;
        case "<=": return typeof l === "number" && typeof r === "number" && l <= r;
        case ">":  return typeof l === "number" && typeof r === "number" && l > r;
        case ">=": return typeof l === "number" && typeof r === "number" && l >= r;
      }
    }
  }
}

/** Evaluate an expression against the run vars. Returns a boolean
 *  (truthy result coerced to true). */
export function evaluateExpression(
  expr: string,
  vars: Record<string, unknown>,
): boolean {
  if (!expr || !expr.trim()) {
    throw new ExpressionError("empty expression", expr);
  }
  const tokens = tokenize(expr);
  const state: ParserState = { tokens, pos: 0, src: expr };
  const ast = parseExpr(state);
  if (state.pos !== tokens.length) {
    throw new ExpressionError(
      `trailing tokens after parse (${tokens.length - state.pos} remaining)`,
      expr,
    );
  }
  return Boolean(evalAst(ast, vars));
}
