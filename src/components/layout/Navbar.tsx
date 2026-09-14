import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Calendar,
  Bell,
  Search,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { notificationService } from '../../services/notificationService';

interface NavbarProps {
  activeTab: ActiveTab;
  onToggleMobileMenu: () => void;
  onOpenNotificacoes?: () => void;
  onOpenCommandPalette?: () => void;
  userEmail?: string;
  onLogout?: () => void;
  empresaNome?: string;
  onOpenNovaConta?: (tipo: 'receber' | 'pagar') => void;
  onOpenNovoCliente?: () => void;
  onOpenGerarLote?: () => void;
  onOpenSecurityModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onToggleMobileMenu,
  onOpenNotificacoes,
  onOpenCommandPalette,
  empresaNome,
  onOpenNovaConta,
  onOpenNovoCliente,
  onOpenGerarLote,
}) => {
  const [unreadCount, setUnreadCount] = useState<number>(() => notificationService.obterContadorNaoLidas());
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = notificationService.inscreverNotificacoes((notifs) => {
      setUnreadCount(notifs.filter((n) => !n.lida).length);
    });
    return () => unsub();
  }, []);

  // Fechar menu de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) {
        setQuickMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard', desc: 'Visão geral de liquidez, fluxo de caixa e vencimentos' };
      case 'pessoas':
        return { title: 'Clientes & Fornecedores', desc: 'Cadastro de pessoas físicas e jurídicas com dados fiscais' };
      case 'receber':
        return { title: 'Contas a Receber', desc: 'Faturas de clientes, vendas e parcelamentos' };
      case 'pagar':
        return { title: 'Contas a Pagar', desc: 'Despesas operacionais, fornecedores e custos' };
      case 'mensalidades':
        return { title: 'Mensalidades & Lotes', desc: 'Geração automática e controle de recorrência' };
      case 'cobrancas':
        return { title: 'Central de Cobranças & WhatsApp', desc: 'Lembretes inteligentes e avisos de vencimento' };
      case 'financeiro':
      case 'relatorios':
        return { title: 'Financeiro & Controladoria', desc: 'Extrato analítico, conciliação e relatórios em Excel' };
      case 'config':
        return { title: 'Backup & Configurações', desc: 'Sincronização em nuvem e integridade de dados' };
      case 'usuarios':
        return { title: 'Gestão de Acessos & Usuários', desc: 'Controle de administradores e permissões' };
      default:
        return { title: empresaNome || 'RR Financeiro', desc: 'Sistema de Gestão Financeira' };
    }
  };

  const getMobileTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return empresaNome ? (empresaNome.length > 18 ? 'RR Financeiro' : empresaNome) : 'RR Financeiro';
      case 'receber':
        return 'A Receber';
      case 'pagar':
        return 'A Pagar';
      case 'mensalidades':
        return 'Mensalidades';
      case 'cobrancas':
        return 'Cobranças';
      case 'financeiro':
      case 'relatorios':
        return 'Financeiro';
      case 'pessoas':
        return 'Clientes';
      case 'config':
        return 'Configurações';
      case 'usuarios':
        return 'Usuários';
      default:
        return 'RR Financeiro';
    }
  };

  const info = getTabInfo();
  const mobileTitle = getMobileTitle();

  return (
    <header className="top-header">
      {/* Lado Esquerdo: Hamburger Mobile + Título da Página Limpo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
        <button
          className="mobile-hamburger-btn"
          onClick={onToggleMobileMenu}
          aria-label="Abrir Menu Lateral"
          title="Menu de navegação e configurações"
        >
          <Menu size={22} />
        </button>

        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div className="brand-logo-badge-sm mobile-only" title="RR Financeiro">
            <img src="/logo-rr.png" alt="RR" />
          </div>
          <h1 className="header-page-title desktop-only">{info.title}</h1>
          <h1 className="header-page-title mobile-only" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            {mobileTitle}
          </h1>
          <p className="header-page-desc desktop-only">{info.desc}</p>
        </div>
      </div>

      {/* Centro: Barra de Busca Global / Command Palette (Ctrl+K) */}
      <div className="navbar-search-wrapper desktop-only">
        <button
          type="button"
          className="navbar-search-btn"
          onClick={onOpenCommandPalette}
          title="Buscar clientes, faturas ou ações rápidas (Ctrl+K)"
        >
          <Search size={16} color="var(--text-muted)" />
          <span className="navbar-search-placeholder">Buscar clientes, faturas ou ações...</span>
          <span className="navbar-search-kbd">Ctrl + K</span>
        </button>
      </div>

      {/* Lado Direito: Ações Rápidas (Desktop) + Busca & Notificações (Mobile) */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Botão de Busca Mobile Elegante */}
        <button
          className="btn-icon mobile-search-trigger"
          onClick={onOpenCommandPalette}
          title="Buscar (Ctrl+K)"
          aria-label="Buscar clientes ou faturas"
        >
          <Search size={18} />
        </button>

        {/* Central de Ações Rápidas Dropdown (+ Nova Operação) - Apenas Desktop, no mobile usamos o FAB (+) inferior */}
        <div className="quick-actions-dropdown-container desktop-only" ref={quickMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-primary quick-action-btn"
            onClick={() => setQuickMenuOpen((prev) => !prev)}
            aria-expanded={quickMenuOpen}
            title="Adicionar nova conta ou cliente de qualquer tela"
          >
            <Plus size={17} strokeWidth={2.4} />
            <span className="desktop-only">Nova Operação</span>
            <ChevronDown size={14} style={{ opacity: 0.8 }} />
          </button>

          {quickMenuOpen && (
            <div className="quick-actions-dropdown-menu">
              <div className="quick-actions-dropdown-header">
                Ações Rápidas Globais
              </div>

              <button
                className="quick-action-item"
                onClick={() => {
                  setQuickMenuOpen(false);
                  if (onOpenNovaConta) onOpenNovaConta('receber');
                }}
              >
                <div className="quick-action-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <ArrowDownCircle size={17} />
                </div>
                <div>
                  <div className="quick-action-title">Nova Conta a Receber</div>
                  <div className="quick-action-desc">Fatura ou parcelamento de cliente</div>
                </div>
              </button>

              <button
                className="quick-action-item"
                onClick={() => {
                  setQuickMenuOpen(false);
                  if (onOpenNovaConta) onOpenNovaConta('pagar');
                }}
              >
                <div className="quick-action-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                  <ArrowUpCircle size={17} />
                </div>
                <div>
                  <div className="quick-action-title">Nova Conta a Pagar</div>
                  <div className="quick-action-desc">Despesa, custo ou fornecedor</div>
                </div>
              </button>

              <div className="quick-action-divider" />

              <button
                className="quick-action-item"
                onClick={() => {
                  setQuickMenuOpen(false);
                  if (onOpenNovoCliente) onOpenNovoCliente();
                }}
              >
                <div className="quick-action-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <Users size={17} />
                </div>
                <div>
                  <div className="quick-action-title">Novo Cliente / Fornecedor</div>
                  <div className="quick-action-desc">Cadastro com busca CNPJ/CEP</div>
                </div>
              </button>

              <button
                className="quick-action-item"
                onClick={() => {
                  setQuickMenuOpen(false);
                  if (onOpenGerarLote) onOpenGerarLote();
                }}
              >
                <div className="quick-action-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                  <CalendarDays size={17} />
                </div>
                <div>
                  <div className="quick-action-title">Gerar Mensalidades em Lote</div>
                  <div className="quick-action-desc">Emissão em massa do mês</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Botão Sino de Notificações */}
        <button
          className="rr-nav-bell-btn"
          onClick={onOpenNotificacoes}
          title={unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Central de Notificações'}
          aria-label="Abrir Central de Notificações"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="rr-nav-bell-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Data Executiva (Apenas Desktop) */}
        <div
          className="desktop-only"
          style={{
            fontSize: '0.8rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
          }}
        >
          <Calendar size={14} color="#64748b" />
          <span style={{ textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
