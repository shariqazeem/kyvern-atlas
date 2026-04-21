/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/kyvern_policy.json`.
 */
export type KyvernPolicy = {
  "address": "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc",
  "metadata": {
    "name": "kyvernPolicy",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Kyvern on-chain policy program — extends Squads v4 spending limits with merchant allowlist, velocity cap, memo enforcement, and pause for AI-agent payments on Solana.",
    "repository": "https://github.com/shariqazeem/kyvernlabs"
  },
  "instructions": [
    {
      "name": "executePayment",
      "docs": [
        "Execute a payment through this vault.",
        "",
        "Order of validation:",
        "1. Vault not paused",
        "2. Amount is positive and within the per-tx cap",
        "3. Merchant hash is on the allowlist (or allowlist is empty)",
        "4. Memo is present if `require_memo`",
        "5. Velocity cap not exceeded (sliding window)",
        "",
        "If all checks pass, this ix CPIs into Squads v4's",
        "`spending_limit_use` with the amount + memo. Squads then enforces",
        "its own daily/weekly cap. Failure at either layer reverts the",
        "whole tx — no middle state, no off-chain trust."
      ],
      "discriminator": [
        86,
        4,
        7,
        7,
        120,
        139,
        232,
        139
      ],
      "accounts": [
        {
          "name": "policy",
          "docs": [
            "Our policy PDA. Mutated to update the velocity counter."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  121,
                  118,
                  101,
                  114,
                  110,
                  45,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  45,
                  118,
                  49
                ]
              },
              {
                "kind": "account",
                "path": "multisig"
              }
            ]
          }
        },
        {
          "name": "member",
          "docs": [
            "The agent delegate — must be a `member` on the referenced Squads",
            "spending limit. Forwards signer privilege to the inner CPI."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "docs": [
            "Squads v4 multisig PDA."
          ],
          "writable": true
        },
        {
          "name": "spendingLimit",
          "docs": [
            "Squads spending-limit PDA for this agent/member."
          ],
          "writable": true
        },
        {
          "name": "mint",
          "docs": [
            "SPL mint for the payment (USDC on devnet/mainnet)."
          ]
        },
        {
          "name": "vault",
          "docs": [
            "Squads vault PDA (the SOL-funded treasury wrapper)."
          ],
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "docs": [
            "Vault's USDC ATA (source of funds)."
          ],
          "writable": true
        },
        {
          "name": "destination",
          "docs": [
            "Recipient wallet (owner of destination_token_account)."
          ],
          "writable": true
        },
        {
          "name": "destinationTokenAccount",
          "docs": [
            "Recipient's USDC ATA."
          ],
          "writable": true
        },
        {
          "name": "squadsProgram",
          "docs": [
            "The Squads v4 program itself (target of the CPI). Address-checked",
            "so this program can never be tricked into calling a clone."
          ]
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token program. Passed through to Squads CPI."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "executePaymentArgs"
            }
          }
        }
      ]
    },
    {
      "name": "initializePolicy",
      "docs": [
        "Initializes a new policy PDA for a given Squads multisig.",
        "",
        "One multisig = one policy. The `authority` is the owner wallet",
        "authorized to update the policy or pause it. The `member` that can",
        "invoke `execute_payment` is derived from the attached Squads",
        "spending-limit PDA — this program does not maintain a separate",
        "member list."
      ],
      "discriminator": [
        9,
        186,
        86,
        225,
        129,
        162,
        231,
        56
      ],
      "accounts": [
        {
          "name": "multisig",
          "docs": [
            "The Squads multisig PDA this policy governs. Passed as",
            "`UncheckedAccount` — we *don't* validate its program owner here",
            "because we only need the pubkey to derive our own PDA. The",
            "execute_payment ix later enforces that this account is actually",
            "owned by the Squads program via CPI."
          ]
        },
        {
          "name": "authority",
          "docs": [
            "Owner / admin wallet for this policy. Must sign; fee payer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "policy",
          "docs": [
            "The PolicyAccount PDA for this multisig."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  121,
                  118,
                  101,
                  114,
                  110,
                  45,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  45,
                  118,
                  49
                ]
              },
              {
                "kind": "account",
                "path": "multisig"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "initializePolicyArgs"
            }
          }
        }
      ]
    },
    {
      "name": "pause",
      "docs": [
        "Pause the vault — every subsequent `execute_payment` will fail with",
        "`KyvernError::VaultPaused` before it ever touches Squads."
      ],
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  121,
                  118,
                  101,
                  114,
                  110,
                  45,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  45,
                  118,
                  49
                ]
              },
              {
                "kind": "account",
                "path": "policy.multisig",
                "account": "policyAccount"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "policy"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "resume",
      "docs": [
        "Resume a paused vault."
      ],
      "discriminator": [
        1,
        166,
        51,
        170,
        127,
        32,
        141,
        206
      ],
      "accounts": [
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  121,
                  118,
                  101,
                  114,
                  110,
                  45,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  45,
                  118,
                  49
                ]
              },
              {
                "kind": "account",
                "path": "policy.multisig",
                "account": "policyAccount"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "policy"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "updateAllowlist",
      "docs": [
        "Replace the merchant allowlist. Only the policy authority may call.",
        "",
        "Passing an empty `Vec` is a *valid* update that means \"merchant",
        "allowlist disabled\" — every merchant hash will be accepted. (This",
        "mirrors the `allowedMerchants: []` semantics in the off-chain",
        "policy engine.)"
      ],
      "discriminator": [
        138,
        59,
        153,
        23,
        244,
        206,
        40,
        245
      ],
      "accounts": [
        {
          "name": "policy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  121,
                  118,
                  101,
                  114,
                  110,
                  45,
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  45,
                  118,
                  49
                ]
              },
              {
                "kind": "account",
                "path": "policy.multisig",
                "account": "policyAccount"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "policy"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newAllowlist",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "policyAccount",
      "discriminator": [
        218,
        201,
        183,
        164,
        156,
        127,
        81,
        175
      ]
    }
  ],
  "events": [
    {
      "name": "allowlistUpdated",
      "discriminator": [
        88,
        239,
        93,
        65,
        74,
        140,
        83,
        213
      ]
    },
    {
      "name": "paymentExecuted",
      "discriminator": [
        153,
        165,
        141,
        18,
        246,
        20,
        204,
        227
      ]
    },
    {
      "name": "policyInitialized",
      "discriminator": [
        102,
        184,
        59,
        178,
        235,
        69,
        251,
        181
      ]
    },
    {
      "name": "policyPaused",
      "discriminator": [
        125,
        114,
        89,
        149,
        229,
        231,
        254,
        37
      ]
    },
    {
      "name": "policyResumed",
      "discriminator": [
        243,
        2,
        93,
        35,
        174,
        176,
        65,
        5
      ]
    }
  ],
  "errors": [
    {
      "code": 12000,
      "name": "vaultPaused",
      "msg": "Vault is paused by the owner (kill switch)"
    },
    {
      "code": 12001,
      "name": "invalidAmount",
      "msg": "Payment amount must be strictly positive"
    },
    {
      "code": 12002,
      "name": "amountExceedsPerTxMax",
      "msg": "Amount exceeds the per-transaction USDC cap for this vault"
    },
    {
      "code": 12003,
      "name": "merchantNotAllowlisted",
      "msg": "Merchant hash is not on this vault's allowlist"
    },
    {
      "code": 12004,
      "name": "missingMemo",
      "msg": "A non-empty memo is required for this vault"
    },
    {
      "code": 12005,
      "name": "velocityCapExceeded",
      "msg": "Velocity cap exceeded for the current window"
    },
    {
      "code": 12006,
      "name": "memoTooLong",
      "msg": "Memo exceeds the protocol-level maximum length"
    },
    {
      "code": 12007,
      "name": "allowlistTooLarge",
      "msg": "Merchant allowlist exceeds MAX_ALLOWLIST_SIZE"
    },
    {
      "code": 12008,
      "name": "unauthorized",
      "msg": "Only the policy authority may perform this action"
    },
    {
      "code": 12009,
      "name": "invalidPolicy",
      "msg": "Invalid policy parameter (see window/max_calls/per_tx bounds)"
    },
    {
      "code": 12010,
      "name": "notASquadsMultisig",
      "msg": "Supplied multisig account is not owned by the Squads v4 program"
    },
    {
      "code": 12011,
      "name": "squadsCpiRejected",
      "msg": "Squads CPI rejected the spending_limit_use invocation"
    }
  ],
  "types": [
    {
      "name": "allowlistUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "executePaymentArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "docs": [
              "USDC base units to transfer. 6 decimals → $0.50 = 500_000."
            ],
            "type": "u64"
          },
          {
            "name": "decimals",
            "docs": [
              "Decimals of the mint (6 for USDC). Kept explicit because Squads",
              "requires it in the inner `spending_limit_use` args."
            ],
            "type": "u8"
          },
          {
            "name": "merchantHash",
            "docs": [
              "SHA-256 of the normalized merchant hostname (pre-computed",
              "client-side; keeps the program scan cheap and locale-agnostic)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "memo",
            "docs": [
              "Optional memo. Required when `policy.require_memo` is set."
            ],
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "initializePolicyArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "perTxMaxBaseUnits",
            "docs": [
              "Per-transaction USDC cap in base units (USDC has 6 decimals, so",
              "$0.50 → 500_000)."
            ],
            "type": "u64"
          },
          {
            "name": "requireMemo",
            "type": "bool"
          },
          {
            "name": "velocityWindowSeconds",
            "type": "u32"
          },
          {
            "name": "velocityMaxCalls",
            "type": "u32"
          },
          {
            "name": "merchantAllowlist",
            "docs": [
              "SHA-256 hashes of allowed merchants, pre-computed client-side.",
              "Empty Vec = any merchant (disabled allowlist)."
            ],
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "paymentExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          },
          {
            "name": "multisig",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "merchantHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "callsInWindow",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "policyAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Who may update / pause this policy."
            ],
            "type": "pubkey"
          },
          {
            "name": "multisig",
            "docs": [
              "The Squads multisig this policy protects."
            ],
            "type": "pubkey"
          },
          {
            "name": "perTxMaxBaseUnits",
            "docs": [
              "Max USDC per single call (base units)."
            ],
            "type": "u64"
          },
          {
            "name": "paused",
            "docs": [
              "Kill switch."
            ],
            "type": "bool"
          },
          {
            "name": "requireMemo",
            "docs": [
              "When true, every call must include a non-empty memo."
            ],
            "type": "bool"
          },
          {
            "name": "velocityWindowSeconds",
            "docs": [
              "Sliding window size (seconds)."
            ],
            "type": "u32"
          },
          {
            "name": "velocityMaxCalls",
            "docs": [
              "Max allowed calls per window."
            ],
            "type": "u32"
          },
          {
            "name": "velocityWindowStart",
            "docs": [
              "Unix timestamp of the current window's start."
            ],
            "type": "i64"
          },
          {
            "name": "velocityCallsInWindow",
            "docs": [
              "Calls accumulated inside the current window."
            ],
            "type": "u32"
          },
          {
            "name": "merchantAllowlist",
            "docs": [
              "SHA-256(hostname) for every allowed merchant. Linear scan on",
              "execute_payment — bounded by MAX_ALLOWLIST_SIZE."
            ],
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed (seeds = [b\"kyvern-policy-v1\", multisig.key()])."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "policyInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          },
          {
            "name": "multisig",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "policyPaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "policyResumed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "policy",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
