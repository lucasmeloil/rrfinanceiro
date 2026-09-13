import { NotificacaoSistema, ToastNotificacao, TipoNotificacao, CategoriaNotificacao } from '../types';
import { ActiveTab } from '../components/layout/Sidebar';

const STORAGE_KEY = 'rr_notificacoes_sistema';
const MAX_NOTIFICACOES = 100;

type NotificacaoListener = (notificacoes: NotificacaoSistema[]) => void;
type ToastListener = (toast: ToastNotificacao) => void;

class NotificationService {
  private listeners: Set<NotificacaoListener> = new Set();
  private toastListeners: Set<ToastListener> = new Set();
  private notificacoesMemoria: NotificacaoSistema[] | null = null;
  private alertasVerificadosHoje = false;

  constructor() {
    this.carregarNotificacoes();
  }

  private carregarNotificacoes(): NotificacaoSistema[] {
    if (this.notificacoesMemoria) {
      return this.notificacoesMemoria;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.notificacoesMemoria = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar notificações do localStorage:', e);
    }

    // Notificações iniciais de boas-vindas / status do sistema se estiver vazio
    const iniciais: NotificacaoSistema[] = [
      {
        id: 'notif-welcome',
        titulo: 'Central de Notificações Ativa',
        mensagem: 'Bem-vindo ao RR Financeiro! Você receberá atualizações em tempo real sobre baixas, faturamentos, cobranças e segurança.',
        tipo: 'info',
        categoria: 'sistema',
        lida: false,
        dataHora: new Date().toISOString(),
        linkAcao: {
          tab: 'dashboard',
          label: 'Ir ao Dashboard',
        },
      },
    ];

    this.salvar(iniciais);
    this.notificacoesMemoria = iniciais;
    return iniciais;
  }

  private salvar(notificacoes: NotificacaoSistema[]) {
    this.notificacoesMemoria = notificacoes;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notificacoes.slice(0, MAX_NOTIFICACOES)));
    } catch (e) {
      console.warn('Erro ao salvar notificações no localStorage:', e);
    }
    this.notificarListeners();
  }

  private notificarListeners() {
    const lista = this.obterNotificacoes();
    this.listeners.forEach((listener) => {
      try {
        listener(lista);
      } catch (e) {
        console.error('Erro em listener de notificação:', e);
      }
    });
  }

  public obterNotificacoes(): NotificacaoSistema[] {
    return [...this.carregarNotificacoes()];
  }

  public obterContadorNaoLidas(): number {
    return this.obterNotificacoes().filter((n) => !n.lida).length;
  }

  public adicionarNotificacao(params: {
    titulo: string;
    mensagem: string;
    tipo?: TipoNotificacao;
    categoria?: CategoriaNotificacao;
    linkAcao?: { tab: ActiveTab; label: string };
    semToast?: boolean;
    duracaoToast?: number;
  }): NotificacaoSistema {
    const nova: NotificacaoSistema = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      titulo: params.titulo,
      mensagem: params.mensagem,
      tipo: params.tipo || 'info',
      categoria: params.categoria || 'sistema',
      lida: false,
      dataHora: new Date().toISOString(),
      linkAcao: params.linkAcao,
    };

    const atuais = this.obterNotificacoes();
    // Evita duplicatas idênticas adicionadas nos últimos 2 segundos
    const duplicada = atuais.slice(0, 3).find(
      (n) => n.titulo === nova.titulo && n.mensagem === nova.mensagem &&
      Math.abs(new Date(n.dataHora).getTime() - new Date(nova.dataHora).getTime()) < 2000
    );

    if (!duplicada) {
      this.salvar([nova, ...atuais]);

      // Dispara Toast animado se semToast não for true
      if (!params.semToast) {
        const toastItem: ToastNotificacao = {
          ...nova,
          duracao: params.duracaoToast || 4500,
        };
        this.toastListeners.forEach((listener) => {
          try {
            listener(toastItem);
          } catch (e) {
            console.error('Erro em listener de toast:', e);
          }
        });
      }
    }

    return nova;
  }

  public marcarComoLida(id: string) {
    const lista = this.obterNotificacoes().map((n) =>
      n.id === id ? { ...n, lida: true } : n
    );
    this.salvar(lista);
  }

  public marcarComoNaoLida(id: string) {
    const lista = this.obterNotificacoes().map((n) =>
      n.id === id ? { ...n, lida: false } : n
    );
    this.salvar(lista);
  }

  public marcarTodasComoLidas() {
    const lista = this.obterNotificacoes().map((n) => ({ ...n, lida: true }));
    this.salvar(lista);
  }

  public removerNotificacao(id: string) {
    const lista = this.obterNotificacoes().filter((n) => n.id !== id);
    this.salvar(lista);
  }

  public limparLidas() {
    const lista = this.obterNotificacoes().filter((n) => !n.lida);
    this.salvar(lista);
  }

  public limparTodas() {
    this.salvar([]);
  }

  // Atalhos práticos
  public sucesso(titulo: string, mensagem: string, linkAcao?: { tab: ActiveTab; label: string }, categoria: CategoriaNotificacao = 'financeiro') {
    return this.adicionarNotificacao({ titulo, mensagem, tipo: 'sucesso', categoria, linkAcao });
  }

  public aviso(titulo: string, mensagem: string, linkAcao?: { tab: ActiveTab; label: string }, categoria: CategoriaNotificacao = 'cobranca') {
    return this.adicionarNotificacao({ titulo, mensagem, tipo: 'aviso', categoria, linkAcao });
  }

  public info(titulo: string, mensagem: string, linkAcao?: { tab: ActiveTab; label: string }, categoria: CategoriaNotificacao = 'sistema') {
    return this.adicionarNotificacao({ titulo, mensagem, tipo: 'info', categoria, linkAcao });
  }

  public erro(titulo: string, mensagem: string, linkAcao?: { tab: ActiveTab; label: string }, categoria: CategoriaNotificacao = 'sistema') {
    return this.adicionarNotificacao({ titulo, mensagem, tipo: 'erro', categoria, linkAcao });
  }

  // Verificação de alertas no Dashboard / Inicialização
  public verificarAlertasVencimento(vencimentosHoje: number, parcelasVencidas: number) {
    if (this.alertasVerificadosHoje) return;
    this.alertasVerificadosHoje = true;

    if (vencimentosHoje > 0) {
      this.adicionarNotificacao({
        titulo: `${vencimentosHoje} parcela(s) vencendo hoje!`,
        mensagem: 'Existem contas com vencimento programado para a data de hoje. Verifique para cobrança ou liquidação.',
        tipo: 'aviso',
        categoria: 'cobranca',
        linkAcao: { tab: 'cobrancas', label: 'Ver Vencimentos Hoje' },
        semToast: false,
      });
    }

    if (parcelasVencidas > 0) {
      this.adicionarNotificacao({
        titulo: `${parcelasVencidas} parcela(s) em atraso`,
        mensagem: 'Detectamos faturas vencidas no sistema. Dispare lembretes de cobrança via WhatsApp.',
        tipo: 'aviso',
        categoria: 'cobranca',
        linkAcao: { tab: 'cobrancas', label: 'Cobrar Inadimplentes' },
        semToast: true,
      });
    }
  }

  // Inscrição de listeners
  public inscreverNotificacoes(listener: NotificacaoListener): () => void {
    this.listeners.add(listener);
    // Notifica de imediato com o estado atual
    listener(this.obterNotificacoes());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public inscreverToasts(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => {
      this.toastListeners.delete(listener);
    };
  }
}

export const notificationService = new NotificationService();
