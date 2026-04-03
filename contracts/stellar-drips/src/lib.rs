#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

mod stream;
mod errors;

#[cfg(test)]
mod test;

#[contract]
pub struct StellarDripsContract;

#[contractimpl]
impl StellarDripsContract {
    pub fn hello(env: Env) -> u32 {
        1
    }
}
