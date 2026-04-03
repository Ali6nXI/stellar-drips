import React, { useState } from 'react';
import { connectFreighter } from '../services/stellar';
import { Wallet } from 'lucide-react';

export default function ConnectWallet() {
  const [wallet, setWallet] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      const pubKey = await connectFreighter();
      setWallet(pubKey);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex items-center">
      {wallet ? (
        <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-medium text-sm border border-green-200">
          {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </span>
      ) : (
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-semibold transition-colors"
        >
          <Wallet size={18} />
          <span className="hidden sm:inline">Connect Freighter</span>
          <span className="sm:hidden">Connect</span>
        </button>
      )}
    </div>
  );
}
