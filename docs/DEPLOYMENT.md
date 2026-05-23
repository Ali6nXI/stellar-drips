# Soroban Testnet Deployment Guide

This guide walks through deploying the Stellar Drips contract to Stellar
testnet, wiring the frontend to the deployed contract, and smoke-testing the
main stream actions from the Stellar CLI.

## Prerequisites

Install these tools before starting:

- Rust and Cargo: https://rustup.rs
- Stellar CLI: https://developers.stellar.org/docs/tools/stellar-cli
- Node.js 18 or newer: https://nodejs.org
- Freighter wallet: https://freighter.app

Add the Soroban WebAssembly target:

```bash
rustup target add wasm32-unknown-unknown
```

Windows note: use the MSVC Rust toolchain and install Visual Studio Build Tools
with the "Desktop development with C++" workload. Missing MSVC tools usually
show up as linker errors during `cargo build`.

## 1. Configure Stellar Testnet

Add the Stellar testnet RPC endpoint:

```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

Confirm the network exists:

```bash
stellar network ls
```

## 2. Create and Fund a Deployer

Generate a new testnet keypair:

```bash
stellar keys generate deployer --network testnet
stellar keys address deployer
```

Fund it through Friendbot:

```bash
stellar keys fund deployer --network testnet
```

Check the account balance:

```bash
stellar account show deployer --network testnet
```

If Friendbot is rate-limited, wait and retry with a new key name such as
`deployer2`.

## 3. Build the Contract

From the repository root:

```bash
cd contracts/stellar-drips
cargo build --target wasm32-unknown-unknown --release
```

The build creates this Wasm file:

```text
target/wasm32-unknown-unknown/release/stellar_drips.wasm
```

If you are already at the repository root and prefer one command, use:

```bash
cargo build -p stellar-drips --target wasm32-unknown-unknown --release
```

In that case, the Wasm file is written under the repository-level `target/`
directory.

## 4. Deploy to Testnet

From `contracts/stellar-drips`, deploy the Wasm:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_drips.wasm \
  --source deployer \
  --network testnet
```

The command prints a contract ID that starts with `C`, for example:

```text
CA3W...EXAMPLE
```

Save it for later commands:

```bash
export STELLAR_DRIPS_CONTRACT=CA3W...EXAMPLE
```

PowerShell:

```powershell
$env:STELLAR_DRIPS_CONTRACT = "CA3W...EXAMPLE"
```

## 5. Configure Testnet Tokens

Use test tokens only. For XLM fees, Friendbot funds the deployer account.

For USDC test tokens, use the Circle faucet and select Stellar Testnet:

- https://faucet.circle.com

For cNGN testing, use the current cNGN testnet faucet when it offers the network
you are testing:

- https://cngn.co/faucet

Before passing a token to the contract, derive the Soroban asset contract ID.
For native XLM:

```bash
stellar contract asset id --asset native --network testnet
```

For issued assets such as USDC or cNGN, replace the issuer with the current
testnet issuer address:

```bash
stellar contract asset id \
  --asset "USDC:G...ISSUER" \
  --network testnet
```

Save the returned token contract ID:

```bash
export TEST_TOKEN_CONTRACT=CDLZ...TOKEN
```

## 6. Wire Up the Frontend

Open `frontend/src/services/stellar.ts` and replace the placeholder:

```ts
export const STELLAR_DRIPS_CONTRACT = 'CA3W...EXAMPLE';
```

For testnet, also use the testnet RPC and passphrase:

```ts
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the local Vite URL, connect Freighter, and make sure Freighter is set to
testnet.

## 7. Smoke Test with Stellar CLI

Create and fund a recipient key:

```bash
stellar keys generate recipient --network testnet
stellar keys fund recipient --network testnet
export RECIPIENT_ADDRESS="$(stellar keys address recipient)"
```

Create a one-day stream:

```bash
stellar contract invoke \
  --id "$STELLAR_DRIPS_CONTRACT" \
  --source deployer \
  --network testnet \
  -- \
  create_stream \
  --sender "$(stellar keys address deployer)" \
  --recipient "$RECIPIENT_ADDRESS" \
  --token "$TEST_TOKEN_CONTRACT" \
  --amount 1000000 \
  --duration_seconds 86400
```

The command returns the new stream ID. Save it:

```bash
export STREAM_ID=1
```

Read the stream:

```bash
stellar contract invoke \
  --id "$STELLAR_DRIPS_CONTRACT" \
  --source deployer \
  --network testnet \
  -- \
  get_stream \
  --stream_id "$STREAM_ID"
```

Claim accrued funds with the recipient key:

```bash
stellar contract invoke \
  --id "$STELLAR_DRIPS_CONTRACT" \
  --source recipient \
  --network testnet \
  -- \
  claim \
  --stream_id "$STREAM_ID"
```

Cancel the stream with the original sender key:

```bash
stellar contract invoke \
  --id "$STELLAR_DRIPS_CONTRACT" \
  --source deployer \
  --network testnet \
  -- \
  cancel \
  --stream_id "$STREAM_ID"
```

## Troubleshooting

### `command not found: stellar`

Make sure the Stellar CLI install directory is on your `PATH`. On Windows with
Git Bash, restart the terminal after updating `PATH`.

### MSVC linker errors on Windows

Install Visual Studio Build Tools with the C++ workload, then reinstall or switch
to the MSVC Rust toolchain:

```bash
rustup default stable-x86_64-pc-windows-msvc
```

### Friendbot rate limit

Wait and retry later, or create and fund a different testnet keypair:

```bash
stellar keys generate deployer2 --network testnet
stellar keys fund deployer2 --network testnet
```

### Contract deploy fails

Check that:

- the deployer account is funded
- the `testnet` network is configured with the correct passphrase
- the Wasm path exists from the directory where you run the deploy command
- the build target is `wasm32-unknown-unknown`

### Frontend says the wallet is on the wrong network

Switch Freighter to testnet and refresh the page. The frontend should use
`https://soroban-testnet.stellar.org` and `StellarSdk.Networks.TESTNET`.

## Nigeria Testing Notes

- Prefer small test amounts while validating cNGN and USDC flows.
- On mobile networks, wait for the transaction confirmation before retrying a
  button click.
- Confirm the current cNGN testnet issuer or faucet network before demoing the
  Nigeria flow.
- Keep testnet contract IDs in local environment notes so contributors can reuse
  a known-good deployment during a Drips Wave sprint.
