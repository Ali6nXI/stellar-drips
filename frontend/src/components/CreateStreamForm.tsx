import React, { useState } from 'react';
import { createStream } from '../services/stellar';

export default function CreateStreamForm() {
  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || !days) return;

    // Convert days to seconds
    const durationSeconds = parseFloat(days) * 24 * 60 * 60;
    
    // In our simplified mock, we assume sender is already known or managed in global state
    await createStream("GBSENDER...", recipient, token, amount, durationSeconds);
    
    alert(`Stream created for ${recipient}!`);
    setRecipient('');
    setAmount('');
    setDays('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-slate-800">New Payment Stream</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Recipient Address</label>
          <input 
            type="text" required
            value={recipient} onChange={e => setRecipient(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="GB... (Nigeria/Gig Worker)"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Token</label>
            <select 
              value={token} onChange={e => setToken(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USDC">USDC (Global)</option>
              <option value="cNGN">cNGN (Nigeria)</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Amount</label>
            <input 
              type="number" required min="0" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Duration (Days)</label>
          <input 
            type="number" required min="1" step="1"
            value={days} onChange={e => setDays(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="30"
          />
        </div>

        <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
          Start Streaming
        </button>
      </form>
    </div>
  );
}
