import React from 'react';
import { Menu, Calendar } from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface NavbarProps {
  activeTab: ActiveTab;
  onToggleMobileMenu: () => void;
  userEmail?: string;
  onLogout?: () => void;
  // Propriedades opcionais legadas para compatibilidade
  empresaNome?: string;
  onOpenNovaConta?: () => void;
  onOpenNovoCliente?: () => void;
  onOpenGerarLote?: () => void;
  onOpenSecurityModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onToggleMobileMenu,
  userEmail,
  onLogout,
}) => {
  const getTabInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard', desc: 'Visão geral de liquidez, fluxo de caixa e vencimentos' };
      case 'pessoas':
        return { title: 'Clientes & Pessoas', desc: 'Cadastro de pessoas com emissão e vencimento de mensalidades' };
      case 'receber':
        return { title: 'Contas a Receber', desc: 'Faturas, mensalidades e parcelamentos' };
      case 'pagar':
        return { title: 'Contas a Pagar', desc: 'Despesas operacionais e fornecedores' };
      case 'mensalidades':
        return { title: 'Mensalidades & Lotes', desc: 'Geração automática e avulsa de recorrência' };
      case 'cobrancas':
        return { title: 'Central de Cobranças & WhatsApp', desc: 'Lembretes automáticos e gestão de templates pré-moldados' };
      case 'financeiro':
      case 'relatorios':
        return { title: 'Financeiro & Controladoria', desc: 'Central unificada de faturamento, liquidações, fluxo de caixa e relatórios em Excel' };
      case 'config':
        return { title: 'Backup & Supabase', desc: 'Sincronização em nuvem e ajustes' };
      case 'usuarios':
        return { title: 'Gestão de Acessos & Usuários', desc: 'Controle de contas administrativas, operadores e permissões' };
      default:
        return { title: 'RR Financeiro', desc: 'Sistema de Gestão' };
    }
  };

  const info = getTabInfo();

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        {/* Botão Hamburger (Mobile) */}
        <button
          className="mobile-hamburger-btn"
          onClick={onToggleMobileMenu}
          aria-label="Abrir Menu"
        >
          <Menu size={22} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h1 className="header-page-title">{info.title}</h1>
          <p className="header-page-desc desktop-only">{info.desc}</p>
        </div>
      </div>

      {/* Lado Direito da Navbar: Limpo e Executivo */}
      <div className="header-actions desktop-only">
        <div
          style={{
            fontSize: '0.8rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
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
