#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env,
};

pub mod errors;
pub mod stream;

use errors::ContractError;
use stream::Stream;

#[cfg(test)]
mod test;

#[contract]
pub struct StellarDripsContract;

#[contracttype]
pub enum DataKey {
    Stream(u64),    // Mapping of stream ID to Stream
    StreamCount,    // Global counter for generating stream IDs
}

#[contractimpl]
impl StellarDripsContract {
    /// Creates a new stablecoin stream.
    /// Use case: Nigeria-first remittances (e.g., streaming USDC to a family member back home)
    /// or gig worker salaries paid continuously over time.
    pub fn create_stream(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        amount: i128,
        duration_seconds: u64,
    ) -> Result<u64, ContractError> {
        sender.require_auth();

        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }
        if duration_seconds == 0 {
            return Err(ContractError::InvalidDuration);
        }

        // Transfer funds from sender to the contract. The contract will hold the stablecoin.
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        // Generate stream ID
        let mut stream_count: u64 = env.storage().instance().get(&DataKey::StreamCount).unwrap_or(0);
        stream_count += 1;
        env.storage().instance().set(&DataKey::StreamCount, &stream_count);

        let start_time = env.ledger().timestamp();
        let end_time = start_time + duration_seconds;

        let stream = Stream {
            stream_id: stream_count,
            sender: sender.clone(),
            recipient: recipient.clone(),
            token: token.clone(),
            total_amount: amount,
            claimed_amount: 0,
            start_time,
            end_time,
            is_active: true,
        };

        // Persist the stream globally
        env.storage().persistent().set(&DataKey::Stream(stream_count), &stream);

        // Emit StreamCreated event
        env.events().publish(
            (symbol_short!("created"), sender.clone()), 
            stream_count,
        );

        Ok(stream_count)
    }

    /// Claim accrued stablecoins from the stream.
    /// Recipient can hit this periodically to draw down their remittance/salary.
    pub fn claim(env: Env, stream_id: u64) -> Result<i128, ContractError> {
        let mut stream: Stream = env
            .storage()
            .persistent()
            .get(&DataKey::Stream(stream_id))
            .ok_or(ContractError::StreamNotFound)?;

        if !stream.is_active {
            return Err(ContractError::StreamInactive);
        }

        stream.recipient.require_auth();

        let current_time = env.ledger().timestamp();
        let amount_to_claim = stream.accrued_amount(current_time);

        if amount_to_claim <= 0 {
            return Err(ContractError::NothingToClaim);
        }

        stream.claimed_amount += amount_to_claim;
        if stream.claimed_amount == stream.total_amount {
            stream.is_active = false; // Automatically close the stream if fully claimed
        }

        // Update storage
        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);

        // Transfer tokens to recipient
        let token_client = token::Client::new(&env, &stream.token);
        token_client.transfer(&env.current_contract_address(), &stream.recipient, &amount_to_claim);

        // Emit Claimed event
        env.events().publish(
            (symbol_short!("claimed"), stream.recipient.clone()), 
            amount_to_claim,
        );

        Ok(amount_to_claim)
    }

    /// Cancels a stream and refunds remaining funds to the sender.
    /// Sender stops the gig or remittance process immediately.
    pub fn cancel(env: Env, stream_id: u64) -> Result<(), ContractError> {
        let mut stream: Stream = env
            .storage()
            .persistent()
            .get(&DataKey::Stream(stream_id))
            .ok_or(ContractError::StreamNotFound)?;

        if !stream.is_active {
            return Err(ContractError::StreamInactive);
        }

        stream.sender.require_auth();

        let current_time = env.ledger().timestamp();
        let accrued = stream.accrued_amount(current_time);
        
        let remaining_funds = stream.total_amount - stream.claimed_amount - accrued;
        
        stream.is_active = false;
        
        // If there's an accrued amount, auto-claim it for the recipient
        if accrued > 0 {
            stream.claimed_amount += accrued;
            let token_client = token::Client::new(&env, &stream.token);
            token_client.transfer(&env.current_contract_address(), &stream.recipient, &accrued);
        }

        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);

        // Refund the sender the unstreamed portion
        if remaining_funds > 0 {
            let token_client = token::Client::new(&env, &stream.token);
            token_client.transfer(&env.current_contract_address(), &stream.sender, &remaining_funds);
        }

        // Emit Cancelled event
        env.events().publish(
            (symbol_short!("canceled"), stream.sender.clone()), 
            stream_id,
        );

        Ok(())
    }

    /// Read-only function to view stream details
    pub fn get_stream(env: Env, stream_id: u64) -> Result<Stream, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::Stream(stream_id))
            .ok_or(ContractError::StreamNotFound)
    }
}
