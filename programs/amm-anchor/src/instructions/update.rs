use anchor_lang::prelude::*;
use create::{state::Config, error::AMMError};


#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut, 
        seeds = [b"update", config.seed.to_le_bytes.as_ref()],
        bump = config.config_bump
    )]
    pub config: Account<'info, Config>
}

impl<'info> Update<'info> {
    pub fn lock(&mut self) {
        require!(self.config.authority == Some(self.user.key()), AmmError::InvalidAuthority);
        self.config.locked = true;
        Ok(())
    }

    pub fn unlock(&mut self) {
        require!(self.config.authority == Some(self.user.key()), AMMError::InvalidAuthority);
        self.config.locked = false;
        Ok(())
    }
}