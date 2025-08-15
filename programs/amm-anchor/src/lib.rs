use anchor_lang::prelude::*;

declare_id!("4XqThpjUnqqeg4vESBgzexS15cjBp82jsFTcH7XzTxko");

pub mod constant;
pub mod errors;
pub mod helper;
pub mod instructions;
pub mod state;

use instruction::*;

#[program]
pub mod amm_anchor {
    use super::*;

    pub fn initialize(ctx: Context<InitializePool>, seed: u64) -> Result<()> {
        ctx.accounts.init_pool(ctx.bumps, seed)?;
        Ok(())
    }

    pub fn deposit_asset(ctx: Context<DepositAsset>, amount_a: u64, amount_b: u64) -> Result<()> {
        ctx.accounts.deposit(amount_a, amount_b)?;
        Ok(())
    }

    pub fn swap(ctx: Context<Swap>, is_a: bool, amount: u64, min_slippage: u64) -> Result<()> {
        ctx.accounts.swap(is_a, amount, min_slippage)?;
        Ok(())
    }

    pub fn withdraw_asset(ctx: Context<Withdraw>, lp_amount: u64) -> Result<()> {
        ctx.accounts.withdraw(lp_amount)?;
        Ok(())
    }
}
