import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Menu, X } from 'lucide-react';

const Layout = ({ children, showNavigation = true }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <div className="app-shell flex h-screen w-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {showNavigation && mobileNavOpen && <button className="mobile-nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      {showNavigation && <Sidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {showNavigation && <div className="app-topbar">
          <button className="mobile-nav-toggle" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileNavOpen(!mobileNavOpen)}>{mobileNavOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <Navbar />
        </div>}
        <main className={`flex-1 overflow-y-auto ${showNavigation ? 'app-main p-7 bg-slate-50' : 'p-5 bg-slate-50'}`}>
          <div className={showNavigation ? 'app-content max-w-7xl mx-auto space-y-6' : 'w-full'}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
