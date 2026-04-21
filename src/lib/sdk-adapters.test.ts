/* ════════════════════════════════════════════════════════════════════
   sdk-adapters.test.ts

   Tests the LangChain + Eliza adapters shipped from
   packages/sdk/src/adapters/*. We use structural stand-ins for both
   LangChain's DynamicStructuredTool and the zod namespace, plus a fake
   Vault.pay(), so the tests have zero runtime peer dependencies — just
   like the adapters themselves.
   ════════════════════════════════════════════════════════════════════ */

import { describe, expect, it, vi } from "vitest";
import {
  kyvernPayTool,
  summarize,
} from "../../packages/sdk/src/adapters/langchain";
import { kyvernPayAction } from "../../packages/sdk/src/adapters/eliza";
import type { PayResult, Vault } from "../../packages/sdk/src/index";

/* ─── Fake LangChain + zod ─── */

interface FakeTool {
  name: string;
  description: string;
  schema: unknown;
  func: (input: Record<string, unknown>) => Promise<string>;
}

class FakeDynamicStructuredTool implements FakeTool {
  name: string;
  description: string;
  schema: unknown;
  func: (input: Record<string, unknown>) => Promise<string>;
  constructor(cfg: FakeTool) {
    this.name = cfg.name;
    this.description = cfg.description;
    this.schema = cfg.schema;
    this.func = cfg.func;
  }
}

const fakeZod = {
  object: (shape: Record<string, unknown>) => ({ _shape: shape }),
  string: () => ({
    describe(text: string) {
      return { _kind: "string", _desc: text };
    },
  }),
  number: () => ({
    describe(text: string) {
      return { _kind: "number", _desc: text };
    },
  }),
};

/* ─── Fake Vault ─── */

function makeFakeVault(nextResult: PayResult): { vault: Vault; spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn(async () => nextResult);
  const vault = { pay: spy } as unknown as Vault;
  return { vault, spy };
}

const allowedResult: PayResult = {
  decision: "allowed",
  payment: {
    id: "pay_123",
    vaultId: "vlt_abc",
    merchant: "api.openai.com",
    amountUsd: 0.12,
    memo: "forecast lookup",
    status: "settled",
    reason: null,
    txSignature: "SigABC",
    latencyMs: 124,
    createdAt: new Date().toISOString(),
  },
  tx: { signature: "SigABC", explorerUrl: "https://explorer/tx/SigABC" },
  budget: { dailyUtilization: 0.12 },
  velocity: { callsInWindow: 3 },
  vault: { id: "vlt_abc", name: "Research" },
};

const blockedResult: PayResult = {
  decision: "blocked",
  code: "merchant_not_allowed",
  reason: "merchant not on allowlist",
  payment: {
    id: "pay_xyz",
    vaultId: "vlt_abc",
    merchant: "sketchy.biz",
    amountUsd: 5,
    memo: null,
    status: "blocked",
    reason: "merchant not on allowlist",
    txSignature: null,
    latencyMs: null,
    createdAt: new Date().toISOString(),
  },
  vault: { id: "vlt_abc", name: "Research" },
};

/* ─── Tests: LangChain adapter ─── */

describe("kyvernPayTool (LangChain adapter)", () => {
  it("builds a tool with the documented schema + default name", () => {
    const { vault } = makeFakeVault(allowedResult);
    const tool = kyvernPayTool({
      vault,
      DynamicStructuredTool: FakeDynamicStructuredTool,
      z: fakeZod,
    });
    expect(tool.name).toBe("kyvern_pay");
    expect(tool.description).toMatch(/enforced server-side/);
    expect(tool.schema).toBeTruthy();
  });

  it("forwards structured input to vault.pay() and returns a settled JSON summary", async () => {
    const { vault, spy } = makeFakeVault(allowedResult);
    const tool = kyvernPayTool({
      vault,
      DynamicStructuredTool: FakeDynamicStructuredTool,
      z: fakeZod,
    });

    const out = await tool.func({
      merchant: "api.openai.com",
      recipientPubkey: "5eykt4UsFv8P8NJdTRE",
      amount: 0.12,
      memo: "forecast lookup",
    });

    expect(spy).toHaveBeenCalledWith({
      merchant: "api.openai.com",
      recipientPubkey: "5eykt4UsFv8P8NJdTRE",
      amount: 0.12,
      memo: "forecast lookup",
    });

    const parsed = JSON.parse(out);
    expect(parsed.status).toBe("settled");
    expect(parsed.paymentId).toBe("pay_123");
    expect(parsed.signature).toBe("SigABC");
  });

  it("returns a blocked summary with a recovery hint when policy denies", async () => {
    const { vault } = makeFakeVault(blockedResult);
    const tool = kyvernPayTool({
      vault,
      DynamicStructuredTool: FakeDynamicStructuredTool,
      z: fakeZod,
    });

    const out = await tool.func({
      merchant: "sketchy.biz",
      recipientPubkey: "5eykt4UsFv8P8NJdTRE",
      amount: 5,
    });

    const parsed = JSON.parse(out);
    expect(parsed.status).toBe("blocked");
    expect(parsed.code).toBe("merchant_not_allowed");
    expect(parsed.recovery).toMatch(/allowlist/);
  });

  it("allows name + description overrides", () => {
    const { vault } = makeFakeVault(allowedResult);
    const tool = kyvernPayTool({
      vault,
      DynamicStructuredTool: FakeDynamicStructuredTool,
      z: fakeZod,
      name: "pay_openai",
      description: "Only ever pays OpenAI.",
    });
    expect(tool.name).toBe("pay_openai");
    expect(tool.description).toContain("Only ever pays OpenAI.");
  });

  it("refuses to build if required deps are missing", () => {
    const { vault } = makeFakeVault(allowedResult);
    expect(() =>
      // @ts-expect-error intentionally missing DynamicStructuredTool
      kyvernPayTool({ vault, z: fakeZod }),
    ).toThrow(/DynamicStructuredTool/);
  });
});

describe("summarize()", () => {
  it("flattens allowed results", () => {
    expect(summarize(allowedResult).status).toBe("settled");
  });
  it("flattens blocked results with a recovery hint", () => {
    const s = summarize(blockedResult);
    expect(s.status).toBe("blocked");
    expect(s.code).toBe("merchant_not_allowed");
    expect(typeof s.recovery).toBe("string");
  });
});

/* ─── Tests: Eliza adapter ─── */

describe("kyvernPayAction (Eliza adapter)", () => {
  it("exposes the documented action shape", () => {
    const { vault } = makeFakeVault(allowedResult);
    const action = kyvernPayAction({ vault });
    expect(action.name).toBe("KYVERN_PAY");
    expect(action.similes).toContain("PAY_MERCHANT");
    expect(Array.isArray(action.examples)).toBe(true);
  });

  it("validates messages that mention a USD amount", async () => {
    const { vault } = makeFakeVault(allowedResult);
    const action = kyvernPayAction({ vault });
    expect(
      await action.validate(null, { content: { text: "pay foo $0.12" } }),
    ).toBe(true);
    expect(
      await action.validate(null, { content: { text: "hello!" } }),
    ).toBe(false);
  });

  it("handler uses provided extractParams and reports settled back to the callback", async () => {
    const { vault, spy } = makeFakeVault(allowedResult);
    const action = kyvernPayAction({
      vault,
      extractParams: () => ({
        merchant: "api.openai.com",
        recipientPubkey: "5eykt4UsFv8P8NJdTRE",
        amount: 0.12,
        memo: "forecast",
      }),
    });

    const cb = vi.fn();
    const result = await action.handler(
      null,
      { content: { text: "pay $0.12" } },
      null,
      null,
      cb,
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
    expect(cb).toHaveBeenCalled();
    const cbArg = cb.mock.calls[0][0] as { text: string; content: { status: string } };
    expect(cbArg.text).toMatch(/Paid api.openai.com/);
    expect(cbArg.content.status).toBe("settled");
  });

  it("handler surfaces a block-code back to the callback on policy deny", async () => {
    const { vault } = makeFakeVault(blockedResult);
    const action = kyvernPayAction({
      vault,
      extractParams: () => ({
        merchant: "sketchy.biz",
        recipientPubkey: "5eykt4UsFv8P8NJdTRE",
        amount: 5,
      }),
    });

    const cb = vi.fn();
    const result = await action.handler(null, { content: { text: "pay $5" } }, null, null, cb);

    expect(result).toBe(false);
    const cbArg = cb.mock.calls[0][0] as {
      text: string;
      content: { status: string; code: string };
    };
    expect(cbArg.text).toMatch(/Payment blocked/);
    expect(cbArg.content.status).toBe("blocked");
    expect(cbArg.content.code).toBe("merchant_not_allowed");
  });

  it("handler returns false when params can't be extracted", async () => {
    const { vault, spy } = makeFakeVault(allowedResult);
    const action = kyvernPayAction({
      vault,
      extractParams: () => null,
    });
    const cb = vi.fn();
    const result = await action.handler(
      null,
      { content: { text: "pay $5" } },
      null,
      null,
      cb,
    );
    expect(result).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalled();
  });
});
