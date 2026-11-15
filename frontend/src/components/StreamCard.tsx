import { useState } from 'react';
import { claimStream, cancelStream } from '../services/stellar';
import { Droplet, XCircle } from 'lucide-react';

interface StreamCardProps {
  streamId: number;
  sender: string;
  recipient: string;
  token: string;
  totalAmount: number;
  claimedAmount: number;
}

export default function StreamCard({ streamId, sender, recipient, token, totalAmount, claimedAmount }: StreamCardProps) {
  const [status, setStatus] = useState<'active' | 'claimed' | 'cancelled'>('active');
  const progressPercent = Math.min((claimedAmount / totalAmount) * 100, 100);

  const handleClaim = async () => {
    await claimStream(streamId);
    alert('Stream amount claimed!');
  };

  const handleCancel = async () => {
    await cancelStream(streamId);
    setStatus('cancelled');
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stream #{streamId}</span>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mt-1">
            <Droplet className="text-blue-500" size={18} />
            {totalAmount} {token}
          </h3>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${status === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
          {status.toUpperCase()}
        </span>
      </div>

      <div className="text-sm text-slate-600 flex flex-col gap-1">
        <p><span className="font-medium text-slate-500">From:</span> {sender.slice(0,6)}...{sender.slice(-4)}</p>
        <p><span className="font-medium text-slate-500">To:</span> {recipient.slice(0,6)}...{recipient.slice(-4)}</p>
      </div>

      <div>
        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>{claimedAmount} claimed</span>
          <span>{totalAmount} total</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={handleClaim} 
          disabled={status !== 'active'}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Claim Now
        </button>
        <button 
          onClick={handleCancel} 
          disabled={status !== 'active'}
          className="px-4 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-medium py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          <XCircle size={18} />
        </button>
      </div>
    </div>
  );
}
