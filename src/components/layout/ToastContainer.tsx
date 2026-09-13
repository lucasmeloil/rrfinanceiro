import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertOctagon,
  X,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { ToastNotificacao } from '../../types';
import { ActiveTab } from './Sidebar';
import { notificationService } from '../../services/notificationService';

interface ToastContainerProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

interface ToastItemState extends ToastNotificacao {
  tempoRestante: number;
  duracaoTotal: number;
  pausado: boolean;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ onNavigateTab }) => {
  const [toasts, setToasts] = useState<ToastItemState[]>([]);

  useEffect(() => {
    const unsub = notificationService.inscreverToasts((novoToast) => {
      const duracao = novoToast.duracao || 4500;
      const item: ToastItemState = {
        ...novoToast,
        tempoRestante: duracao,
        duracaoTotal: duracao,
        pausado: false,
      };

      setToasts((atuais) => {
        // Limita a 4 toasts simultâneos
        const filtrados = atuais.slice(0, 3);
        return [item, ...filtrados];
      });
    });

    return () => unsub();
  }, []);

  // Intervalo do timer para barra de progresso
  useEffect(() => {
    if (toasts.length === 0) return;

    const interval = setInterval(() => {
      setToasts((atuais) =>
        atuais
          .map((t) => {
            if (t.pausado) return t;
            return {
              ...t,
              tempoRestante: t.tempoRestante - 100,
            };
          })
          .filter((t) => t.tempoRestante > 0)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [toasts.length]);

  const handleRemover = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handlePausar = useCallback((id: string, pausado: boolean) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pausado } : t))
    );
  }, []);

  const handleActionClick = (toast: ToastItemState) => {
    if (toast.linkAcao) {
      notificationService.marcarComoLida(toast.id);
      onNavigateTab(toast.linkAcao.tab);
      handleRemover(toast.id);
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="rr-toast-container" role="region" aria-label="Notificações em tempo real">
      {toasts.map((toast) => {
        const percent = Math.max(0, (toast.tempoRestante / toast.duracaoTotal) * 100);

        let icon = <CheckCircle2 size={20} className="toast-icon-sucesso" />;
        let borderColor = 'rgba(16, 185, 129, 0.4)';
        let bgGradient = 'linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(255, 255, 255, 0.98))';
        let badgeBg = '#dcfce7';
        let badgeColor = '#15803d';

        if (toast.tipo === 'erro') {
          icon = <AlertOctagon size={20} className="toast-icon-erro" />;
          borderColor = 'rgba(239, 68, 68, 0.4)';
          bgGradient = 'linear-gradient(135deg, rgba(254, 242, 242, 0.98), rgba(255, 255, 255, 0.98))';
          badgeBg = '#fee2e2';
          badgeColor = '#b91c1c';
        } else if (toast.tipo === 'aviso') {
          icon = <AlertTriangle size={20} className="toast-icon-aviso" />;
          borderColor = 'rgba(245, 158, 11, 0.4)';
          bgGradient = 'linear-gradient(135deg, rgba(254, 243, 199, 0.98), rgba(255, 255, 255, 0.98))';
          badgeBg = '#fef3c7';
          badgeColor = '#b45309';
        } else if (toast.tipo === 'info') {
          icon = <Info size={20} className="toast-icon-info" />;
          borderColor = 'rgba(59, 130, 246, 0.4)';
          bgGradient = 'linear-gradient(135deg, rgba(239, 246, 255, 0.98), rgba(255, 255, 255, 0.98))';
          badgeBg = '#dbeafe';
          badgeColor = '#1d4ed8';
        }

        return (
          <div
            key={toast.id}
            className={`rr-toast-card rr-toast-${toast.tipo}`}
            style={{
              background: bgGradient,
              borderColor: borderColor,
            }}
            onMouseEnter={() => handlePausar(toast.id, true)}
            onMouseLeave={() => handlePausar(toast.id, false)}
          >
            <div className="rr-toast-inner">
              <div className="rr-toast-icon-col">
                {icon}
              </div>

              <div className="rr-toast-content">
                <div className="rr-toast-top-row">
                  <span
                    className="rr-toast-badge"
                    style={{ backgroundColor: badgeBg, color: badgeColor }}
                  >
                    {toast.categoria.toUpperCase()}
                  </span>
                  <span className="rr-toast-time">Agora</span>
                </div>

                <div className="rr-toast-title">{toast.titulo}</div>
                <div className="rr-toast-msg">{toast.mensagem}</div>

                {toast.linkAcao && (
                  <button
                    className="rr-toast-action-btn"
                    onClick={() => handleActionClick(toast)}
                  >
                    <span>{toast.linkAcao.label}</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>

              <button
                className="rr-toast-close-btn"
                onClick={() => handleRemover(toast.id)}
                aria-label="Fechar notificação"
              >
                <X size={15} />
              </button>
            </div>

            {/* Barra de progresso do timer */}
            <div className="rr-toast-progress-bar-bg">
              <div
                className={`rr-toast-progress-bar rr-toast-bar-${toast.tipo}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
