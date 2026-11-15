export type StreamHistoryStatus = 'COMPLETED' | 'CANCELLED';
export type DateRangeFilter = '7d' | '30d' | 'all';
export type TokenFilter = 'ALL' | 'USDC' | 'cNGN';

export interface RawContractStream {
  stream_id: number | bigint;
  sender: string;
  recipient: string;
  token: string;
  total_amount: string | number | bigint;
  claimed_amount: string | number | bigint;
  start_time: number | bigint;
  end_time: number | bigint;
  is_active: boolean;
}

export interface StreamHistoryItem {
  stream_id: number;
  sender: string;
  recipient: string;
  token: string;
  tokenSymbol: string;
  total_amount: string;
  claimed_amount: string;
  start_time: number;
  end_time: number;
  is_active: false;
  status: StreamHistoryStatus;
  txHash?: string;
}

export interface StreamHistoryFilterOptions {
  dateRange: DateRangeFilter;
  token: TokenFilter;
  searchQuery?: string;
  nowSeconds?: number;
}

const KNOWN_TOKEN_MAP: Record<string, string> = {
  usdc: 'USDC',
  usdc_address: 'USDC',
  cngn: 'cNGN',
  cngn_address: 'cNGN',
};

/**
 * Resolves a human-friendly token symbol (`USDC` or `cNGN`) from a token code
 * or Stellar contract address.
 */
export function resolveTokenSymbol(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return 'UNKNOWN';

  const lower = trimmed.toLowerCase();
  if (KNOWN_TOKEN_MAP[lower]) {
    return KNOWN_TOKEN_MAP[lower];
  }
  if (lower.includes('cngn')) {
    return 'cNGN';
  }
  if (lower.includes('usdc')) {
    return 'USDC';
  }
  if (trimmed.length > 12) {
    return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
  }
  return trimmed;
}

function parseComparableBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  const cleaned = value.trim();
  if (!cleaned) return 0n;
  if (/^-?\d+$/.test(cleaned)) {
    return BigInt(cleaned);
  }
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? BigInt(Math.round(numeric * 1e7)) : 0n;
}

/**
 * Determines whether an inactive stream finished as `COMPLETED` or `CANCELLED`.
 * Returns `null` if the stream is still active (`is_active === true`).
 */
export function deriveStreamHistoryStatus(
  stream: Pick<RawContractStream, 'is_active' | 'claimed_amount' | 'total_amount'>,
  cancelledStreamIds?: ReadonlySet<number>,
  streamId?: number
): StreamHistoryStatus | null {
  if (stream.is_active) {
    return null;
  }

  if (streamId !== undefined && cancelledStreamIds?.has(streamId)) {
    return 'CANCELLED';
  }

  const claimed = parseComparableBigInt(stream.claimed_amount);
  const total = parseComparableBigInt(stream.total_amount);

  if (total > 0n && claimed >= total) {
    return 'COMPLETED';
  }

  return 'CANCELLED';
}

/**
 * Formats a Unix timestamp (seconds) into a human-readable date such as `"Mar 15, 2026"`.
 */
export function formatStreamDate(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(unixSeconds * 1000));
}

/**
 * Formats a token amount for display while preserving up to 7 decimal places.
 */
export function formatStreamAmount(amount: string | number): string {
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numeric)) {
    return String(amount);
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(numeric);
}

/**
 * Shortens a Stellar public key or contract address for compact mobile cards.
 */
export function shortenAddress(address: string): string {
  const clean = address.trim();
  if (clean.length <= 13) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

/**
 * Builds a Stellar Expert explorer URL for a historical stream (preferring its
 * transaction hash when known, falling back to the contract page on testnet).
 */
export function buildStellarExplorerUrl(
  item: Pick<StreamHistoryItem, 'stream_id' | 'txHash'>,
  contractId: string,
  network: 'testnet' | 'public' = 'testnet'
): string {
  const base = `https://stellar.expert/explorer/${network}`;
  if (item.txHash && /^[0-9a-fA-F]{64}$/.test(item.txHash)) {
    return `${base}/tx/${item.txHash}`;
  }
  if (/^C[A-Z2-7]{55}$/.test(contractId)) {
    return `${base}/contract/${contractId}`;
  }
  return `${base}?stream=${item.stream_id}`;
}

/**
 * Filters inactive streams by date range (`7d`, `30d`, `all`), token (`ALL`,
 * `USDC`, `cNGN`), and optional free-text search (token, stream ID, or wallet).
 */
export function filterStreamHistory(
  items: readonly StreamHistoryItem[],
  options: StreamHistoryFilterOptions
): StreamHistoryItem[] {
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const minTimestamp =
    options.dateRange === '7d'
      ? now - 7 * 86_400
      : options.dateRange === '30d'
        ? now - 30 * 86_400
        : 0;

  const normalizedQuery = (options.searchQuery ?? '').trim().toLowerCase();

  return items
    .filter((item) => {
      if (minTimestamp > 0 && item.end_time < minTimestamp) {
        return false;
      }

      if (
        options.token !== 'ALL' &&
        item.tokenSymbol.toLowerCase() !== options.token.toLowerCase()
      ) {
        return false;
      }

      if (normalizedQuery) {
        const haystack = [
          `#${item.stream_id}`,
          String(item.stream_id),
          item.tokenSymbol,
          item.token,
          item.sender,
          item.recipient,
          item.status,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => b.end_time - a.end_time || b.stream_id - a.stream_id);
}

function escapeCsvField(raw: string | number): string {
  const text = String(raw);
  // Neutralize spreadsheet formula prefixes while keeping data readable.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Serializes stream history items into an RFC-4180 CSV string suitable for
 * accounting, remittance verification, and tax records.
 */
export function streamHistoryToCsv(
  items: readonly StreamHistoryItem[],
  contractId: string
): string {
  const headers = [
    'stream_id',
    'status',
    'token',
    'total_amount',
    'claimed_amount',
    'sender',
    'recipient',
    'start_date',
    'end_date',
    'explorer_url',
  ];

  const rows = items.map((item) =>
    [
      item.stream_id,
      item.status,
      item.tokenSymbol,
      item.total_amount,
      item.claimed_amount,
      item.sender,
      item.recipient,
      formatStreamDate(item.start_time),
      formatStreamDate(item.end_time),
      buildStellarExplorerUrl(item, contractId),
    ]
      .map(escapeCsvField)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers a client-side CSV file download of the supplied stream history.
 */
export function downloadStreamHistoryCsv(
  items: readonly StreamHistoryItem[],
  contractId: string,
  filename?: string
): void {
  const csv = streamHistoryToCsv(items, contractId);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `stellar-drips-history-${dateSuffix}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
