import { CheckCircle2, ExternalLink, XCircle, Calendar, ArrowRight } from 'lucide-react';
import {
  buildStellarExplorerUrl,
  formatStreamAmount,
  formatStreamDate,
  shortenAddress,
  type StreamHistoryItem,
} from '../utils/streamHistory';

export interface HistoryCardProps {
  stream: StreamHistoryItem;
  contractId: string;
  connectedWallet?: string | null;
}

export default function HistoryCard({
  stream,
  contractId,
  connectedWallet,
}: HistoryCardProps) {
  const isCompleted = stream.status === 'COMPLETED';
  const totalNumeric = Number(stream.total_amount);
  const claimedNumeric = Number(stream.claimed_amount);
  const progressPercent =
    Number.isFinite(totalNumeric) && totalNumeric > 0 && Number.isFinite(claimedNumeric)
      ? Math.min(Math.max((claimedNumeric / totalNumeric) * 100, 0), 100)
      : isCompleted
        ? 100
        : 0;

  const explorerUrl = buildStellarExplorerUrl(stream, contractId);
  const roleLabel =
    connectedWallet && stream.sender === connectedWallet
      ? 'Outgoing Drip'
      : connectedWallet && stream.recipient === connectedWallet
        ? 'Incoming Drip'
        : null;

  return (
    <article
      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 transition-shadow hover:shadow-md"
      data-testid={`history-card-${stream.stream_id}`}
    >
      {/* Top Row: Stream ID + Token Amount + Status Badge */}
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stream #{stream.stream_id}
            </span>
            {roleLabel && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {roleLabel}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 mt-1">
            {formatStreamAmount(stream.total_amount)} {stream.tokenSymbol}
          </h3>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {isCompleted ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {stream.status}
        </span>
      </div>

      {/* Sender & Recipient Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="font-medium text-slate-500">Sender:</span>
          <span className="font-mono text-xs text-slate-700" title={stream.sender}>
            {shortenAddress(stream.sender)}
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="font-medium text-slate-500">Recipient:</span>
          <span className="font-mono text-xs text-slate-700" title={stream.recipient}>
            {shortenAddress(stream.recipient)}
          </span>
        </div>
      </div>

      {/* Start Date & End Date */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Calendar size={14} className="text-slate-400 shrink-0" />
        <span>
          <strong className="font-medium text-slate-600">Start:</strong>{' '}
          {formatStreamDate(stream.start_time)}
        </span>
        <ArrowRight size={12} className="text-slate-400 shrink-0" />
        <span>
          <strong className="font-medium text-slate-600">End:</strong>{' '}
          {formatStreamDate(stream.end_time)}
        </span>
      </div>

      {/* Final Claimed vs Total Progress */}
      <div>
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
          <span>
            {formatStreamAmount(stream.claimed_amount)} {stream.tokenSymbol} claimed
          </span>
          <span>
            {formatStreamAmount(stream.total_amount)} {stream.tokenSymbol} total
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isCompleted ? 'bg-emerald-500' : 'bg-red-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Footer Link: View on Stellar Explorer */}
      <div className="pt-1 border-t border-slate-100 flex justify-end">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          <span>View on Stellar Explorer</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </article>
  );
}
