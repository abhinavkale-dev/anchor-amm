use crate::error::AnchorError;
use anchor_lang::prelude::*;
use fixed::types::I64F64;

macro_rules!  check_zero {
    ($arr:expr) => {
        if $arr.contains(&0u64) {
            return err!(AnchorError::AmountZero);
        }
    };
}

#[macro_export]
macro_rules! check_asset {
    ($da:expr, $db:expr, $A:expr, $B:expr) => {{
        let (da, db, A, B) = ($da as u128, $db as u128, $A as u128, $B as u128);
        require!(A > 0 && B > 0, AMMError::AmountZero);
        // A/(B) == (A+da)/(B+db) ->  A*(B+db) == (A+da)*B
        require!(
            A * (B + db) == (A + da) * B,
            AMMError::NotValidAsset
        );
    }};
}

#[macro_export]
macro_rules! swap_slippage_check {
    ($slippage_amount: expr, $actual_amount: expr) => {
        if $slippage_amount > $actual_amount {
            return err!(AMMError::)
        }
    };
}

pub struct LiquidityPool {

}

impl LiquidityPool {

}

pub struct SwapToken {

}

impl SwapToken {

}

pub struct WithdrawAsset {

}

impl WithdrawAsset {

}