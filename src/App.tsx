import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { PessoasView } from './components/pessoas/PessoasView';
import { ContasView } from './components/contas/ContasView';
import { MensalidadesView } from './components/mensalidades/MensalidadesView';
import { CobrancasView } from './components/cobrancas/CobrancasView';
import { FinanceiroView } from './components/financeiro/FinanceiroView';
import { BackupConfigView } from './components/backup/BackupConfigView';
import { GestaoUsuariosView } from './components/auth/GestaoUsuariosView';
import { ModalBaixaParcela } from './components/contas/ModalBaixaParcela';
import { NotificationCenter } from './components/layout/NotificationCenter';
import { ToastContainer } from './components/layout/ToastContainer';
import { notificationService } from './services/notificationService';

import { LoginView } from './components/auth/LoginView';
import { SecurityAuditModal } from './components/auth/SecurityAuditModal';
import { CommandPaletteModal } from './components/common/CommandPaletteModal';
import { authService, AuthSession } from './services/authService';
import { securityEngine } from './services/securityEngine';

import { storageService } from './services/storage';
import { financialEngine } from './services/financialEngine';
import {
  Pessoa,
  Conta,
  Mensalidade,
  ParcelaComPessoa,
  ResumoDashboard,
  ConfiguracoesApp,
} from './types';

export const App: React.FC = () => {
  // Estado de Autenticação JWT
  const [session, setSession] = useState<AuthSession | null>(authService.obterSessao());
  const [isAuth, setIsAuth] = useState<boolean>(authService.isAutenticado());
  const [securityModalOpen, setSecurityModalOpen] = useState<boolean>(false);

  // Estados da Aplicação
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [parcelasEnriquecidas, setParcelasEnriquecidas] = useState<ParcelaComPessoa[]>([]);
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
  const [config, setConfig] = useState<ConfiguracoesApp>(storageService.getConfig());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('rr_sidebar_collapsed') === 'true';
  });

  // Modal de Baixa de Parcela Global
  const [parcelaEmBaixa, setParcelaEmBaixa] = useState<ParcelaComPessoa | null>(null);
  const [modalBaixaAberto, setModalBaixaAberto] = useState(false);

  // Central de Notificações & Command Palette (Ctrl+K)
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [abrirNovaContaModal, setAbrirNovaContaModal] = useState(false);
  const [abrirNovoClienteModal, setAbrirNovoClienteModal] = useState(false);

  // Atalho global universal: Ctrl + K (ou Cmd + K) para abrir busca rápida
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, []);

  // Auto-reset dos gatilhos de abertura rápida
  useEffect(() => {
    if (abrirNovaContaModal) {
      const t = setTimeout(() => setAbrirNovaContaModal(false), 300);
      return () => clearTimeout(t);
    }
  }, [abrirNovaContaModal]);

  useEffect(() => {
    if (abrirNovoClienteModal) {
      const t = setTimeout(() => setAbrirNovoClienteModal(false), 300);
      return () => clearTimeout(t);
    }
  }, [abrirNovoClienteModal]);

  const isUpdatingHashRef = useRef(false);

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('rr_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Escuta alterações de estado de autenticação
  useEffect(() => {
    const unsub = authService.onAuthStateChange((novaSessao) => {
      setSession(novaSessao);
      setIsAuth(!!novaSessao && authService.isAutenticado());
    });
    return () => unsub();
  }, []);

  const carregarDados = useCallback(async () => {
    storageService.init();
    // Carregamento rápido imediato do estado local
    setPessoas(storageService.getPessoas());
    setContas(storageService.getContas());
    setMensalidades(storageService.getMensalidades());
    setParcelasEnriquecidas(financialEngine.getParcelasEnriquecidas());
    const resumoCalculado = financialEngine.calcularResumoDashboard();
    setResumo(resumoCalculado);
    if (resumoCalculado) {
      notificationService.verificarAlertasVencimento(
        resumoCalculado.vencimentosHoje.length,
        resumoCalculado.parcelasVencidas.length
      );
    }
    setConfig(storageService.getConfig());

    // Sincronização direta com o Supabase em segundo plano
    try {
      const dadosNuvem = await storageService.sincronizarComSupabase();
      if (dadosNuvem) {
        setPessoas(dadosNuvem.pessoas);
        setContas(dadosNuvem.contas);
        setMensalidades(dadosNuvem.mensalidades);
        setParcelasEnriquecidas(financialEngine.getParcelasEnriquecidas());
        const resumoNuvem = financialEngine.calcularResumoDashboard();
        setResumo(resumoNuvem);
        if (resumoNuvem) {
          notificationService.verificarAlertasVencimento(
            resumoNuvem.vencimentosHoje.length,
            resumoNuvem.parcelasVencidas.length
          );
        }
      }
    } catch (err) {
      console.warn('Sincronização em segundo plano:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuth) {
      carregarDados();
    }
  }, [isAuth, carregarDados]);

  // Sincronização de URL Criptografada (AES-GCM na Hash da URL)
  useEffect(() => {
    if (!isAuth) return;

    const sincronizarUrlComAba = async () => {
      if (isUpdatingHashRef.current) return;
      isUpdatingHashRef.current = true;
      try {
        const tokenCifrado = await securityEngine.criptografarEstadoUrl({ tab: activeTab });
        if (tokenCifrado) {
          window.location.hash = `enc=${tokenCifrado}`;
        }
      } finally {
        setTimeout(() => {
          isUpdatingHashRef.current = false;
        }, 100);
      }
    };

    sincronizarUrlComAba();
  }, [activeTab, isAuth]);

  // Decifrar URL inicial ou eventos de hashchange
  useEffect(() => {
    if (!isAuth) return;

    const lerHashCifrada = async () => {
      if (isUpdatingHashRef.current) return;
      const hash = window.location.hash;
      if (hash.startsWith('#enc=')) {
        const token = hash.replace('#enc=', '');
        const decifrado = await securityEngine.decifrarEstadoUrl(token);
        if (decifrado && decifrado.tab) {
          const tabValida: ActiveTab[] = [
            'dashboard',
            'pessoas',
            'receber',
            'pagar',
            'mensalidades',
            'cobrancas',
            'financeiro',
            'relatorios',
            'config',
            'usuarios',
          ];
          if (tabValida.includes(decifrado.tab)) {
            setActiveTab(decifrado.tab);
          }
        }
      }
    };

    lerHashCifrada();
    window.addEventListener('hashchange', lerHashCifrada);
    return () => window.removeEventListener('hashchange', lerHashCifrada);
  }, [isAuth]);

  const handleLogout = () => {
    authService.fazerLogout();
    window.location.hash = '';
  };

  const handleAbrirBaixa = (parcela: ParcelaComPessoa) => {
    setParcelaEmBaixa(parcela);
    setModalBaixaAberto(true);
  };

  const handleBaixaConcluida = () => {
    carregarDados();
  };

  // Se não estiver autenticado, exibe a Página de Login Moderna e Segura
  if (!isAuth) {
    return (
      <>
        <LoginView
          onLoginSuccess={(novaSessao) => {
            setSession(novaSessao);
            setIsAuth(true);
          }}
          onOpenSecurityModal={() => setSecurityModalOpen(true)}
        />
        <SecurityAuditModal
          isOpen={securityModalOpen}
          onClose={() => setSecurityModalOpen(false)}
        />
      </>
    );
  }

  const alertasCount = (resumo?.vencimentosHoje.length || 0) + (resumo?.parcelasVencidas.length || 0);

  return (
    <div className="app-container">
      {/* Sidebar Lateral (Desktop & Drawer Mobile) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertasCount={alertasCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenSecurityModal={() => setSecurityModalOpen(true)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        userEmail={session?.user?.email}
        onLogout={handleLogout}
      />

      {/* Área Central de Conteúdo */}
      <div className="main-content">
        <Navbar
          activeTab={activeTab}
          empresaNome={config.nomeEmpresa}
          userEmail={session?.user?.email}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNovaConta={(tipo) => {
            setActiveTab(tipo);
            setAbrirNovaContaModal(true);
          }}
          onOpenNovoCliente={() => {
            setActiveTab('pessoas');
            setAbrirNovoClienteModal(true);
          }}
          onOpenGerarLote={() => setActiveTab('mensalidades')}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          onOpenSecurityModal={() => setSecurityModalOpen(true)}
          onOpenNotificacoes={() => setNotificacoesOpen(true)}
          onLogout={handleLogout}
        />

        <div className="content-scrollable">
          {activeTab === 'dashboard' && resumo && (
            <DashboardView
              resumo={resumo}
              onDarBaixa={handleAbrirBaixa}
              onNavigateToCobrancas={() => setActiveTab('cobrancas')}
              onNavigateToReceber={() => setActiveTab('receber')}
              onNavigateToPagar={() => setActiveTab('pagar')}
              onNavigateToFinanceiro={() => setActiveTab('financeiro')}
            />
          )}

          {activeTab === 'pessoas' && (
            <PessoasView
              pessoas={pessoas}
              onRefresh={carregarDados}
              onOpenNovoClienteModal={abrirNovoClienteModal}
            />
          )}

          {activeTab === 'receber' && (
            <ContasView
              tipo="receber"
              contas={contas}
              pessoas={pessoas}
              onRefresh={carregarDados}
              onDarBaixaParcela={handleAbrirBaixa}
              onAlternarTipo={(novoTipo) => setActiveTab(novoTipo)}
              abrirNovaContaInicial={abrirNovaContaModal}
            />
          )}

          {activeTab === 'pagar' && (
            <ContasView
              tipo="pagar"
              contas={contas}
              pessoas={pessoas}
              onRefresh={carregarDados}
              onDarBaixaParcela={handleAbrirBaixa}
              onAlternarTipo={(novoTipo) => setActiveTab(novoTipo)}
              abrirNovaContaInicial={abrirNovaContaModal}
            />
          )}

          {activeTab === 'mensalidades' && (
            <MensalidadesView
              mensalidades={mensalidades}
              pessoas={pessoas}
              onRefresh={carregarDados}
              onDarBaixa={handleAbrirBaixa}
            />
          )}

          {activeTab === 'cobrancas' && (
            <CobrancasView
              parcelas={parcelasEnriquecidas}
            />
          )}

          {(activeTab === 'financeiro' || activeTab === 'relatorios') && (
            <FinanceiroView
              contas={contas}
              pessoas={pessoas}
              parcelas={parcelasEnriquecidas}
              onRefresh={carregarDados}
              onDarBaixa={handleAbrirBaixa}
            />
          )}

          {activeTab === 'config' && (
            <BackupConfigView
              onRefresh={carregarDados}
              onNavigateToUsuarios={() => setActiveTab('usuarios')}
            />
          )}

          {activeTab === 'usuarios' && (
            <GestaoUsuariosView />
          )}
        </div>

        {/* Barra de Navegação Inferior (Mobile iPhone/Android) */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          alertasCount={alertasCount}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onOpenQuickActions={() => setCommandPaletteOpen(true)}
        />
      </div>

      {/* Modal Baixa de Parcela */}
      <ModalBaixaParcela
        isOpen={modalBaixaAberto}
        parcela={parcelaEmBaixa}
        onClose={() => setModalBaixaAberto(false)}
        onSuccess={handleBaixaConcluida}
      />

      {/* Busca Global & Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        pessoas={pessoas}
        parcelas={parcelasEnriquecidas}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setCommandPaletteOpen(false);
        }}
        onDarBaixaParcela={handleAbrirBaixa}
        onOpenNovaConta={(tipo) => {
          setActiveTab(tipo);
          setAbrirNovaContaModal(true);
          setCommandPaletteOpen(false);
        }}
        onOpenNovoCliente={() => {
          setActiveTab('pessoas');
          setAbrirNovoClienteModal(true);
          setCommandPaletteOpen(false);
        }}
      />

      {/* Modal de Cibersegurança & Auditoria */}
      <SecurityAuditModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
      />

      {/* Central de Notificações Popover / Modal */}
      <NotificationCenter
        isOpen={notificacoesOpen}
        onClose={() => setNotificacoesOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setNotificacoesOpen(false);
        }}
      />

      {/* Notificações Toasts Flutuantes em Tempo Real */}
      <ToastContainer onNavigateTab={(tab) => setActiveTab(tab)} />
    </div>
  );
};

export default App;
