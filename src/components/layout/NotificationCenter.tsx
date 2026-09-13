import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertOctagon,
  ArrowRight,
  Filter,
  Check,
  Clock,
  Sparkles,
  Inbox
} from 'lucide-react';
import { NotificacaoSistema } from '../../types';
import { ActiveTab } from './Sidebar';
import { notificationService } from '../../services/notificationService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

type FiltroNotificacao = 'todas' | 'nao_lidas' | 'financeiro' | 'cobranca' | 'sistema';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoSistema[]>([]);
  const [filtro, setFiltro] = useState<FiltroNotificacao>('todas');

  useEffect(() => {
    const unsub = notificationService.inscreverNotificacoes((lista) => {
      setNotificacoes(lista);
    });
    return () => unsub();
  }, []);

  // Fechar com tecla ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const naoLidasCount = useMemo(() => {
    return notificacoes.filter((n) => !n.lida).length;
  }, [notificacoes]);

  const notificacoesFiltradas = useMemo(() => {
    return notificacoes.filter((n) => {
      if (filtro === 'nao_lidas') return !n.lida;
      if (filtro === 'financeiro') return n.categoria === 'financeiro' || n.categoria === 'baixa';
      if (filtro === 'cobranca') return n.categoria === 'cobranca';
      if (filtro === 'sistema') return n.categoria === 'sistema' || n.categoria === 'seguranca' || n.categoria === 'cliente';
      return true;
    });
  }, [notificacoes, filtro]);

  if (!isOpen) return null;

  const formatarDataHora = (dataIso: string) => {
    try {
      const data = new Date(dataIso);
      const agora = new Date();
      const diffMs = agora.getTime() - data.getTime();
      const diffMin = Math.floor(diffMs / 60000);

      if (diffMin < 1) return 'Agora mesmo';
      if (diffMin < 60) return `Há ${diffMin} min`;
      
      const hoje = agora.toDateString() === data.toDateString();
      if (hoje) {
        return `Hoje às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }

      const ontem = new Date(agora);
      ontem.setDate(agora.getDate() - 1);
      if (ontem.toDateString() === data.toDateString()) {
        return `Ontem às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }

      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dataIso;
    }
  };

  const renderIcone = (tipo: string) => {
    switch (tipo) {
      case 'sucesso':
        return <CheckCircle2 size={18} className="text-emerald-600" />;
      case 'erro':
        return <AlertOctagon size={18} className="text-rose-600" />;
      case 'aviso':
        return <AlertTriangle size={18} className="text-amber-500" />;
      default:
        return <Info size={18} className="text-blue-600" />;
    }
  };

  const handleActionClick = (notif: NotificacaoSistema) => {
    if (notif.linkAcao) {
      notificationService.marcarComoLida(notif.id);
      onNavigateTab(notif.linkAcao.tab);
      onClose();
    }
  };

  return (
    <div className="rr-notif-backdrop" onClick={onClose}>
      <div
        className="rr-notif-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Central de Notificações"
      >
        {/* Cabeçalho da Central */}
        <div className="rr-notif-header">
          <div className="rr-notif-header-title">
            <div className="rr-notif-bell-icon-wrapper">
              <Bell size={18} />
              {naoLidasCount > 0 && <span className="rr-notif-bell-ping" />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 className="rr-notif-title-text">Central de Notificações</h2>
                {naoLidasCount > 0 ? (
                  <span className="rr-notif-pill-counter">
                    {naoLidasCount} nova{naoLidasCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="rr-notif-pill-all-read">Em dia</span>
                )}
              </div>
              <p className="rr-notif-subtitle">Histórico de ações, liquidações e alertas do sistema</p>
            </div>
          </div>

          <button
            className="rr-notif-close-btn"
            onClick={onClose}
            aria-label="Fechar Central de Notificações"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="rr-notif-quick-actions">
          <button
            className="rr-notif-quick-btn"
            onClick={() => notificationService.marcarTodasComoLidas()}
            disabled={naoLidasCount === 0}
            title="Marcar todas como lidas"
          >
            <CheckCheck size={14} />
            <span>Marcar todas como lidas</span>
          </button>

          <button
            className="rr-notif-quick-btn rr-notif-quick-btn-danger"
            onClick={() => notificationService.limparLidas()}
            title="Excluir notificações lidas"
          >
            <Trash2 size={14} />
            <span>Limpar lidas</span>
          </button>
        </div>

        {/* Filtros em Abas */}
        <div className="rr-notif-tabs">
          <button
            className={`rr-notif-tab ${filtro === 'todas' ? 'active' : ''}`}
            onClick={() => setFiltro('todas')}
          >
            Todas ({notificacoes.length})
          </button>
          <button
            className={`rr-notif-tab ${filtro === 'nao_lidas' ? 'active' : ''}`}
            onClick={() => setFiltro('nao_lidas')}
          >
            Não Lidas {naoLidasCount > 0 && <span className="rr-tab-badge">{naoLidasCount}</span>}
          </button>
          <button
            className={`rr-notif-tab ${filtro === 'financeiro' ? 'active' : ''}`}
            onClick={() => setFiltro('financeiro')}
          >
            Financeiro
          </button>
          <button
            className={`rr-notif-tab ${filtro === 'cobranca' ? 'active' : ''}`}
            onClick={() => setFiltro('cobranca')}
          >
            Cobranças
          </button>
          <button
            className={`rr-notif-tab ${filtro === 'sistema' ? 'active' : ''}`}
            onClick={() => setFiltro('sistema')}
          >
            Sistema
          </button>
        </div>

        {/* Lista de Notificações */}
        <div className="rr-notif-body">
          {notificacoesFiltradas.length === 0 ? (
            <div className="rr-notif-empty">
              <div className="rr-notif-empty-icon">
                <Inbox size={36} color="#94a3b8" />
              </div>
              <h4 className="rr-notif-empty-title">Nenhuma notificação encontrada</h4>
              <p className="rr-notif-empty-desc">
                {filtro === 'nao_lidas'
                  ? 'Parabéns! Todas as notificações foram marcadas como lidas.'
                  : 'Nenhum evento registrado nesta categoria no momento.'}
              </p>
            </div>
          ) : (
            <div className="rr-notif-list">
              {notificacoesFiltradas.map((item) => (
                <div
                  key={item.id}
                  className={`rr-notif-card ${!item.lida ? 'rr-notif-unread' : 'rr-notif-read'}`}
                >
                  <div className="rr-notif-card-main">
                    <div className="rr-notif-icon-bubble rr-notif-bubble-{item.tipo}">
                      {renderIcone(item.tipo)}
                    </div>

                    <div className="rr-notif-card-info">
                      <div className="rr-notif-card-meta">
                        <span className={`rr-notif-cat-tag cat-${item.categoria}`}>
                          {item.categoria.toUpperCase()}
                        </span>
                        <span className="rr-notif-time-str">
                          <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                          {formatarDataHora(item.dataHora)}
                        </span>
                        {!item.lida && <span className="rr-notif-unread-dot" title="Não lida" />}
                      </div>

                      <h4 className="rr-notif-card-title">{item.titulo}</h4>
                      <p className="rr-notif-card-message">{item.mensagem}</p>

                      {/* Botão de Ação / Navegação */}
                      {item.linkAcao && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <button
                            className="rr-notif-action-link"
                            onClick={() => handleActionClick(item)}
                          >
                            <span>{item.linkAcao.label}</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas do Item */}
                  <div className="rr-notif-item-actions">
                    <button
                      className="rr-notif-item-btn"
                      onClick={() =>
                        item.lida
                          ? notificationService.marcarComoNaoLida(item.id)
                          : notificationService.marcarComoLida(item.id)
                      }
                      title={item.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                    >
                      <Check size={14} color={item.lida ? '#94a3b8' : '#16a34a'} />
                      <span className="rr-notif-btn-label">
                        {item.lida ? 'Lida' : 'Marcar lida'}
                      </span>
                    </button>

                    <button
                      className="rr-notif-item-btn rr-notif-item-delete"
                      onClick={() => notificationService.removerNotificacao(item.id)}
                      title="Excluir notificação"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé da Central */}
        <div className="rr-notif-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem' }}>
            <Sparkles size={13} color="#2563eb" />
            <span>Notificações sincronizadas em tempo real</span>
          </div>
          <button
            className="rr-notif-footer-close"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
