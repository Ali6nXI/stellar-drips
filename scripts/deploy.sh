#!/bin/bash
echo "Deploying Soroban contract"
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/stellar_drips.wasm --source alice --network futurenet
