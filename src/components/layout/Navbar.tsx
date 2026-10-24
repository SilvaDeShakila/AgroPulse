import { Sprout } from 'lucide-react';

interface NavbarProps {
  onNavigate: (section: 'landing' | 'features' | 'marketplace' | 'about' | 'contact') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  activeSection: string;
}

export function Navbar({ onNavigate, onOpenAuth, activeSection }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title wordmark, single element */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#1B4332] whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1B4332] text-[#52B788] flex items-center justify-center">
            <Sprout className="w-5 h-5 text-[#52B788]" />
          </div>
          <span className="font-display">AgroPulse</span>
        </button>

        {/* Zone 2: 4-5 nav links, 1-2 word labels, single-line text links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('features')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#1B4332] ${
              activeSection === 'features' ? 'text-[#1B4332] font-semibold underline underline-offset-8' : ''
            }`}
          >
            Capabilities
          </button>
          <button
            onClick={() => onNavigate('marketplace')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#1B4332] ${
              activeSection === 'marketplace' ? 'text-[#1B4332] font-semibold underline underline-offset-8' : ''
            }`}
          >
            Marketplace
          </button>
          <button
            onClick={() => onNavigate('about')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#1B4332] ${
              activeSection === 'about' ? 'text-[#1B4332] font-semibold underline underline-offset-8' : ''
            }`}
          >
            Agronomy
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#1B4332] ${
              activeSection === 'contact' ? 'text-[#1B4332] font-semibold underline underline-offset-8' : ''
            }`}
          >
            Contact
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onOpenAuth('login')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#1B4332] hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
          >
            Sign In
          </button>
          <button
            onClick={() => onOpenAuth('register')}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            Register Farm
          </button>
        </div>
      </div>
    </header>
  );
}
