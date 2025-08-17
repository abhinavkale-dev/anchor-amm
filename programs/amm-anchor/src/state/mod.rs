use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub seed: u64,
    pub authority: Option<Pubkey>,
    pub min_x: Pubkey,
    pub min_y: Pubkey,
    pub fee: u16,
    pub locked: bool,
    pub config_bump: u8,
    pub lp_bump: u8,
}

impl Space for Config {
    const INIT_SPACE: usize = 8 + 8 + 32 + 1 + 32*2 + 2 + 1 + 1*2;
}