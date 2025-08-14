use anchor_lang::prelude::*;

declare_id!("4XqThpjUnqqeg4vESBgzexS15cjBp82jsFTcH7XzTxko");

#[program]
pub mod amm_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
