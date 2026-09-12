import React from 'react';
import {
  LayoutDashboard,
  ArrowDownCircle,
  CalendarDays,
  BellRing,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMenu?: () => void;
  alertasCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  alertasCount,
}) => {
  return (
    <div className="mobile-bottom-nav">
      <button
        className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard size={20} />
        <span>Início</span>
      </button>

      <button
        className={`bottom-nav-item ${activeTab === 'receber' || activeTab === 'pagar' ? 'active' : ''}`}
        onClick={() => setActiveTab('receber')}
      >
        <ArrowDownCircle size={20} />
        <span>Contas</span>
      </button>

      <button
        className={`bottom-nav-item ${activeTab === 'mensalidades' ? 'active' : ''}`}
        onClick={() => setActiveTab('mensalidades')}
      >
        <CalendarDays size={20} />
        <span>Mensalidades</span>
      </button>

      <button
        className={`bottom-nav-item ${activeTab === 'cobrancas' ? 'active' : ''}`}
        onClick={() => setActiveTab('cobrancas')}
      >
        <div style={{ position: 'relative' }}>
          <BellRing size={20} />
          {alertasCount > 0 && <span className="bottom-nav-badge">{alertasCount}</span>}
        </div>
        <span>Cobranças</span>
      </button>
    </div>
  );
};
