import { requestAccess, setAllowed } from '@stellar/freighter-api';
// Using soroban-client in old SDKs, but the user requested @stellar/stellar-sdk matching newer API where it's all unified
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, rpc, scValToNative, nativeToScVal } from '@stellar/stellar-sdk';

// TODO: Replace with the deployed Soroban contract address
export const STELLAR_DRIPS_CONTRACT = 'CC_PLACEHOLDER_CONTRACT_ADDR';

// Note: Futurenet RPC URL
export const RPC_URL = 'https://rpc-futurenet.stellar.org';
export const NETWORK_PASSPHRASE = StellarSdk.Networks.FUTURENET;

const server = new StellarSdk.rpc.Server(RPC_URL);

export async function connectFreighter(): Promise<string | null> {
  const isAllowed = await setAllowed();
  if (isAllowed) {
    const pubKey = await requestAccess();
    return pubKey;
  }
  return null;
}

// NOTE: Since full contract transaction submission is complex and requires building the TX, 
// signing with Freighter, and polling for the result, this provides a structural scaffold.

export async function createStream(
  sender: string,
  recipient: string,
  tokenAddress: string,
  amount: string, // in stroops or raw token units if needed, assuming total amount
  durationSeconds: number
) {
  console.log('Invoking create_stream contract function:', { sender, recipient, tokenAddress, amount, durationSeconds });
  // Stub for creating a contract call. In a full implementation, you would:
  // 1. Instatiate new StellarSdk.Contract
  // 2. build transaction calling `create_stream`
  // 3. signTransaction with Freighter
  // 4. Submit to rpc.Server
  return { success: true, streamId: Math.floor(Math.random() * 1000) };
}

export async function claimStream(streamId: number) {
  console.log('Invoking claim contract function for stream:', streamId);
  return { success: true };
}

export async function cancelStream(streamId: number) {
  console.log('Invoking cancel contract function for stream:', streamId);
  return { success: true };
}

export async function getStream(streamId: number) {
  console.log('Reading stream details from contract:', streamId);
  // Stub for simulateTransaction read-only call
  return {
    stream_id: streamId,
    sender: "GB...SENDER",
    recipient: "GB...RECIPIENT",
    token: "cNGN_ADDRESS",
    total_amount: "5000",
    claimed_amount: "1000",
    start_time: Math.floor(Date.now() / 1000) - 86400,
    end_time: Math.floor(Date.now() / 1000) + 86400,
    is_active: true
  };
}
