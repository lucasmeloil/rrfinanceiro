import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  Sparkles,
  Phone,
  User,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ParcelaComPessoa, WhatsAppTemplate } from '../../types';
import { formatCurrency, formatDate, financialEngine } from '../../services/financialEngine';
import { storageService } from '../../services/storage';
import { notificationService } from '../../services/notificationService';

interface ModalEnviarMensagemProps {
  isOpen: boolean;
  parcela: ParcelaComPessoa | null;
  templates: WhatsAppTemplate[];
  onClose: () => void;
  onMessageSent?: () => void;
}

export const ModalEnviarMensagem: React.FC<ModalEnviarMensagemProps> = ({
  isOpen,
  parcela,
  templates,
  onClose,
  onMessageSent,
}) => {
  const [templateId, setTemplateId] = useState<string>('');
  const [mensagem, setMensagem] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [copiado, setCopiado] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  // Ao abrir o modal com uma parcela, inicializa o template sugerido e dados
  useEffect(() => {
    if (parcela && isOpen) {
      // Obter template inteligente sugerido baseado na data da parcela
      const tplSugerido = financialEngine.obterTemplateSugerido(parcela, templates);
      setTemplateId(tplSugerido.id);

      // Gerar mensagem inicial com as tags do cliente substituídas
      const msgGerada = financialEngine.gerarMensagemCobranca(parcela, tplSugerido);
      setMensagem(msgGerada);

      // Telefone do cliente
      setTelefone(parcela.pessoaTelefone || '');
      setCopiado(false);
      setErro('');
    }
  }, [parcela, isOpen, templates]);

  // Quando o operador seleciona outro modelo salvo
  const handleTrocarTemplate = (novoId: string) => {
    setTemplateId(novoId);
    if (!parcela) return;

    const tplEscolhido = templates.find((t) => t.id === novoId);
    if (tplEscolhido) {
      const msgNova = financialEngine.gerarMensagemCobranca(parcela, tplEscolhido);
      setMensagem(msgNova);
    }
  };

  if (!isOpen || !parcela) return null;

  const handleCopiar = () => {
    if (!mensagem.trim()) return;
    navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    notificationService.info(
      'Mensagem Copiada!',
      `Texto da cobrança de ${parcela.pessoaNome} pronto para colar onde desejar.`,
      undefined,
      'cobranca'
    );
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleDispararWhatsApp = () => {
    const telLimpo = telefone.replace(/\D/g, '');
    if (!telLimpo || telLimpo.length < 10) {
      setErro('Informe um número de telefone/WhatsApp válido com DDD (ex: 11987654321).');
      return;
    }

    if (!mensagem.trim()) {
      setErro('A mensagem não pode estar vazia.');
      return;
    }

    // Número no formato internacional Brasil 55
    const ddiNumero = telLimpo.startsWith('55') ? telLimpo : `55${telLimpo}`;
    const textoCodificado = encodeURIComponent(mensagem);
    const url = `https://wa.me/${ddiNumero}?text=${textoCodificado}`;

    window.open(url, '_blank');

    notificationService.sucesso(
      'Cobrança Aberta no WhatsApp!',
      `Mensagem com chave PIX e detalhes enviada para ${parcela.pessoaNome} (${parcela.pessoaTelefone || telLimpo}).`,
      { tab: 'cobrancas', label: 'Ver Cobranças' },
      'cobranca'
    );

    if (onMessageSent) {
      onMessageSent();
    }
    onClose();
  };

  const tplAtual = templates.find((t) => t.id === templateId);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '620px' }}>
        {/* Cabeçalho do Modal */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageCircle size={22} />
            </div>
            <div>
              <h3 className="modal-title">Enviar Mensagem pelo WhatsApp</h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Selecione o modelo salvo no sistema e personalize antes de enviar
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          {erro && (
            <div className="alert-box alert-danger">
              <AlertCircle size={18} />
              <span>{erro}</span>
            </div>
          )}

          {/* Cartão de Resumo do Cliente e Fatura */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Cliente / Destinatário
              </span>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', marginTop: '0.15rem' }}>
                {parcela.pessoaNome}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Vencimento da Parcela
              </span>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem', marginTop: '0.15rem' }}>
                {formatDate(parcela.data_vencimento)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Valor da Cobrança
              </span>
              <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.02rem', marginTop: '0.15rem' }}>
                {formatCurrency(parcela.valor)}
              </div>
            </div>
          </div>

          {/* 1. SELETOR DE MODELOS SALVOS NO SISTEMA */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                Selecionar Mensagem Salva (Modelo / Template):
              </span>
              {tplAtual && (
                <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                  Tipo: {tplAtual.tipo.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </label>

            <select
              className="form-control"
              style={{ fontWeight: 600, color: '#1e293b', padding: '0.65rem' }}
              value={templateId}
              onChange={(e) => handleTrocarTemplate(e.target.value)}
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.titulo} {tpl.isSystem ? '(Padrão do Sistema)' : '(Personalizado)'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. NÚMERO DO TELEFONE / WHATSAPP */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#0f172a' }}>
              Número de Telefone / WhatsApp do Cliente
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: 10, top: 12, color: '#64748b' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.2rem' }}
                placeholder="(11) 98765-4321"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
              Pode ser editado caso o cliente tenha trocado de número.
            </span>
          </div>

          {/* 3. EDITOR E PRÉVIA DA MENSAGEM */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', marginBottom: 0 }}>
                Texto da Mensagem (com dados do cliente preenchidos):
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopiar}
                style={{ fontSize: '0.76rem', padding: '0.25rem 0.65rem', minHeight: '30px' }}
              >
                {copiado ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                <span>{copiado ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <textarea
              className="form-control"
              rows={7}
              style={{
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                padding: '0.75rem',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
              }}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite ou personalize a mensagem aqui..."
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem', display: 'block' }}>
              Você pode alterar qualquer palavra ou adicionar observações antes de disparar pelo WhatsApp.
            </span>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopiar}
              title="Copiar texto para colar manualmente"
            >
              <Copy size={16} />
              <span>{copiado ? 'Texto Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDispararWhatsApp}
              style={{
                backgroundColor: '#22c55e',
                borderColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              <MessageCircle size={17} />
              <span>Abrir no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
