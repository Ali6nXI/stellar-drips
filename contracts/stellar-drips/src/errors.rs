use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    StreamNotFound = 1,
    NotRecipient = 2,
    NotSender = 3,
    StreamInactive = 4,
    NothingToClaim = 5,
    InvalidDuration = 6,
    InvalidAmount = 7,
}
