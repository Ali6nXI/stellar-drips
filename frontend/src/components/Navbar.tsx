import { NavLink } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import ConnectWallet from './ConnectWallet';

export interface NavbarProps {
  wallet: string | null;
  onWalletChange: (wallet: string | null) => void;
}

export default function Navbar({ wallet, onWalletChange }: NavbarProps) {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <NavLink to="/" className="flex items-center gap-2">
              <Droplets className="text-blue-600 shrink-0" size={24} />
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-800">
                Stellar Drips
              </span>
            </NavLink>

            <nav aria-label="Main navigation" className="flex items-center gap-1">
              <NavLink to="/" end className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/history" className={navLinkClass}>
                History
              </NavLink>
            </nav>
          </div>

          <ConnectWallet wallet={wallet} onWalletChange={onWalletChange} />
        </div>
      </div>
    </header>
  );
}
