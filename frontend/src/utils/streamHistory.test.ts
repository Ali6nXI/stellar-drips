import { describe, expect, it } from 'vitest';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  buildStellarExplorerUrl,
  deriveStreamHistoryStatus,
  filterStreamHistory,
  formatStreamDate,
  resolveTokenSymbol,
  streamHistoryToCsv,
  type StreamHistoryItem,
} from './streamHistory';
import { getStreamHistory, type StreamHistoryRpcAdapter } from '../services/stellar';

const SAMPLE_CONTRACT_ID = StellarSdk.StrKey.encodeContract(new Uint8Array(32).fill(7));

describe('streamHistory utilities', () => {
  const now = 1_773_532_800; // Mar 15, 2026 00:00:00 UTC
  const day = 86_400;

  const sampleItems: StreamHistoryItem[] = [
    {
      stream_id: 12,
      sender: 'GASENDERWALLET111111111111111111111111111111111111111111',
      recipient: 'GBRECIPIENTWALLET222222222222222222222222222222222222222',
      token: 'USDC_ADDRESS',
      tokenSymbol: 'USDC',
      total_amount: '500',
      claimed_amount: '500',
      start_time: now - 5 * day,
      end_time: now - 1 * day,
      is_active: false,
      status: 'COMPLETED',
      txHash: 'a'.repeat(64),
    },
    {
      stream_id: 9,
      sender: 'GAOTHERSENDER3333333333333333333333333333333333333333333',
      recipient: 'GASENDERWALLET111111111111111111111111111111111111111111',
      token: 'cNGN_ADDRESS',
      tokenSymbol: 'cNGN',
      total_amount: '250000',
      claimed_amount: '100000',
      start_time: now - 25 * day,
      end_time: now - 15 * day,
      is_active: false,
      status: 'CANCELLED',
    },
    {
      stream_id: 3,
      sender: 'GASENDERWALLET111111111111111111111111111111111111111111',
      recipient: 'GCNGORECIPIENT444444444444444444444444444444444444444444',
      token: 'cNGN_ADDRESS',
      tokenSymbol: 'cNGN',
      total_amount: '1000000',
      claimed_amount: '1000000',
      start_time: now - 60 * day,
      end_time: now - 45 * day,
      is_active: false,
      status: 'COMPLETED',
    },
  ];

  it('formats Unix timestamps in human-readable form (e.g. Mar 15, 2026)', () => {
    expect(formatStreamDate(now)).toBe('Mar 15, 2026');
    expect(formatStreamDate(0)).toBe('—');
  });

  it('resolves USDC and cNGN token symbols cleanly', () => {
    expect(resolveTokenSymbol('USDC_ADDRESS')).toBe('USDC');
    expect(resolveTokenSymbol('cNGN_ADDRESS')).toBe('cNGN');
    expect(resolveTokenSymbol(SAMPLE_CONTRACT_ID)).toContain('...');
  });

  it('derives COMPLETED vs CANCELLED status accurately and ignores active streams', () => {
    expect(
      deriveStreamHistoryStatus({
        is_active: true,
        claimed_amount: '500',
        total_amount: '500',
      })
    ).toBeNull();

    expect(
      deriveStreamHistoryStatus({
        is_active: false,
        claimed_amount: '500',
        total_amount: '500',
      })
    ).toBe('COMPLETED');

    expect(
      deriveStreamHistoryStatus({
        is_active: false,
        claimed_amount: '200',
        total_amount: '500',
      })
    ).toBe('CANCELLED');

    expect(
      deriveStreamHistoryStatus(
        {
          is_active: false,
          claimed_amount: '500',
          total_amount: '500',
        },
        new Set([77]),
        77
      )
    ).toBe('CANCELLED');
  });

  it('filters stream history by date range, token, and free-text search', () => {
    const last7d = filterStreamHistory(sampleItems, {
      dateRange: '7d',
      token: 'ALL',
      nowSeconds: now,
    });
    expect(last7d.map((s) => s.stream_id)).toEqual([12]);

    const last30d = filterStreamHistory(sampleItems, {
      dateRange: '30d',
      token: 'ALL',
      nowSeconds: now,
    });
    expect(last30d.map((s) => s.stream_id)).toEqual([12, 9]);

    const onlyCngn = filterStreamHistory(sampleItems, {
      dateRange: 'all',
      token: 'cNGN',
      nowSeconds: now,
    });
    expect(onlyCngn.map((s) => s.stream_id)).toEqual([9, 3]);

    const byQuery = filterStreamHistory(sampleItems, {
      dateRange: 'all',
      token: 'ALL',
      searchQuery: 'GCNGORECIPIENT',
      nowSeconds: now,
    });
    expect(byQuery.map((s) => s.stream_id)).toEqual([3]);
  });

  it('builds valid Stellar Expert URLs for tx hashes and contract addresses', () => {
    expect(buildStellarExplorerUrl(sampleItems[0], SAMPLE_CONTRACT_ID)).toBe(
      `https://stellar.expert/explorer/testnet/tx/${'a'.repeat(64)}`
    );
    expect(buildStellarExplorerUrl(sampleItems[1], SAMPLE_CONTRACT_ID)).toBe(
      `https://stellar.expert/explorer/testnet/contract/${SAMPLE_CONTRACT_ID}`
    );
  });

  it('serializes RFC-4180 CSV with quoted dates and formula-injection protection', () => {
    const csv = streamHistoryToCsv(sampleItems.slice(0, 2), SAMPLE_CONTRACT_ID);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      'stream_id,status,token,total_amount,claimed_amount,sender,recipient,start_date,end_date,explorer_url'
    );
    expect(lines[1]).toContain('12,COMPLETED,USDC,500,500');
    expect(lines[1]).toContain('"Mar 14, 2026"');
    expect(lines[2]).toContain('9,CANCELLED,cNGN,250000,100000');
  });
});

describe('getStreamHistory Soroban event querying', () => {
  it('queries contract events, filters by sender OR recipient, and excludes active streams', async () => {
    const wallet = StellarSdk.Keypair.random().publicKey();
    const otherA = StellarSdk.Keypair.random().publicKey();
    const otherB = StellarSdk.Keypair.random().publicKey();

    const symCreated = StellarSdk.xdr.ScVal.scvSymbol('created');
    const symCanceled = StellarSdk.xdr.ScVal.scvSymbol('canceled');

    const mockAdapter: StreamHistoryRpcAdapter = {
      getLatestLedger: async () => ({ sequence: 50_000 }),
      getEvents: async () => ({
        events: [
          {
            topic: [symCreated],
            value: StellarSdk.nativeToScVal(1n, { type: 'u64' }),
            txHash: '1'.repeat(64),
          },
          {
            topic: [symCreated],
            value: StellarSdk.nativeToScVal(2n, { type: 'u64' }),
            txHash: '2'.repeat(64),
          },
          {
            topic: [symCanceled],
            value: StellarSdk.nativeToScVal(2n, { type: 'u64' }),
            txHash: 'b'.repeat(64),
          },
          {
            topic: [symCreated],
            value: StellarSdk.nativeToScVal(3n, { type: 'u64' }),
            txHash: '3'.repeat(64),
          },
          {
            topic: [symCreated],
            value: StellarSdk.nativeToScVal(4n, { type: 'u64' }),
            txHash: '4'.repeat(64),
          },
        ],
      }),
      readStream: async (streamId: number) => {
        if (streamId === 1) {
          // Completed stream where connected wallet is sender
          return {
            stream_id: 1,
            sender: wallet,
            recipient: otherA,
            token: 'USDC_ADDRESS',
            total_amount: '1000',
            claimed_amount: '1000',
            start_time: 1_770_000_000,
            end_time: 1_770_086_400,
            is_active: false,
          };
        }
        if (streamId === 2) {
          // Cancelled stream where connected wallet is recipient
          return {
            stream_id: 2,
            sender: otherA,
            recipient: wallet,
            token: 'cNGN_ADDRESS',
            total_amount: '50000',
            claimed_amount: '20000',
            start_time: 1_770_100_000,
            end_time: 1_770_200_000,
            is_active: false,
          };
        }
        if (streamId === 3) {
          // Still active — must be excluded from history
          return {
            stream_id: 3,
            sender: wallet,
            recipient: otherA,
            token: 'USDC_ADDRESS',
            total_amount: '900',
            claimed_amount: '100',
            start_time: 1_770_300_000,
            end_time: 1_770_900_000,
            is_active: true,
          };
        }
        // Unrelated wallets — must be excluded
        return {
          stream_id: 4,
          sender: otherA,
          recipient: otherB,
          token: 'USDC_ADDRESS',
          total_amount: '400',
          claimed_amount: '400',
          start_time: 1_770_000_000,
          end_time: 1_770_050_000,
          is_active: false,
        };
      },
    };

    const result = await getStreamHistory(wallet, {
      contractId: SAMPLE_CONTRACT_ID,
      rpcAdapter: mockAdapter,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      stream_id: 2,
      status: 'CANCELLED',
      tokenSymbol: 'cNGN',
      txHash: 'b'.repeat(64),
    });
    expect(result[1]).toMatchObject({
      stream_id: 1,
      status: 'COMPLETED',
      tokenSymbol: 'USDC',
      txHash: '1'.repeat(64),
    });
  });

  it('returns an empty array when walletAddress is blank', async () => {
    await expect(getStreamHistory('   ')).resolves.toEqual([]);
  });
});
