use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stream {
    pub stream_id: u64,
    pub sender: Address,
    pub recipient: Address, // Recipient: e.g., family living in Nigeria or gig worker
    pub token: Address,     // Stablecoin address like cNGN or USDC
    pub total_amount: i128,
    pub claimed_amount: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub is_active: bool,
}

impl Stream {
    /// Calculates the accrued amount that the recipient can claim based on the current ledger time.
    /// This supports the core function of continuous micro-disbursements and transparent remittances.
    pub fn accrued_amount(&self, current_time: u64) -> i128 {
        if current_time <= self.start_time {
            return 0;
        }
        
        if current_time >= self.end_time {
            return (self.total_amount - self.claimed_amount).max(0);
        }

        // Calculate proportional amount using saturating/checked math (Stellar handles u64->i128 seamlessly but good to be careful)
        let elapsed = (current_time - self.start_time) as i128;
        let total_duration = (self.end_time - self.start_time) as i128;
        
        let total_accrued = (self.total_amount * elapsed) / total_duration;
        (total_accrued - self.claimed_amount).max(0)
    }
}
