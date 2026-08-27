import React, { useState } from 'react';
import { useTransaction } from '../hooks/useTransaction';
import Toast from './Toast';
import { createStream } from '../services/stellar';

export default function CreateStreamForm() {
  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { isLoading, error, execute } = useTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || !days) return;

    const durationSeconds = parseFloat(days) * 24 * 60 * 60;

    const result = await execute(() =>
      createStream("GBSENDER...", recipient, token, amount, durationSeconds)
    );

    if (result) {
      setToast({ message: `Stream created for ${recipient}!`, type: 'success' });
      setRecipient('');
      setAmount('');
      setDays('');
    }
  };

  // Show error toast when transaction fails
  React.useEffect(() => {
    if (error) {
      setToast({ message: error, type: 'error' });
    }
  }, [error]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <h2 className="text-xl font-semibold mb-4 text-slate-800">New Payment Stream</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Recipient Address</label>
          <input
            type="text" required
            value={recipient} onChange={e => setRecipient(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="GB... (Nigeria/Gig Worker)"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Token</label>
            <select
              value={token} onChange={e => setToken(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="USDC">USDC</option>
              <option value="cNGN">cNGN</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Amount</label>
            <input
              type="number" required min="0.01" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Duration (Days)</label>
          <input
            type="number" required min="1" step="1"
            value={days} onChange={e => setDays(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="30"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing Transaction...
            </>
          ) : (
            'Create Stream'
          )}
        </button>

      </form>
    </div>
  );
}
