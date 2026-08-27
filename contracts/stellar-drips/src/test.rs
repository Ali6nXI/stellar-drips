#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};

/// Helper: create a stream and return (env, stream_id, sender, recipient, token)
fn setup_stream(
    env: &Env,
    amount: i128,
    duration_seconds: u64,
) -> (u64, Address, Address, Address) {
    let sender = Address::generate(env);
    let recipient = Address::generate(env);
    let token = Address::generate(env);
    let contract = env.register(StellarDripsContract, ());

    // Advance ledger so start_time > 0
    env.ledger().set_timestamp(1000);

    let stream_id = contract.create_stream(
        env,
        sender.clone(),
        recipient.clone(),
        token.clone(),
        amount,
        duration_seconds,
    );
    (stream_id, sender, recipient, token)
}

// ==================================================================
// Accrual Math Tests
// ==================================================================

#[test]
fn test_claim_at_start() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 1000i128;
    let duration = 100u64; // 100 seconds

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Claim immediately at t=1000 (start_time)
    let claimed = StellarDripsContract::claim(env, stream_id);
    assert_eq!(claimed.unwrap(), 0);
}

#[test]
fn test_claim_halfway() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 1000i128;
    let duration = 100u64;

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Advance to 50% of duration: start=1000, half=1050
    env.ledger().set_timestamp(1050);

    let claimed = StellarDripsContract::claim(env, stream_id);
    // 50% of 1000 = 500
    assert_eq!(claimed.unwrap(), 500);
}

#[test]
fn test_claim_at_end() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 1000i128;
    let duration = 100u64;

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Advance exactly to end_time: start=1000, end=1100
    env.ledger().set_timestamp(1100);

    let claimed = StellarDripsContract::claim(env, stream_id);
    assert_eq!(claimed.unwrap(), 1000);
}

#[test]
fn test_claim_after_end() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 1000i128;
    let duration = 100u64;

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Advance well past end_time
    env.ledger().set_timestamp(1200);

    let claimed = StellarDripsContract::claim(env, stream_id);
    // Should cap at total_amount (1000), not overflow
    assert_eq!(claimed.unwrap(), 1000);
}

#[test]
fn test_claim_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 1000i128;
    let duration = 100u64;

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // First claim at 25%: start=1000, 25%=1025
    env.ledger().set_timestamp(1025);
    let first_claim = StellarDripsContract::claim(env, stream_id);
    assert_eq!(first_claim.unwrap(), 250);

    // Second claim at 75%: additional 50% accrued
    env.ledger().set_timestamp(1075);
    let second_claim = StellarDripsContract::claim(env, stream_id);
    // Total accrued at 75% = 750, minus 250 already claimed = 500
    assert_eq!(second_claim.unwrap(), 500);
}

#[test]
fn test_nothing_to_claim() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 1000i128;
    let duration = 100u64;

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Claim everything at end
    env.ledger().set_timestamp(1100);
    let first = StellarDripsContract::claim(env, stream_id);
    assert_eq!(first.unwrap(), 1000);

    // Try claiming again immediately — should return NothingToClaim error
    let second = StellarDripsContract::claim(env, stream_id);
    assert!(second.is_err());
}

#[test]
fn test_claim_cancelled_stream() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 1000i128;
    let duration = 100u64;

    let (stream_id, sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Cancel the stream first
    env.ledger().set_timestamp(1050);
    StellarDripsContract::cancel(env, stream_id);

    // Try claiming on cancelled stream — should return StreamInactive error
    let result = StellarDripsContract::claim(env, stream_id);
    assert!(result.is_err());
}

// ==================================================================
// Edge Cases
// ==================================================================

#[test]
fn test_claim_with_odd_duration_and_amount() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 7i128; // Prime amount
    let duration = 13u64; // Prime duration

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Claim at exactly 1 second in
    env.ledger().set_timestamp(1001);
    let claimed = StellarDripsContract::claim(env, stream_id);
    // (7 * 1) / 13 = 0 (integer division truncates toward zero)
    assert_eq!(claimed.unwrap(), 0);

    // Advance to 7 seconds in
    env.ledger().set_timestamp(1007);
    let claimed2 = StellarDripsContract::claim(env, stream_id);
    // (7 * 7) / 13 = 49/13 = 3
    assert_eq!(claimed2.unwrap(), 3);
}

#[test]
fn test_claim_zero_amount_stream() {
    let env = Env::default();
    env.mock_all_auths();
    // Stream with 0 amount should not be creatable
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);
    let contract = env.register(StellarDripsContract, ());
    env.ledger().set_timestamp(1000);

    let result = contract.create_stream(
        &env,
        sender.clone(),
        recipient.clone(),
        token.clone(),
        0,   // zero amount
        100,
    );
    assert!(result.is_err());
}

#[test]
fn test_claim_after_full_claim_auto_closes() {
    let env = Env::default();
    env.mock_all_auths();
    let amount = 500i128;
    let duration = 50u64;

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Claim full amount at end
    env.ledger().set_timestamp(1050);
    let claimed = StellarDripsContract::claim(env, stream_id);
    assert_eq!(claimed.unwrap(), 500);

    // Stream should now be inactive (auto-closed when fully claimed)
    // Verify by trying to claim again — should fail
    let second = StellarDripsContract::claim(env, stream_id);
    assert!(second.is_err());
}

#[test]
fn test_accrued_amount_before_start() {
    let env = Env::default();
    env.mock_all_auths();

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);

    let start_time = 5000u64;
    let end_time = 6000u64;
    let stream = Stream {
        stream_id: 1,
        sender,
        recipient,
        token,
        total_amount: 1000,
        claimed_amount: 0,
        start_time,
        end_time,
        is_active: true,
    };

    // Before start time — should return 0
    let accrued = stream.accrued_amount(4000);
    assert_eq!(accrued, 0);
}

#[test]
fn test_accrued_amount_after_end() {
    let env = Env::default();

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);

    let stream = Stream {
        stream_id: 1,
        sender,
        recipient,
        token,
        total_amount: 2000,
        claimed_amount: 500,
        start_time: 1000,
        end_time: 2000,
        is_active: true,
    };

    // After end, should return total - claimed = 1500
    let accrued = stream.accrued_amount(3000);
    assert_eq!(accrued, 1500);
}

#[test]
fn test_accrued_amount_mid_stream_with_partial_claim() {
    let env = Env::default();

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);

    let stream = Stream {
        stream_id: 1,
        sender,
        recipient,
        token,
        total_amount: 1000,
        claimed_amount: 300,
        start_time: 1000,
        end_time: 2000,
        is_active: true,
    };

    // At t=1500 (50% through), total accrued = 500, unclaimed = 500 - 300 = 200
    let accrued = stream.accrued_amount(1500);
    assert_eq!(accrued, 200);
}

#[test]
fn test_accrued_amount_exact_start() {
    let env = Env::default();

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token = Address::generate(&env);

    let stream = Stream {
        stream_id: 1,
        sender,
        recipient,
        token,
        total_amount: 500,
        claimed_amount: 0,
        start_time: 1000,
        end_time: 2000,
        is_active: true,
    };

    // Exactly at start time should return 0
    let accrued = stream.accrued_amount(1000);
    assert_eq!(accrued, 0);
}

#[test]
fn test_large_amount_stream() {
    let env = Env::default();
    env.mock_all_auths();
    let amount: i128 = 1_000_000_000_000; // 1 trillion smallest units
    let duration = 1000u64;

    let (stream_id, _sender, recipient, _token) = setup_stream(&env, amount, duration);

    // Halfway through
    env.ledger().set_timestamp(1500);
    let claimed = StellarDripsContract::claim(env, stream_id);
    // 50% of 1 trillion = 500 billion
    assert_eq!(claimed.unwrap(), 500_000_000_000);
}

#[test]
fn test_two_independent_streams() {
    let env = Env::default();
    env.mock_all_auths();

    let (stream1_id, sender1, recipient1, token1) = setup_stream(&env, 1000, 100);
    let (stream2_id, _sender2, recipient2, _token2) = setup_stream(&env, 500, 50);

    // Advance both streams
    env.ledger().set_timestamp(1050);

    let claim1 = StellarDripsContract::claim(env, stream1_id);
    let claim2 = StellarDripsContract::claim(env, stream2_id);

    // Stream 1: 50% of 1000 = 500, Stream 2: 100% of 500 = 500
    assert_eq!(claim1.unwrap(), 500);
    assert_eq!(claim2.unwrap(), 500);
}
