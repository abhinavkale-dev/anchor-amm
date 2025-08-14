pub use anchor_lang::prelude::*;

#[account]
pub struct AMM{
    pub seed: u64,
    pub token_x_mint: Pubkey,
    pub token_y_mint: Pubkey,
    pub lp_bump: u8,
    pub config_bump: u8,

    pub fee: u16,
    pub fee_account: Pubkey,
    pub locked: bool,
    pub authority: Pubkey,
}

impl AMM {
    pub const SPACE:usize = 8 + 32*2 + 1*2 + 2 + 1 + 32 + 32;
}