import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, History as HistoryIcon, Search, Sparkles } from 'lucide-react';
import HistoryCard from '../components/HistoryCard';
import { getStreamHistory, STELLAR_DRIPS_CONTRACT } from '../services/stellar';
import {
  downloadStreamHistoryCsv,
  filterStreamHistory,
  type DateRangeFilter,
  type StreamHistoryItem,
  type TokenFilter,
} from '../utils/streamHistory';

export interface HistoryPageProps {
  wallet?: string | null;
  onWalletChange?: (wallet: string | null) => void;
}

const DEMO_PREVIEW_WALLET = 'GB3LAGOSDIASPORASENDER7K2M9P4R8T6W3Y5Z9B2D4F6H8J2L4N6Q8';

const DATE_RANGE_OPTIONS: Array<{ value: DateRangeFilter; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

const TOKEN_OPTIONS: Array<{ value: TokenFilter; label: string }> = [
  { value: 'ALL', label: 'All Tokens' },
  { value: 'USDC', label: 'USDC' },
  { value: 'cNGN', label: 'cNGN' },
];

function HistoryLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading stream history">
      {[1, 2, 3].map((idx) => (
        <div
          key={idx}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 animate-pulse flex flex-col gap-4"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-5 w-36 bg-slate-200 rounded" />
            </div>
            <div className="h-6 w-24 bg-slate-200 rounded-full" />
          </div>
          <div className="h-11 w-full bg-slate-100 rounded-xl" />
          <div className="h-3 w-48 bg-slate-200 rounded" />
          <div className="h-2 w-full bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function History({ wallet, onWalletChange }: HistoryPageProps) {
  const [streams, setStreams] = useState<StreamHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!wallet) {
        setStreams([]);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await getStreamHistory(wallet);
        if (!cancelled) {
          setStreams(result);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Unable to fetch stream history from Stellar RPC.'
          );
          setStreams([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const filteredStreams = useMemo(
    () =>
      filterStreamHistory(streams, {
        dateRange,
        token: tokenFilter,
        searchQuery,
      }),
    [streams, dateRange, tokenFilter, searchQuery]
  );

  const completedCount = useMemo(
    () => filteredStreams.filter((s) => s.status === 'COMPLETED').length,
    [filteredStreams]
  );
  const cancelledCount = useMemo(
    () => filteredStreams.filter((s) => s.status === 'CANCELLED').length,
    [filteredStreams]
  );

  const handleExportCsv = () => {
    if (filteredStreams.length === 0) return;
    downloadStreamHistoryCsv(filteredStreams, STELLAR_DRIPS_CONTRACT);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-12">
      {/* Page Header + Export CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
            <HistoryIcon className="text-blue-600" size={28} />
            Stream History
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm md:text-base">
            On-chain audit trail of completed and cancelled remittance, gig salary, and aid streams.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredStreams.length === 0 || isLoading}
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <section
        aria-label="History filters"
        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col gap-3"
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date range">
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDateRange(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  dateRange === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Token Filter */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Token filter">
            {TOKEN_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTokenFilter(option.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tokenFilter === option.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by token (USDC / cNGN), stream ID, or wallet address..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* Summary Counts when items present */}
      {!isLoading && filteredStreams.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-semibold text-slate-500 px-1">
          <span>{filteredStreams.length} stream(s) shown</span>
          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            {completedCount} completed
          </span>
          <span className="text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
            {cancelledCount} cancelled
          </span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <HistoryLoadingSkeleton />
      ) : filteredStreams.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredStreams.map((stream) => (
            <HistoryCard
              key={stream.stream_id}
              stream={stream}
              contractId={STELLAR_DRIPS_CONTRACT}
              connectedWallet={wallet}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 sm:p-12 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <HistoryIcon size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">
            No stream history yet — create your first drip!
          </h2>
          <p className="text-sm text-slate-500 max-w-md">
            {wallet
              ? 'No completed or cancelled streams matched your current filters for this wallet.'
              : 'Connect your Freighter wallet to load your completed and cancelled streams on Stellar.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link
              to="/"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Go to Dashboard
            </Link>
            {!wallet &&
              STELLAR_DRIPS_CONTRACT === 'CC_PLACEHOLDER_CONTRACT_ADDR' &&
              onWalletChange && (
                <button
                  type="button"
                  onClick={() => onWalletChange(DEMO_PREVIEW_WALLET)}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Sparkles size={15} />
                  <span>Preview Demo Wallet</span>
                </button>
              )}
          </div>
        </div>
      )}
    </main>
  );
}
