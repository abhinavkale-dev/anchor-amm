pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

use anchor_lang::prelude::*;

declare_id!("4XqThpjUnqqeg4vESBgzexS15cjBp82jsFTcH7XzTxko");

#[program]
pub mod amm_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, seed: u64, fee: u16, authority: Option<Pubkey>) -> Result<()> {
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, max_x: u64, max_y: u64) -> Result<()> {
        Ok(())
    }

    pub fn swap(ctx: Context<Swap>, is_x: bool, amount: u64, min: u64) -> Result<()> {
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, min_x: u64, min_y: u64) -> Result<()> {
        Ok(())
    }

    pub fn lock(ctx: Context<Update>) -> Result<()> {
        Ok(())
    }

    pub fn unlock(ctx: Context<Update>) -> Result<()> {
        Ok(())
    }
}