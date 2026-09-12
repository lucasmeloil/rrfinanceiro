import React from 'react';
import {
  LayoutDashboard,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  BellRing,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
  LogOut,
  DollarSign,
  ChevronUp,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'pessoas'
  | 'receber'
  | 'pagar'
  | 'mensalidades'
  | 'cobrancas'
  | 'financeiro'
  | 'relatorios'
  | 'config'
  | 'usuarios';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  alertasCount: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenSecurityModal?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  alertasCount,
  mobileOpen = false,
  onCloseMobile,
  onOpenSecurityModal,
  isCollapsed = false,
  onToggleCollapse,
  userEmail,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pessoas', label: 'Clientes & Pessoas', icon: Users },
    { id: 'receber', label: 'Contas a Receber', icon: ArrowDownCircle },
    { id: 'pagar', label: 'Contas a Pagar', icon: ArrowUpCircle },
    { id: 'mensalidades', label: 'Mensalidades & Lotes', icon: CalendarDays },
    { id: 'cobrancas', label: 'Cobranças & WhatsApp', icon: BellRing, badge: alertasCount },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'config', label: 'Backup & Supabase', icon: Settings },
    { id: 'usuarios', label: 'Gestão de Acessos', icon: UserCheck },
  ];

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isEffectivelyCollapsed = isCollapsed && !mobileOpen;

  return (
    <>
      {/* Backdrop para mobile */}
      {mobileOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isEffectivelyCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-badge" title="RR Financeiro">
            <ShieldCheck size={22} />
          </div>

          <div className="sidebar-header-text" style={{ flex: 1, minWidth: 0 }}>
            <div className="logo-title">RR Financeiro</div>
            <div className="logo-subtitle">Gestão Financeira</div>
          </div>

          {/* Botão de Recolher/Expandir (Desktop Retrátil) */}
          {onToggleCollapse && (
            <button
              className="desktop-collapse-btn desktop-only"
              onClick={onToggleCollapse}
              title={isEffectivelyCollapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
              aria-label="Alternar Menu Retrátil"
            >
              {isEffectivelyCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}

          {mobileOpen && (
            <button
              className="btn-icon mobile-close-btn"
              onClick={onCloseMobile}
              title="Fechar menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id as ActiveTab)}
                title={isEffectivelyCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-badge" title={`${item.badge} alertas`}>
                    {!isEffectivelyCollapsed && item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {isEffectivelyCollapsed ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 5px rgba(37, 99, 235, 0.25)',
                }}
                title={`Usuário: ${userEmail || 'Administrador'}`}
              >
                {userEmail ? userEmail[0].toUpperCase() : 'A'}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="btn-icon"
                  style={{
                    color: '#dc2626',
                    padding: '0.35rem',
                    borderRadius: '8px',
                    backgroundColor: '#fff1f2',
                    border: '1px solid #fecaca',
                  }}
                  title="Encerrar Sessão"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="sidebar-footer-profile" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {userEmail ? userEmail[0].toUpperCase() : 'A'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={userEmail || 'Administrador'}
                  >
                    {userEmail || 'Administrador'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16a34a' }} />
                    <span>Sessão Ativa</span>
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    borderColor: '#fca5a5',
                    backgroundColor: '#fff1f2',
                    color: '#dc2626',
                    fontWeight: 600,
                    gap: '0.45rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                  }}
                  title="Encerrar Sessão"
                >
                  <LogOut size={15} color="#dc2626" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Barra de Recolhimento Retrátil Inferior (Mobile) */}
        {mobileOpen && (
          <div
            className="mobile-retract-bar"
            onClick={onCloseMobile}
            role="button"
            tabIndex={0}
            title="Toque para recolher o menu"
          >
            <div className="mobile-retract-pill" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ChevronUp size={15} />
              <span>Toque para recolher menu</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
