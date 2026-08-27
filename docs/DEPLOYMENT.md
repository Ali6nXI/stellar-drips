# Soroban Testnet Deployment Guide

> Step-by-step guide for deploying the Stellar Drips contract to Stellar Testnet.

__Estimated time: 5-10 minutes__

---

## Prerequisites

Install these tools before starting:

| Tool | Version | Installation |
|------|---------|-------------|
| **Rust** | latest stable | [rustup.rs](https://rustup.rs) |
| **wasm32 target** | (Rust add-on) | `rustup target add wasm32-unknown-unknown` |
| **Stellar CLI** | v25+ | [Stellar CLI install](https://developers.stellar.org/docs/tools/stellar-cli/install) |
| **Freighter Wallet** | latest | [Freighter.app](https://freighter.app) (browser extension) |

To verify everything is installed:

```bash
rustc --version
rustup target list --installed | grep wasm32
stellar --version
```

---

## Step 1: Build the Contract

The Soroban contract must be compiled to WebAssembly (WASM) before deployment.

```bash
# Navigate to the contract directory
cd contracts/stellar-drips

# Build for WASM target
cargo build --target wasm32-unknown-unknown --release

# Verify the .wasm file exists
ls -la target/wasm32-unknown-unknown/release/stellar_drips.wasm
```

## Step 2: Configure Stellar Testnet

Add the Stellar Testnet to your local CLI configuration:

```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

Verify the network was added:

```bash
stellar network list
```

You should see `testnet` listed.

---

## Step 3: Create a Deployer Account

Generate a new keypair for deployment:

```bash
stellar keys generate deployer --network testnet
```

This creates a new testnet account with an auto-generated secret key.

Fund the account with testnet XLM:

```bash
stellar keys fund deployer --network testnet
```

This provisions your deployer account with 10,000 testnet XLM using Stellar's Friendbot.

## Step 4: Deploy the Contract

Deploy the built .wasm file to Testnet:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_drips.wasm \
  --source deployer \
  --network testnet
```

The output will include the contract ID (a `C...` style address). Save this — you need it to interact with the contract from the frontend.

## Step 5: Update the Frontend

Add the deployed contract ID to your frontend config:

1. Open `frontend/src/services/stellar.ts`
2. Replace the contract ID with your deployed address:

```ts
const CONTRACT_ID = "YOUR_DEPLOYED_CONTRACT_ID";
```

## Step 6: Run the Frontend With Testnet

Install frontend dependencies and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, connect your Freighter wallet, and you should be able to:

- Create a stream
- Claim accrued funds
- Cancel a stream

## Step 7: Verify the Deployment

Verify the contract is live and callable:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source deployer \
  -- get_stream \
  --args '["<STREAM_ID>"]'
```

---

## Alternative: Using the Deploy Script

The repo includes a convenience deployment script at `scripts/deploy.sh`. To use it:

```bash
# Make it executable
chmod +x scripts/deploy.sh

# Run it
./scripts/deploy.sh
```

This script assumes you've already configured the network and created a deployer account.

---

## Common Issues

### "Cannot find .wasm file"

Make sure you built the contract in release mode and that the target path is correct: `contracts/stellar-drips/target/wasm32-unknown-unknown/release/stellar_drips.wasm`

### "wasm32 target not found"

The WebAssembly target is not installed. Run:

```bash
rustup target add wasm32-unknown-unknown
```

### "Funding failed"

Friendbot may be rate-limited. Wait a few minutes and try again:

```bash
stellar keys fund deployer --network testnet
```

If it persists, create a new deployer keypair:

```bash
stellar keys generate deployer2 --network testnet
stellar keys fund deployer2 --network testnet
```

### "Network not found"

Ensure you configured the testnet:

```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### "Freighter not detected" (frontend)

Ensure the Freighter browser extension is installed and unlocked. The frontend will detect it automatically when the extension is active.

### "Transaction failed"

Check that your deployer account has enough testnet XLM to cover gas fees:

```bash
stellar account show deployer --network testnet
```

---

## Next Steps

Once you have a testnet instance running:

1. Try creating a stream with a small amount of testnet USDC
2. Claim the accrued funds after a minute
3. Cancel the stream and verify the remaining funds are returned
4. Contribute to the repo! See [CONTRIBUTING.md](CONTRIBUTING.md)

---

*Part of the [Stellar Drips](https://github.com/Ali6nXI/stellar-drips) project — Soroban-native payment streaming on Stellar.*
