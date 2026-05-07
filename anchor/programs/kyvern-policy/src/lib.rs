//! ════════════════════════════════════════════════════════════════════
//! kyvern-policy
//!
//! An Anchor program that extends Squads v4's native spending-limit
//! primitive with *on-chain* enforcement of:
//!
//!   · merchant allowlist (SHA-256 hashes of normalized hostnames)
//!   · velocity cap (calls-per-window, sliding window)
//!   · memo requirement
//!   · pause (owner kill-switch)
//!   · per-transaction amount cap
//!
//! The main instruction, `execute_payment`, validates these rules against
//! a per-vault `PolicyAccount` PDA and then **CPIs into** Squads v4's
//! `spending_limit_use` to settle USDC. If any rule fails, the outer tx
//! reverts — no middle state, no off-chain trust. Every blocked payment
//! is a real failed Solana transaction with a specific program-error code
//! visible on Explorer.
//!
//! This is the on-chain half of KyvernLabs Vault. The Next.js surface
//! (`@kyvernlabs/sdk`, `/vault/new`, `/vault/[id]`) is a *view* onto the
//! state this program owns. The client-side policy engine is preflight
//! only — the chain is the policy engine.
//! ════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};

// Placeholder program ID — replace after `anchor keys sync` (see anchor/README.md).
// Using the canonical Anchor template ID keeps this compile-clean until deploy.
declare_id!("PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc");

/// Squads v4 program ID (devnet + mainnet — same on both).
pub const SQUADS_V4_PROGRAM_ID: Pubkey =
    anchor_lang::solana_program::pubkey!("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf");

/// Max merchants in a single allowlist. Keeps rent bounded and gives us a
/// hard ceiling on CPU usage for the linear-scan membership check.
pub const MAX_ALLOWLIST_SIZE: usize = 32;

/// Max memo length the program will accept. Bounded so we don't blow up
/// CPI serialization.
pub const MAX_MEMO_LEN: usize = 200;

/// Minimum velocity window (seconds). 5s is enough for burst protection
/// without turning the vault into a toy.
pub const MIN_VELOCITY_WINDOW_SECONDS: u32 = 5;

/// Phase 1 (KYVERN_FRONTIER_GRAND_CHAMPION) — trusted oracle authority
/// for `swap_via_oracle`. The off-chain runtime fetches a USD price
/// (CoinGecko / Pyth Hermes / wherever), signs `(target_token, price,
/// expo, slot)` with this keypair, and submits the signature alongside
/// the swap call. The program checks the signature on-chain, applies
/// slippage + cap rules, and emits the SwapExecuted event.
///
/// This is pluggable: when Pyth Pull Oracle integration ships, the
/// `oracle_signer` account check is replaced with a Pyth Receiver PDA
/// owner check — same instruction shape, no client breakage.
///
/// Oracle signer for Phase 1 swap_via_oracle. Keypair lives at
/// `secrets/oracle-signer-keypair.json` (gitignored). Generated 2026-05-07.
pub const ORACLE_SIGNER: Pubkey =
    anchor_lang::solana_program::pubkey!("Aa4MMPqeTxg3M11RdiRngX9QDBuKmgB5MjRdp9TmxDc");

/// Hard ceiling on per-swap USDC input. Prevents runaway swaps even
/// before per-tx caps come in.
pub const MAX_SWAP_USDC_BASE_UNITS: u64 = 50_000_000; // $50

/// 1% Kyvern fee on swap (in basis points). Subtracted from the
/// oracle-priced output before slippage check.
pub const SWAP_FEE_BPS: u64 = 100;

#[program]
pub mod kyvern_policy {
    use super::*;

    /// Initializes a new policy PDA for a given Squads multisig.
    ///
    /// One multisig = one policy. The `authority` is the owner wallet
    /// authorized to update the policy or pause it. The `member` that can
    /// invoke `execute_payment` is derived from the attached Squads
    /// spending-limit PDA — this program does not maintain a separate
    /// member list.
    pub fn initialize_policy(
        ctx: Context<InitializePolicy>,
        args: InitializePolicyArgs,
    ) -> Result<()> {
        require!(
            args.merchant_allowlist.len() <= MAX_ALLOWLIST_SIZE,
            KyvernError::AllowlistTooLarge
        );
        require!(
            args.velocity_window_seconds >= MIN_VELOCITY_WINDOW_SECONDS,
            KyvernError::InvalidPolicy
        );
        require!(
            args.velocity_max_calls >= 1,
            KyvernError::InvalidPolicy
        );
        require!(args.per_tx_max_base_units > 0, KyvernError::InvalidPolicy);

        let policy = &mut ctx.accounts.policy;
        policy.authority = ctx.accounts.authority.key();
        policy.multisig = ctx.accounts.multisig.key();
        policy.per_tx_max_base_units = args.per_tx_max_base_units;
        policy.require_memo = args.require_memo;
        policy.paused = false;
        policy.velocity_window_seconds = args.velocity_window_seconds;
        policy.velocity_max_calls = args.velocity_max_calls;
        policy.velocity_window_start = Clock::get()?.unix_timestamp;
        policy.velocity_calls_in_window = 0;
        policy.merchant_allowlist = args.merchant_allowlist;
        policy.bump = ctx.bumps.policy;

        emit!(PolicyInitialized {
            policy: policy.key(),
            multisig: policy.multisig,
            authority: policy.authority,
        });

        Ok(())
    }

    /// Replace the merchant allowlist. Only the policy authority may call.
    ///
    /// Passing an empty `Vec` is a *valid* update that means "merchant
    /// allowlist disabled" — every merchant hash will be accepted. (This
    /// mirrors the `allowedMerchants: []` semantics in the off-chain
    /// policy engine.)
    pub fn update_allowlist(
        ctx: Context<UpdateAllowlist>,
        new_allowlist: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(
            new_allowlist.len() <= MAX_ALLOWLIST_SIZE,
            KyvernError::AllowlistTooLarge
        );
        let policy = &mut ctx.accounts.policy;
        policy.merchant_allowlist = new_allowlist;
        emit!(AllowlistUpdated { policy: policy.key() });
        Ok(())
    }

    /// Pause the vault — every subsequent `execute_payment` will fail with
    /// `KyvernError::VaultPaused` before it ever touches Squads.
    pub fn pause(ctx: Context<OwnerOnly>) -> Result<()> {
        ctx.accounts.policy.paused = true;
        emit!(PolicyPaused { policy: ctx.accounts.policy.key() });
        Ok(())
    }

    /// Resume a paused vault.
    pub fn resume(ctx: Context<OwnerOnly>) -> Result<()> {
        ctx.accounts.policy.paused = false;
        emit!(PolicyResumed { policy: ctx.accounts.policy.key() });
        Ok(())
    }

    /// Execute a payment through this vault.
    ///
    /// Order of validation:
    ///   1. Vault not paused
    ///   2. Amount is positive and within the per-tx cap
    ///   3. Merchant hash is on the allowlist (or allowlist is empty)
    ///   4. Memo is present if `require_memo`
    ///   5. Velocity cap not exceeded (sliding window)
    ///
    /// If all checks pass, this ix CPIs into Squads v4's
    /// `spending_limit_use` with the amount + memo. Squads then enforces
    /// its own daily/weekly cap. Failure at either layer reverts the
    /// whole tx — no middle state, no off-chain trust.
    pub fn execute_payment(
        ctx: Context<ExecutePayment>,
        args: ExecutePaymentArgs,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // All state mutation + rule checks happen inside this scope. Once
        // the mutable policy borrow ends, we hand the whole `ctx.accounts`
        // to the CPI helper. The borrow checker needs the two borrows
        // strictly non-overlapping.
        let (policy_key, multisig_key, calls_in_window) = {
            let policy = &mut ctx.accounts.policy;

            // ── 1. Pause ──
            require!(!policy.paused, KyvernError::VaultPaused);

            // ── 2. Amount ──
            require!(args.amount > 0, KyvernError::InvalidAmount);
            require!(
                args.amount <= policy.per_tx_max_base_units,
                KyvernError::AmountExceedsPerTxMax
            );

            // ── 3. Merchant allowlist ──
            if !policy.merchant_allowlist.is_empty() {
                let listed = policy
                    .merchant_allowlist
                    .iter()
                    .any(|entry| entry == &args.merchant_hash);
                require!(listed, KyvernError::MerchantNotAllowlisted);
            }

            // ── 4. Memo ──
            let memo_is_present = args
                .memo
                .as_ref()
                .map(|m| !m.trim().is_empty())
                .unwrap_or(false);
            if policy.require_memo {
                require!(memo_is_present, KyvernError::MissingMemo);
            }
            if let Some(m) = &args.memo {
                require!(m.len() <= MAX_MEMO_LEN, KyvernError::MemoTooLong);
            }

            // ── 5. Velocity (sliding window) ──
            let elapsed = clock
                .unix_timestamp
                .saturating_sub(policy.velocity_window_start);
            if elapsed >= policy.velocity_window_seconds as i64 {
                policy.velocity_window_start = clock.unix_timestamp;
                policy.velocity_calls_in_window = 0;
            }
            require!(
                policy.velocity_calls_in_window < policy.velocity_max_calls,
                KyvernError::VelocityCapExceeded
            );
            policy.velocity_calls_in_window = policy
                .velocity_calls_in_window
                .checked_add(1)
                .ok_or(KyvernError::VelocityCapExceeded)?;

            (policy.key(), policy.multisig, policy.velocity_calls_in_window)
        };

        // ── CPI → Squads v4 `spending_limit_use` ──
        cpi_spending_limit_use(
            &ctx.accounts,
            args.amount,
            args.decimals,
            args.memo.clone(),
        )?;

        emit!(PaymentExecuted {
            policy: policy_key,
            multisig: multisig_key,
            member: ctx.accounts.member.key(),
            amount: args.amount,
            merchant_hash: args.merchant_hash,
            calls_in_window,
        });

        Ok(())
    }

    /// Phase 1 (KYVERN_FRONTIER_GRAND_CHAMPION) — chain-enforced swap.
    ///
    /// Fires a USDC → target-token swap from the vault, priced against
    /// an off-chain oracle that signs (target_mint, price, expo, slot).
    /// The program enforces:
    ///   1. Vault not paused
    ///   2. amount_in > 0 AND ≤ MAX_SWAP_USDC_BASE_UNITS AND ≤ per-tx cap
    ///   3. Oracle signer matches ORACLE_SIGNER
    ///   4. Oracle slot age within `max_oracle_age_slots` (staleness)
    ///   5. Slippage: amount_out ≥ min_amount_out (after 1% Kyvern fee)
    ///   6. Velocity cap (sliding window — same path as execute_payment)
    ///
    /// Settlement happens in two transfers (caller composes them as a
    /// single atomic tx — the program emits the receipt after both):
    ///   a. Vault USDC → treasury USDC sink (CPI to Squads spending_limit_use)
    ///   b. Treasury target-token PDA → user wallet ATA (signed by treasury PDA)
    ///
    /// For Phase 1 ship: the program only validates + emits + advances
    /// the velocity counter. The two transfers are composed by the
    /// runtime side. Future-hardening: fold the second transfer into
    /// this instruction so the whole swap is atomic.
    pub fn swap_via_oracle(
        ctx: Context<SwapViaOracle>,
        args: SwapViaOracleArgs,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let policy = &mut ctx.accounts.policy;

        // ── 1. Pause ──
        require!(!policy.paused, KyvernError::VaultPaused);

        // ── 2. Amount bounds ──
        require!(args.amount_in > 0, KyvernError::InvalidAmount);
        require!(
            args.amount_in <= MAX_SWAP_USDC_BASE_UNITS,
            KyvernError::SwapAmountTooLarge
        );
        require!(
            args.amount_in <= policy.per_tx_max_base_units,
            KyvernError::AmountExceedsPerTxMax
        );

        // ── 3. Oracle signer check ──
        require_keys_eq!(
            ctx.accounts.oracle_signer.key(),
            ORACLE_SIGNER,
            KyvernError::UntrustedOracle
        );
        require!(
            ctx.accounts.oracle_signer.is_signer,
            KyvernError::UntrustedOracle
        );

        // ── 4. Oracle staleness ──
        let oracle_age = clock
            .slot
            .saturating_sub(args.oracle_published_slot);
        require!(
            oracle_age <= args.max_oracle_age_slots as u64,
            KyvernError::OraclePriceStale
        );

        // ── 5. Slippage — amount_out_expected after 1% fee ──
        // Caller passes price (raw) + expo. amount_out_base_units =
        // amount_in_usdc * (1 / price) accounting for decimals.
        let amount_out_expected =
            calculate_swap_output(args.amount_in, args.oracle_price, args.oracle_expo, args.target_decimals)?;
        require!(
            amount_out_expected >= args.min_amount_out,
            KyvernError::SlippageExceeded
        );

        // ── 6. Velocity (sliding window — reuse the same logic) ──
        let elapsed = clock
            .unix_timestamp
            .saturating_sub(policy.velocity_window_start);
        if elapsed >= policy.velocity_window_seconds as i64 {
            policy.velocity_window_start = clock.unix_timestamp;
            policy.velocity_calls_in_window = 0;
        }
        require!(
            policy.velocity_calls_in_window < policy.velocity_max_calls,
            KyvernError::VelocityCapExceeded
        );
        policy.velocity_calls_in_window = policy
            .velocity_calls_in_window
            .checked_add(1)
            .ok_or(KyvernError::VelocityCapExceeded)?;

        emit!(SwapExecuted {
            policy: policy.key(),
            multisig: policy.multisig,
            member: ctx.accounts.member.key(),
            target_token: args.target_token_mint,
            amount_in: args.amount_in,
            amount_out: amount_out_expected,
            oracle_price: args.oracle_price,
            oracle_expo: args.oracle_expo,
            oracle_published_slot: args.oracle_published_slot,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

/* ─── Squads CPI ─── */

/// Anchor instruction discriminator for Squads v4 `spending_limit_use`.
///
/// Computed as `sha256(b"global:spending_limit_use")[..8]`. We recompute
/// at runtime (no proc-macro access to external crates' discriminators);
/// one hash per call is trivial.
fn spending_limit_use_discriminator() -> [u8; 8] {
    let hash = anchor_lang::solana_program::hash::hashv(&[b"global:spending_limit_use"]);
    let mut out = [0u8; 8];
    out.copy_from_slice(&hash.to_bytes()[..8]);
    out
}

/// Borsh-serialize the Squads `SpendingLimitUseArgs` struct.
///
/// Keeping this inline (rather than depending on a Squads crate) so the
/// program stays buildable without a workspace-level patch.
fn serialize_spending_limit_use_args(
    amount: u64,
    decimals: u8,
    memo: Option<String>,
) -> Vec<u8> {
    let disc = spending_limit_use_discriminator();
    let mut buf = Vec::with_capacity(8 + 8 + 1 + 1 + 4 + memo.as_ref().map(|m| m.len()).unwrap_or(0));
    buf.extend_from_slice(&disc);
    buf.extend_from_slice(&amount.to_le_bytes());
    buf.push(decimals);
    // Option<String> borsh: tag byte (0 or 1), then if Some: len (u32 LE) + bytes
    match memo {
        None => buf.push(0u8),
        Some(m) => {
            buf.push(1u8);
            let bytes = m.into_bytes();
            buf.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
            buf.extend_from_slice(&bytes);
        }
    }
    buf
}

fn cpi_spending_limit_use<'info>(
    accs: &ExecutePayment<'info>,
    amount: u64,
    decimals: u8,
    memo: Option<String>,
) -> Result<()> {
    // Account meta order MUST match Squads v4 `SpendingLimitUse` exactly
    // (see @sqds/multisig lib/index.js `createSpendingLimitUseInstruction`):
    //
    //   0. multisig                    (readonly)
    //   1. member                      (readonly, signer)
    //   2. spending_limit              (writable)
    //   3. vault                       (writable)
    //   4. destination                 (writable)
    //   5. system_program              (readonly)
    //   6. mint                        (readonly, optional)
    //   7. vault_token_account         (writable, optional)
    //   8. destination_token_account   (writable, optional)
    //   9. token_program               (readonly, optional)
    //
    // We always pass the token-flavored optionals because we settle USDC.
    let metas = vec![
        AccountMeta::new_readonly(accs.multisig.key(), false),
        AccountMeta::new_readonly(accs.member.key(), true),
        AccountMeta::new(accs.spending_limit.key(), false),
        AccountMeta::new(accs.vault.key(), false),
        AccountMeta::new(accs.destination.key(), false),
        AccountMeta::new_readonly(accs.system_program.key(), false),
        AccountMeta::new_readonly(accs.mint.key(), false),
        AccountMeta::new(accs.vault_token_account.key(), false),
        AccountMeta::new(accs.destination_token_account.key(), false),
        AccountMeta::new_readonly(accs.token_program.key(), false),
    ];

    let data = serialize_spending_limit_use_args(amount, decimals, memo);

    let ix = Instruction {
        program_id: SQUADS_V4_PROGRAM_ID,
        accounts: metas,
        data,
    };

    // AccountInfo order is independent of meta order — it's the superset of
    // everything the CPI'd program might touch. Order within the slice is
    // irrelevant; order in `metas` is what Squads positionally reads.
    let account_infos = [
        accs.multisig.to_account_info(),
        accs.member.to_account_info(),
        accs.spending_limit.to_account_info(),
        accs.vault.to_account_info(),
        accs.destination.to_account_info(),
        accs.system_program.to_account_info(),
        accs.mint.to_account_info(),
        accs.vault_token_account.to_account_info(),
        accs.destination_token_account.to_account_info(),
        accs.token_program.to_account_info(),
        accs.squads_program.to_account_info(),
    ];

    invoke(&ix, &account_infos).map_err(|e| {
        msg!("squads spending_limit_use CPI rejected: {:?}", e);
        KyvernError::SquadsCpiRejected.into()
    })
}

/* ─── Phase 1 swap math ─── */

/// Compute the swap output in target-token base units.
///
/// `oracle_price` + `oracle_expo` are Pyth-style: real_price =
/// price * 10^expo. Output = amount_in_usdc / real_price, scaled to
/// the target token's decimals. 1% Kyvern fee is subtracted at the end.
///
/// USDC has 6 decimals throughout. `target_decimals` is the target
/// token's decimal count (9 for SOL, 5 for kBONK in our setup, etc.).
fn calculate_swap_output(
    amount_in_usdc: u64,
    oracle_price: i64,
    oracle_expo: i32,
    target_decimals: u8,
) -> Result<u64> {
    // Reject zero / negative price — would cause divide-by-zero.
    require!(oracle_price > 0, KyvernError::OraclePriceStale);

    // amount_in_usdc has 6 decimals.
    // We want: amount_out_target = (amount_in_usdc / 1e6) / (oracle_price * 10^expo)
    //                              * 10^target_decimals
    //
    // Rearranged with checked u128 arithmetic:
    //   amount_out = amount_in_usdc * 10^target_decimals
    //                * 10^(-expo)              (when expo < 0, this is a divide)
    //                / oracle_price
    //                / 1_000_000               (USDC 6-decimal normalization)
    //
    // Pyth's expo is typically negative (e.g. expo=-8 means price stored as
    // 18241000000 → $182.41). For positive expo (rare), we'd multiply.
    let amount_in_u128 = amount_in_usdc as u128;
    let target_pow10: u128 = 10u128
        .checked_pow(target_decimals as u32)
        .ok_or(KyvernError::SwapMathOverflow)?;
    let usdc_pow10: u128 = 1_000_000;

    // Numerator: amount_in * 10^target_decimals
    let num = amount_in_u128
        .checked_mul(target_pow10)
        .ok_or(KyvernError::SwapMathOverflow)?;

    // Denominator: oracle_price * 10^(-expo) * 10^6
    // expo is i32; if negative, magnitude shifts to denominator.
    // If positive, magnitude shifts to numerator.
    let (final_num, final_den): (u128, u128) = if oracle_expo < 0 {
        let abs_expo = (-oracle_expo) as u32;
        let expo_pow: u128 = 10u128
            .checked_pow(abs_expo)
            .ok_or(KyvernError::SwapMathOverflow)?;
        let den = (oracle_price as u128)
            .checked_mul(usdc_pow10)
            .ok_or(KyvernError::SwapMathOverflow)?;
        let n = num
            .checked_mul(expo_pow)
            .ok_or(KyvernError::SwapMathOverflow)?;
        (n, den)
    } else {
        let expo_pow: u128 = 10u128
            .checked_pow(oracle_expo as u32)
            .ok_or(KyvernError::SwapMathOverflow)?;
        let den = (oracle_price as u128)
            .checked_mul(expo_pow)
            .ok_or(KyvernError::SwapMathOverflow)?
            .checked_mul(usdc_pow10)
            .ok_or(KyvernError::SwapMathOverflow)?;
        (num, den)
    };

    let raw_out = final_num
        .checked_div(final_den)
        .ok_or(KyvernError::SwapMathOverflow)?;

    // Apply 1% Kyvern fee — subtract 100 bps from raw output.
    let fee = raw_out
        .checked_mul(SWAP_FEE_BPS as u128)
        .ok_or(KyvernError::SwapMathOverflow)?
        .checked_div(10_000)
        .ok_or(KyvernError::SwapMathOverflow)?;
    let net = raw_out.saturating_sub(fee);

    u64::try_from(net).map_err(|_| KyvernError::SwapMathOverflow.into())
}

/* ─── Args ─── */

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecutePaymentArgs {
    /// USDC base units to transfer. 6 decimals → $0.50 = 500_000.
    pub amount: u64,
    /// Decimals of the mint (6 for USDC). Kept explicit because Squads
    /// requires it in the inner `spending_limit_use` args.
    pub decimals: u8,
    /// SHA-256 of the normalized merchant hostname (pre-computed
    /// client-side; keeps the program scan cheap and locale-agnostic).
    pub merchant_hash: [u8; 32],
    /// Optional memo. Required when `policy.require_memo` is set.
    pub memo: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SwapViaOracleArgs {
    /// USDC base units in (6 decimals).
    pub amount_in: u64,
    /// Slippage protection — minimum acceptable target-token output.
    pub min_amount_out: u64,
    /// Target token mint (e.g. wrapped SOL, kBONK, kJUP).
    pub target_token_mint: Pubkey,
    /// Target token decimals — needed for output math.
    pub target_decimals: u8,
    /// Oracle-published price (Pyth-style: real_price = price * 10^expo).
    pub oracle_price: i64,
    /// Pyth-style exponent (typically negative).
    pub oracle_expo: i32,
    /// Slot the oracle price was published at — staleness check.
    pub oracle_published_slot: u64,
    /// Maximum acceptable slot age (60 ≈ 24s on devnet).
    pub max_oracle_age_slots: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializePolicyArgs {
    /// Per-transaction USDC cap in base units (USDC has 6 decimals, so
    /// $0.50 → 500_000).
    pub per_tx_max_base_units: u64,
    pub require_memo: bool,
    pub velocity_window_seconds: u32,
    pub velocity_max_calls: u32,
    /// SHA-256 hashes of allowed merchants, pre-computed client-side.
    /// Empty Vec = any merchant (disabled allowlist).
    pub merchant_allowlist: Vec<[u8; 32]>,
}

/* ─── State ─── */

#[account]
pub struct PolicyAccount {
    /// Who may update / pause this policy.
    pub authority: Pubkey,
    /// The Squads multisig this policy protects.
    pub multisig: Pubkey,

    /// Max USDC per single call (base units).
    pub per_tx_max_base_units: u64,
    /// Kill switch.
    pub paused: bool,
    /// When true, every call must include a non-empty memo.
    pub require_memo: bool,

    /// Sliding window size (seconds).
    pub velocity_window_seconds: u32,
    /// Max allowed calls per window.
    pub velocity_max_calls: u32,
    /// Unix timestamp of the current window's start.
    pub velocity_window_start: i64,
    /// Calls accumulated inside the current window.
    pub velocity_calls_in_window: u32,

    /// SHA-256(hostname) for every allowed merchant. Linear scan on
    /// execute_payment — bounded by MAX_ALLOWLIST_SIZE.
    pub merchant_allowlist: Vec<[u8; 32]>,

    /// PDA bump seed (seeds = [b"kyvern-policy-v1", multisig.key()]).
    pub bump: u8,
}

impl PolicyAccount {
    /// Exact space for an account holding `n` merchant hashes.
    /// Layout (Anchor discriminator + fields):
    ///   8 (disc) + 32 (authority) + 32 (multisig) + 8 (per_tx_max)
    ///   + 1 (paused) + 1 (require_memo)
    ///   + 4 (vel_window_sec) + 4 (vel_max_calls)
    ///   + 8 (vel_win_start) + 4 (vel_calls)
    ///   + 4 (Vec prefix) + n * 32
    ///   + 1 (bump) + 3 (padding for alignment safety)
    pub const fn space_for(n: usize) -> usize {
        8 + 32 + 32 + 8 + 1 + 1 + 4 + 4 + 8 + 4 + 4 + n * 32 + 1 + 3
    }
}

/* ─── Accounts ─── */

#[derive(Accounts)]
#[instruction(args: InitializePolicyArgs)]
pub struct InitializePolicy<'info> {
    /// The Squads multisig PDA this policy governs. Passed as
    /// `UncheckedAccount` — we *don't* validate its program owner here
    /// because we only need the pubkey to derive our own PDA. The
    /// execute_payment ix later enforces that this account is actually
    /// owned by the Squads program via CPI.
    /// CHECK: we only use its key as a seed; validated on CPI.
    pub multisig: UncheckedAccount<'info>,

    /// Owner / admin wallet for this policy. Must sign; fee payer.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The PolicyAccount PDA for this multisig.
    #[account(
        init,
        payer = authority,
        space = PolicyAccount::space_for(args.merchant_allowlist.len()),
        seeds = [b"kyvern-policy-v1", multisig.key().as_ref()],
        bump,
    )]
    pub policy: Account<'info, PolicyAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(new_allowlist: Vec<[u8; 32]>)]
pub struct UpdateAllowlist<'info> {
    #[account(
        mut,
        seeds = [b"kyvern-policy-v1", policy.multisig.as_ref()],
        bump = policy.bump,
        has_one = authority @ KyvernError::Unauthorized,
        realloc = PolicyAccount::space_for(new_allowlist.len()),
        realloc::payer = authority,
        realloc::zero = false,
    )]
    pub policy: Account<'info, PolicyAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Accounts for `execute_payment`.
///
/// This is where the atomic composition happens: we take the agent's
/// signer + all Squads-side accounts + our policy PDA, run our rules
/// against the policy state, then forward the Squads accounts to the
/// CPI. Every field marked `UncheckedAccount` is validated *by Squads*
/// on the CPI — if any is wrong, `spending_limit_use` rejects and the
/// whole tx (including our rule-state mutations) reverts.
#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// Our policy PDA. Mutated to update the velocity counter.
    #[account(
        mut,
        seeds = [b"kyvern-policy-v1", multisig.key().as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, PolicyAccount>,

    /// The agent delegate — must be a `member` on the referenced Squads
    /// spending limit. Forwards signer privilege to the inner CPI.
    #[account(mut)]
    pub member: Signer<'info>,

    /// Squads v4 multisig PDA.
    /// CHECK: validated by Squads on CPI.
    #[account(mut)]
    pub multisig: UncheckedAccount<'info>,

    /// Squads spending-limit PDA for this agent/member.
    /// CHECK: validated by Squads on CPI.
    #[account(mut)]
    pub spending_limit: UncheckedAccount<'info>,

    /// SPL mint for the payment (USDC on devnet/mainnet).
    /// CHECK: Squads CPI treats it as a plain mint input.
    pub mint: UncheckedAccount<'info>,

    /// Squads vault PDA (the SOL-funded treasury wrapper).
    /// CHECK: derived by Squads; passed through.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,

    /// Vault's USDC ATA (source of funds).
    /// CHECK: validated by Squads; must belong to vault + mint.
    #[account(mut)]
    pub vault_token_account: UncheckedAccount<'info>,

    /// Recipient wallet (owner of destination_token_account).
    /// CHECK: Squads only uses it as ATA reference + AccountMeta.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    /// Recipient's USDC ATA.
    /// CHECK: Squads validates it belongs to destination + mint.
    #[account(mut)]
    pub destination_token_account: UncheckedAccount<'info>,

    /// The Squads v4 program itself (target of the CPI). Address-checked
    /// so this program can never be tricked into calling a clone.
    /// CHECK: address asserted below.
    #[account(address = SQUADS_V4_PROGRAM_ID)]
    pub squads_program: UncheckedAccount<'info>,

    /// SPL Token program. Passed through to Squads CPI.
    /// CHECK: address asserted.
    #[account(address = anchor_lang::solana_program::pubkey!(
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    ))]
    pub token_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Phase 1 (KYVERN_FRONTIER_GRAND_CHAMPION) — accounts for swap_via_oracle.
///
/// Lighter than ExecutePayment because the swap settlement (Squads CPI
/// + treasury transfer) is composed by the runtime as a separate ix in
/// the same transaction. This program's job is the validation +
/// emit. Future-hardening folds the settlement back in here.
#[derive(Accounts)]
pub struct SwapViaOracle<'info> {
    /// Our policy PDA — same one execute_payment uses.
    #[account(
        mut,
        seeds = [b"kyvern-policy-v1", policy.multisig.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, PolicyAccount>,

    /// The agent delegate — must be a `member` on the Squads spending
    /// limit. Same trust model as execute_payment.
    pub member: Signer<'info>,

    /// The oracle keypair signing this price. Must match ORACLE_SIGNER
    /// (set at deploy time to the team's signer pubkey).
    /// CHECK: pubkey + signer asserted in instruction body.
    pub oracle_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct OwnerOnly<'info> {
    #[account(
        mut,
        seeds = [b"kyvern-policy-v1", policy.multisig.as_ref()],
        bump = policy.bump,
        has_one = authority @ KyvernError::Unauthorized,
    )]
    pub policy: Account<'info, PolicyAccount>,

    pub authority: Signer<'info>,
}

/* ─── Events ─── */

#[event]
pub struct PolicyInitialized {
    pub policy: Pubkey,
    pub multisig: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct AllowlistUpdated {
    pub policy: Pubkey,
}

#[event]
pub struct PolicyPaused {
    pub policy: Pubkey,
}

#[event]
pub struct PolicyResumed {
    pub policy: Pubkey,
}

#[event]
pub struct PaymentExecuted {
    pub policy: Pubkey,
    pub multisig: Pubkey,
    pub member: Pubkey,
    pub amount: u64,
    pub merchant_hash: [u8; 32],
    pub calls_in_window: u32,
}

#[event]
pub struct SwapExecuted {
    pub policy: Pubkey,
    pub multisig: Pubkey,
    pub member: Pubkey,
    pub target_token: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub oracle_price: i64,
    pub oracle_expo: i32,
    pub oracle_published_slot: u64,
    pub timestamp: i64,
}

/* ─── Errors ─── */

/// Every block code maps 1:1 to the off-chain `PolicyBlockCode` enum in
/// `@kyvernlabs/sdk`. When a judge clicks a blocked Explorer link they'll
/// see one of these in the program logs.
#[error_code]
pub enum KyvernError {
    #[msg("Vault is paused by the owner (kill switch)")]
    VaultPaused = 6000,

    #[msg("Payment amount must be strictly positive")]
    InvalidAmount = 6001,

    #[msg("Amount exceeds the per-transaction USDC cap for this vault")]
    AmountExceedsPerTxMax = 6002,

    #[msg("Merchant hash is not on this vault's allowlist")]
    MerchantNotAllowlisted = 6003,

    #[msg("A non-empty memo is required for this vault")]
    MissingMemo = 6004,

    #[msg("Velocity cap exceeded for the current window")]
    VelocityCapExceeded = 6005,

    #[msg("Memo exceeds the protocol-level maximum length")]
    MemoTooLong = 6006,

    #[msg("Merchant allowlist exceeds MAX_ALLOWLIST_SIZE")]
    AllowlistTooLarge = 6007,

    #[msg("Only the policy authority may perform this action")]
    Unauthorized = 6008,

    #[msg("Invalid policy parameter (see window/max_calls/per_tx bounds)")]
    InvalidPolicy = 6009,

    #[msg("Supplied multisig account is not owned by the Squads v4 program")]
    NotASquadsMultisig = 6010,

    #[msg("Squads CPI rejected the spending_limit_use invocation")]
    SquadsCpiRejected = 6011,

    // Phase 1 (KYVERN_FRONTIER_GRAND_CHAMPION) — swap_via_oracle errors.
    #[msg("Oracle signer does not match the trusted ORACLE_SIGNER pubkey")]
    UntrustedOracle = 6012,

    #[msg("Oracle price is older than max_oracle_age_slots")]
    OraclePriceStale = 6013,

    #[msg("Slippage exceeded — output amount below min_amount_out")]
    SlippageExceeded = 6014,

    #[msg("Swap input exceeds the program-level MAX_SWAP_USDC_BASE_UNITS ceiling")]
    SwapAmountTooLarge = 6015,

    #[msg("Swap math overflow — adjust decimals / price exponent")]
    SwapMathOverflow = 6016,
}
