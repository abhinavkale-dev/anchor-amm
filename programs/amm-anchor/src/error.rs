use anchor_lang::prelude::*;
use constant_product_curve::CurveError;

#[error_code]
pub enum AMMError {
    #[msg("This pool is locked")]
    PoolLocked,
    #[msg("Invalid Amount")]
    InvalidAmount,
    #[msg("Slippage Exceeded")]
    SlippageExceeded,
    #[msg("Overflow Detected")]
    Overflow,
    #[msg("Underflow Detected")]
    Underflow,
    #[msg("Invalid Authority")]
    InvalidAuthority,
    #[msg("Invalid Precision")]
    InvalidPrecision,
    #[msg("Insufficient Balance")]
    InsufficientBalance,
    #[msg("Zero Balance")]
    ZeroBalance
}

impl From<CurveError> for AMMError {
    fn from(error: CurveError) -> AmmError {
        match error {
            CurveError::InvalidPrecision      => AmmError::InvalidPrecision,
            CurveError::Overflow              => AmmError::Overflow,
            CurveError::Underflow             => AmmError::Underflow,
            CurveError::InvalidFeeAmount      => AmmError::InvalidFee,
            CurveError::InsufficientBalance   => AmmError::Insufficientbalance,
            CurveError::ZeroBalance           => AmmError::ZeroBalance,
            CurveError::SlippageLimitExceeded => AmmError::SlippageExceded,
        }
    }
}