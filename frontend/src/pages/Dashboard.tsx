import React from 'react';
import ConnectWallet from '../components/ConnectWallet';
import CreateStreamForm from '../components/CreateStreamForm';
import StreamCard from '../components/StreamCard';
import { Droplets } from 'lucide-react';

export default function Dashboard() {
  // Mock data for streams
  const streams = [
    { id: 1, sender: 'GA123R...', recipient: 'GB987X...', token: 'USDC', totalAmount: 500, claimedAmount: 100 },
    { id: 2, sender: 'GB456Y...', recipient: 'GC834Z...', token: 'cNGN', totalAmount: 25000, claimedAmount: 25000 },
  ];

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Droplets className="text-blue-600" size={24} />
              <span className="font-bold text-xl tracking-tight text-slate-800">Stellar Drips</span>
            </div>
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="mb-8 pl-1">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-2 text-sm md:text-base">Manage your stablecoin streams and remittance payouts over Stellar.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          
          <div className="w-full md:w-5/12">
            <CreateStreamForm />
          </div>

          <div className="w-full md:w-7/12 flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Active Streams</h2>
            {streams.map(stream => (
              <StreamCard 
                key={stream.id}
                streamId={stream.id}
                sender={stream.sender}
                recipient={stream.recipient}
                token={stream.token}
                totalAmount={stream.totalAmount}
                claimedAmount={stream.claimedAmount}
              />
            ))}
          </div>
          
        </div>
      </main>
    </div>
  );
}
