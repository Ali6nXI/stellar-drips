#![cfg(test)]
use super::*;
use soroban_sdk::Env;

#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register_contract(None, StellarDripsContract);
    let client = StellarDripsContractClient::new(&env, &contract_id);
    
    assert_eq!(client.hello(), 1);
}
