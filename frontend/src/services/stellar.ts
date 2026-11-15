import { requestAccess, setAllowed } from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  deriveStreamHistoryStatus,
  resolveTokenSymbol,
  type RawContractStream,
  type StreamHistoryItem,
} from '../utils/streamHistory';

// TODO: Replace with the deployed Soroban contract address
export const STELLAR_DRIPS_CONTRACT = 'CC_PLACEHOLDER_CONTRACT_ADDR';

// Note: Futurenet / Testnet RPC URL
export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

// Public read-only simulation source account format (valid Stellar G-address checksum)
const READONLY_SOURCE_ACCOUNT = StellarSdk.Keypair.fromRawEd25519Seed(
  new Uint8Array(32)
).publicKey();

export interface RpcEventEntry {
  topic: StellarSdk.xdr.ScVal[];
  value: StellarSdk.xdr.ScVal;
  txHash?: string;
}

export type StreamHistoryEventsRequest = (
  | { startLedger: number; cursor?: undefined }
  | { cursor: string; startLedger?: undefined }
) & {
  filters: Array<{
    type: 'contract';
    contractIds: string[];
    topics: string[][];
  }>;
  limit?: number;
};

export interface StreamHistoryRpcAdapter {
  getLatestLedger: () => Promise<{ sequence: number }>;
  getEvents: (
    params: StreamHistoryEventsRequest
  ) => Promise<{ events: RpcEventEntry[]; cursor?: string }>;
  readStream?: (streamId: number) => Promise<RawContractStream | null>;
}

export interface GetStreamHistoryOptions {
  contractId?: string;
  rpcAdapter?: StreamHistoryRpcAdapter;
  ledgerLookback?: number;
}

export async function connectFreighter(): Promise<string | null> {
  const allowedResult = await setAllowed();
  const allowed =
    typeof allowedResult === 'boolean'
      ? allowedResult
      : Boolean(allowedResult?.isAllowed && !allowedResult?.error);

  if (!allowed) {
    return null;
  }

  const accessResult = await requestAccess();
  if (typeof accessResult === 'string') {
    return accessResult || null;
  }
  if (accessResult?.error || !accessResult?.address) {
    return null;
  }
  return accessResult.address;
}

export async function createStream(
  sender: string,
  recipient: string,
  tokenAddress: string,
  amount: string,
  durationSeconds: number
) {
  console.log('Invoking create_stream contract function:', {
    sender,
    recipient,
    tokenAddress,
    amount,
    durationSeconds,
  });
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

export async function getStream(streamId: number): Promise<RawContractStream> {
  console.log('Reading stream details from contract:', streamId);
  return {
    stream_id: streamId,
    sender: 'GB...SENDER',
    recipient: 'GB...RECIPIENT',
    token: 'cNGN_ADDRESS',
    total_amount: '5000',
    claimed_amount: '1000',
    start_time: Math.floor(Date.now() / 1000) - 86400,
    end_time: Math.floor(Date.now() / 1000) + 86400,
    is_active: true,
  };
}

async function simulateGetStream(
  server: StellarSdk.rpc.Server,
  contractId: string,
  streamId: number
): Promise<RawContractStream | null> {
  const source = new StellarSdk.Account(READONLY_SOURCE_ACCOUNT, '0');
  const contract = new StellarSdk.Contract(contractId);
  const tx = new StellarSdk.TransactionBuilder(source, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'get_stream',
        StellarSdk.nativeToScVal(BigInt(streamId), { type: 'u64' })
      )
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!StellarSdk.rpc.Api.isSimulationSuccess(sim) || !sim.result?.retval) {
    return null;
  }

  const decoded = StellarSdk.scValToNative(sim.result.retval) as Record<string, unknown> | null;
  if (!decoded || typeof decoded !== 'object') {
    return null;
  }

  return {
    stream_id: Number(decoded.stream_id ?? streamId),
    sender: String(decoded.sender ?? ''),
    recipient: String(decoded.recipient ?? ''),
    token: String(decoded.token ?? ''),
    total_amount: String(decoded.total_amount ?? '0'),
    claimed_amount: String(decoded.claimed_amount ?? '0'),
    start_time: Number(decoded.start_time ?? 0),
    end_time: Number(decoded.end_time ?? 0),
    is_active: Boolean(decoded.is_active),
  };
}

function buildSeededDemoHistory(walletAddress: string): StreamHistoryItem[] {
  const trimmed = walletAddress.trim();
  if (!trimmed) {
    return [];
  }

  const now = Math.floor(Date.now() / 1000);
  const day = 86_400;

  return [
    {
      stream_id: 104,
      sender: trimmed,
      recipient: 'GB7NIGERIAFAMILYREMITTANCE7X9K2M4P8Q3R5W6Y2L9JH4K2L8P3Q7',
      token: 'USDC_ADDRESS',
      tokenSymbol: 'USDC',
      total_amount: '450',
      claimed_amount: '450',
      start_time: now - 10 * day,
      end_time: now - 3 * day,
      is_active: false,
      status: 'COMPLETED',
    },
    {
      stream_id: 98,
      sender: 'GALAGOSGIGEMPLOYER9M2P4K7R8T3V6W9X2Y5Z8B4N7Q2L5M8P3R6T9W',
      recipient: trimmed,
      token: 'cNGN_ADDRESS',
      tokenSymbol: 'cNGN',
      total_amount: '320000',
      claimed_amount: '185000',
      start_time: now - 28 * day,
      end_time: now - 18 * day,
      is_active: false,
      status: 'CANCELLED',
    },
    {
      stream_id: 81,
      sender: trimmed,
      recipient: 'GCNGOAIDDISBURSEMENT5H8J3K6L9P2R5T8W3Y6B9D2F5H8K3M6P9R2T',
      token: 'cNGN_ADDRESS',
      tokenSymbol: 'cNGN',
      total_amount: '750000',
      claimed_amount: '750000',
      start_time: now - 60 * day,
      end_time: now - 42 * day,
      is_active: false,
      status: 'COMPLETED',
    },
  ];
}

function parsePositiveStreamId(raw: unknown): number | null {
  if (typeof raw === 'bigint') {
    const num = Number(raw);
    return Number.isSafeInteger(num) && num > 0 ? num : null;
  }
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const num = Number(raw);
    return Number.isSafeInteger(num) && num > 0 ? num : null;
  }
  return null;
}

/**
 * Queries completed (`is_active: false`) and cancelled streams associated with
 * `walletAddress` (as either sender or recipient) from Soroban contract events.
 */
export async function getStreamHistory(
  walletAddress: string,
  options: GetStreamHistoryOptions = {}
): Promise<StreamHistoryItem[]> {
  const normalizedWallet = walletAddress.trim();
  if (!normalizedWallet) {
    return [];
  }

  const contractId = options.contractId ?? STELLAR_DRIPS_CONTRACT;
  const hasValidContract = StellarSdk.StrKey.isValidContract(contractId);

  if (!hasValidContract && !options.rpcAdapter) {
    return buildSeededDemoHistory(normalizedWallet);
  }

  const server = options.rpcAdapter ? null : new StellarSdk.rpc.Server(RPC_URL);
  const adapter: StreamHistoryRpcAdapter = options.rpcAdapter ?? {
    getLatestLedger: () => server!.getLatestLedger(),
    getEvents: (params) =>
      server!.getEvents(params) as unknown as Promise<{
        events: RpcEventEntry[];
        cursor?: string;
      }>,
    readStream: (streamId: number) => simulateGetStream(server!, contractId, streamId),
  };

  const latest = await adapter.getLatestLedger();
  const lookback = options.ledgerLookback ?? 17_280;
  const startLedger = Math.max(1, latest.sequence - lookback);

  const discoveredIds = new Set<number>();
  const cancelledIds = new Set<number>();
  const latestTxByStream = new Map<number, string>();

  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const response = await adapter.getEvents({
      ...(cursor ? { cursor } : { startLedger }),
      filters: [
        {
          type: 'contract',
          contractIds: [contractId],
          topics: [['*']],
        },
      ],
      limit: 100,
    });

    for (const evt of response.events) {
      if (!evt.topic || evt.topic.length === 0) continue;
      let eventName = '';
      try {
        eventName = String(StellarSdk.scValToNative(evt.topic[0]));
      } catch {
        continue;
      }

      if (eventName === 'created' || eventName === 'canceled') {
        let parsedValue: unknown;
        try {
          parsedValue = StellarSdk.scValToNative(evt.value);
        } catch {
          continue;
        }
        const streamId = parsePositiveStreamId(parsedValue);
        if (streamId === null) continue;

        discoveredIds.add(streamId);
        if (eventName === 'canceled') {
          cancelledIds.add(streamId);
        }
        if (evt.txHash) {
          latestTxByStream.set(streamId, evt.txHash);
        }
      }
    }

    if (!response.cursor || response.events.length < 100) {
      break;
    }
    cursor = response.cursor;
  }

  const readStreamFn =
    adapter.readStream ??
    ((id: number) =>
      server ? simulateGetStream(server, contractId, id) : Promise.resolve(null));

  const streamRecords = await Promise.all(
    Array.from(discoveredIds).map((id) => readStreamFn(id))
  );

  const history: StreamHistoryItem[] = [];
  for (const raw of streamRecords) {
    if (!raw || raw.is_active) {
      continue;
    }

    const matchesWallet =
      raw.sender === normalizedWallet || raw.recipient === normalizedWallet;
    if (!matchesWallet) {
      continue;
    }

    const streamId = Number(raw.stream_id);
    const status = deriveStreamHistoryStatus(raw, cancelledIds, streamId);
    if (!status) {
      continue;
    }

    history.push({
      stream_id: streamId,
      sender: raw.sender,
      recipient: raw.recipient,
      token: raw.token,
      tokenSymbol: resolveTokenSymbol(raw.token),
      total_amount: String(raw.total_amount),
      claimed_amount: String(raw.claimed_amount),
      start_time: Number(raw.start_time),
      end_time: Number(raw.end_time),
      is_active: false,
      status,
      txHash: latestTxByStream.get(streamId),
    });
  }

  return history.sort((a, b) => b.end_time - a.end_time || b.stream_id - a.stream_id);
}
