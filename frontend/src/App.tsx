import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import History from './pages/History';

function App() {
  const [wallet, setWallet] = useState<string | null>(null);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Navbar wallet={wallet} onWalletChange={setWallet} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/history"
            element={<History wallet={wallet} onWalletChange={setWallet} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
