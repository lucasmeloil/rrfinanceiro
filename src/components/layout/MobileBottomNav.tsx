import React from 'react';
import {
  LayoutDashboard,
  ArrowDownCircle,
  BellRing,
  Plus,
  CalendarDays,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMenu?: () => void;
  onOpenQuickActions?: () => void;
  alertasCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickActions,
  alertasCount,
}) => {
  return (
    <div className="mobile-bottom-nav">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard size={20} />
        <span>Início</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'receber' || activeTab === 'pagar' ? 'active' : ''}`}
        onClick={() => setActiveTab('receber')}
      >
        <ArrowDownCircle size={20} />
        <span>Contas</span>
      </button>

      {/* Botão de Ação Central Flutuante (+) */}
      <button
        type="button"
        className="bottom-nav-fab"
        onClick={onOpenQuickActions}
        title="Nova Operação"
        aria-label="Nova Operação"
      >
        <div className="bottom-nav-fab-inner">
          <Plus size={22} color="#ffffff" strokeWidth={2.6} />
        </div>
      </button>

      {/* Mensalidades Recorrentes (Substitui Menu) */}
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'mensalidades' ? 'active' : ''}`}
        onClick={() => setActiveTab('mensalidades')}
        title="Mensalidades Recorrentes"
      >
        <CalendarDays size={20} />
        <span>Mensalidades</span>
      </button>

      {/* Central de Cobranças e WhatsApp */}
      <button
        type="button"
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

export default MobileBottomNav;
