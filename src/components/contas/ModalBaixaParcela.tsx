import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  CreditCard,
  Download,
  FileText,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { ParcelaComPessoa, FormaPagamento } from '../../types';
import {
  formatCurrency,
  formatDate,
  getTodayDateStr,
  financialEngine,
  formatFormaPagamento,
} from '../../services/financialEngine';
import { notificationService } from '../../services/notificationService';
import {
  DadosReciboBaixa,
  baixarReciboPdf,
  abrirReciboPdf,
  gerarMensagemReciboWhatsApp,
} from '../../services/receiptService';
import { gerarUrlApiWhatsApp } from '../../utils/whatsappUtils';

interface ModalBaixaParcelaProps {
  isOpen: boolean;
  parcela: ParcelaComPessoa | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalBaixaParcela: React.FC<ModalBaixaParcelaProps> = ({
  isOpen,
  parcela,
  onClose,
  onSuccess,
}) => {
  const valorOriginal = Number(parcela?.valor) || 0;
  const [etapa, setEtapa] = useState<'formulario' | 'sucesso'>('formulario');
  const [valorPago, setValorPago] = useState<number>(valorOriginal);
  const [dataPagamento, setDataPagamento] = useState<string>(getTodayDateStr());
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [gerarComplementar, setGerarComplementar] = useState<boolean>(true);
  const [dataVencimentoComplementar, setDataVencimentoComplementar] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [gerandoPdf, setGerandoPdf] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [dadosReciboConfirmado, setDadosReciboConfirmado] = useState<DadosReciboBaixa | null>(null);

  useEffect(() => {
    if (parcela) {
      setEtapa('formulario');
      setValorPago(Number(parcela.valor));
      setDataPagamento(getTodayDateStr());
      setFormaPagamento('pix');
      setGerarComplementar(true);
      setObservacoes('');
      setErro('');
      setSalvando(false);
      setGerandoPdf(false);
      setCopiado(false);
      setDadosReciboConfirmado(null);

      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDataVencimentoComplementar(d.toISOString().split('T')[0]);
    }
  }, [parcela, isOpen]);

  if (!isOpen || !parcela) return null;

  const saldoRestante = Math.max(0, Math.round((valorOriginal - valorPago) * 100) / 100);
  const isParcial = saldoRestante > 0.01;

  const handleConfirmar = async () => {
    if (valorPago <= 0) {
      setErro('Informe um valor pago maior que zero.');
      return;
    }

    if (valorPago > valorOriginal * 1.5) {
      setErro('O valor informado é excessivamente superior ao valor da parcela.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');

      await financialEngine.processarBaixaParcela({
        parcelaId: parcela.id,
        valorPago,
        dataPagamento,
        formaPagamento,
        gerarComplementarSeRestante: gerarComplementar,
        dataVencimentoComplementar: isParcial ? dataVencimentoComplementar : undefined,
        observacoes,
      });

      const dadosRecibo: DadosReciboBaixa = {
        parcela,
        valorPago,
        dataPagamento,
        formaPagamento,
        observacoes,
        isParcial,
        saldoRestante,
        dataVencimentoComplementar: isParcial ? dataVencimentoComplementar : undefined,
      };
      setDadosReciboConfirmado(dadosRecibo);

      // Atualiza o estado da listagem em tempo real
      onSuccess();

      // Notificação de sucesso no sistema
      if (isParcial) {
        notificationService.sucesso(
          'Baixa Parcial Registrada!',
          `R$ ${valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liquidados de ${parcela.pessoaNome}. Gerada parcela complementar de R$ ${saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          { tab: 'financeiro', label: 'Ver no Financeiro' },
          'baixa'
        );
      } else {
        notificationService.sucesso(
          'Baixa Confirmada com Sucesso!',
          `Liquidação de R$ ${valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} efetuada para ${parcela.pessoaNome} via ${formatFormaPagamento(formaPagamento)}.`,
          { tab: 'financeiro', label: 'Ver no Financeiro' },
          'baixa'
        );
      }

      // Baixa automaticamente o recibo em PDF estilizado
      try {
        await baixarReciboPdf(dadosRecibo);
      } catch (pdfErr) {
        console.warn('Download automático do PDF pendente de interação:', pdfErr);
      }

      // Transiciona para a tela de Sucesso e Recibo
      setEtapa('sucesso');
    } catch (err: any) {
      const msg = err.message || 'Erro ao processar baixa.';
      setErro(msg);
      notificationService.erro('Falha na Liquidação', msg, undefined, 'baixa');
    } finally {
      setSalvando(false);
    }
  };

  const handleBaixarPdfManual = async () => {
    if (!dadosReciboConfirmado) return;
    try {
      setGerandoPdf(true);
      await baixarReciboPdf(dadosReciboConfirmado);
      notificationService.sucesso('Recibo Gerado', 'O download do recibo em PDF foi iniciado.', undefined, 'baixa');
    } catch (err: any) {
      notificationService.erro('Erro ao Gerar PDF', err.message || 'Não foi possível gerar o recibo.', undefined, 'baixa');
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleAbrirPdfManual = async () => {
    if (!dadosReciboConfirmado) return;
    try {
      setGerandoPdf(true);
      await abrirReciboPdf(dadosReciboConfirmado);
    } catch (err: any) {
      notificationService.erro('Erro ao Visualizar PDF', err.message || 'Não foi possível abrir o recibo.', undefined, 'baixa');
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleCopiarMensagem = async () => {
    if (!dadosReciboConfirmado) return;
    const msg = gerarMensagemReciboWhatsApp(dadosReciboConfirmado);
    try {
      await navigator.clipboard.writeText(msg);
      setCopiado(true);
      notificationService.sucesso('Copiado!', 'Mensagem de confirmação copiada para a área de transferência.', undefined, 'baixa');
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      console.warn('Erro ao copiar texto:', e);
    }
  };

  const handleConcluir = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: etapa === 'sucesso' ? '560px' : '540px' }}>
        {/* Cabeçalho do Modal */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: etapa === 'sucesso' ? '#dcfce7' : '#eff6ff',
                color: etapa === 'sucesso' ? '#16a34a' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {etapa === 'sucesso' ? <CheckCircle2 size={20} /> : <CreditCard size={20} />}
            </div>
            <div>
              <h3 className="modal-title">
                {etapa === 'sucesso' ? 'Recibo e Confirmação de Pagamento' : 'Registrar Baixa de Parcela'}
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {parcela.pessoaNome} • {parcela.descricaoConta}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={handleConcluir}>
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="modal-body">
          {erro && (
            <div className="alert-box alert-danger">
              <AlertCircle size={18} />
              <span>{erro}</span>
            </div>
          )}

          {etapa === 'formulario' ? (
            <>
              {/* Card Resumo da Parcela */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  textAlign: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Parcela
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', marginTop: '0.2rem' }}>
                    {parcela.numero_parcela} de {parcela.total_parcelas}
                    {parcela.is_complementar && ' (Comp)'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Vencimento
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', marginTop: '0.2rem' }}>
                    {formatDate(parcela.data_vencimento)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                    Valor Original
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '1.08rem', color: '#2563eb', marginTop: '0.2rem' }}>
                    {formatCurrency(valorOriginal)}
                  </div>
                </div>
              </div>

              {/* Campos de Baixa */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Valor Efetivamente Pago (R$)</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign
                      size={16}
                      style={{ position: 'absolute', left: 10, top: 12, color: '#64748b' }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control"
                      style={{ paddingLeft: '2.2rem', fontWeight: 800, fontSize: '1.05rem' }}
                      value={valorPago || ''}
                      onChange={(e) => setValorPago(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Data do Pagamento</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar
                      size={16}
                      style={{ position: 'absolute', left: 10, top: 12, color: '#64748b' }}
                    />
                    <input
                      type="date"
                      className="form-control"
                      style={{ paddingLeft: '2.2rem' }}
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Como o Cliente Pagou? (Forma de Pagamento)
                </label>
                <div style={{ position: 'relative' }}>
                  <CreditCard
                    size={16}
                    style={{ position: 'absolute', left: 10, top: 12, color: '#64748b' }}
                  />
                  <select
                    className="form-control"
                    style={{ paddingLeft: '2.2rem', fontWeight: 600 }}
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                  >
                    <option value="pix">PIX (Chave ou QR Code)</option>
                    <option value="dinheiro">Dinheiro em Espécie</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="transferencia">Transferência Bancária (TED/DOC)</option>
                    <option value="outro">Outro Meio de Pagamento</option>
                  </select>
                </div>
              </div>

              {/* Destaque para Pagamento Parcial & Parcela Complementar */}
              {isParcial && (
                <div
                  style={{
                    backgroundColor: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem',
                    margin: '1rem 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#7e22ce', fontSize: '0.95rem' }}>
                        Pagamento Parcial Detectado
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Saldo remanescente a ser quitado futuramente
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Saldo Restante:</span>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#b45309' }}>
                        {formatCurrency(saldoRestante)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #f3e8ff' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.86rem' }}>
                      <input
                        type="checkbox"
                        checked={gerarComplementar}
                        onChange={(e) => setGerarComplementar(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#7e22ce' }}
                      />
                      <strong style={{ color: '#0f172a' }}>
                        Gerar automaticamente Parcela Complementar de {formatCurrency(saldoRestante)}
                      </strong>
                    </label>

                    {gerarComplementar && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>
                          Vencimento da Parcela Complementar:
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={dataVencimentoComplementar}
                          onChange={(e) => setDataVencimentoComplementar(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Observações / Comprovante (Opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Transferência TED ref. protocolo 9841..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </>
          ) : (
            /* ETAPA 2: PAGAMENTO RECEBIDO COM SUCESSO & RECIBO EM PDF */
            dadosReciboConfirmado && (
              <div style={{ padding: '0.25rem 0' }}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '1.35rem 1rem',
                    backgroundColor: '#f0fdf4',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid #bbf7d0',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    }}
                  >
                    <CheckCircle2 size={34} />
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#14532d', margin: 0 }}>
                    Pagamento Recebido com Sucesso! 🎉
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '0.35rem' }}>
                    A baixa foi processada no sistema e o <strong>Recibo Oficial em PDF</strong> já foi gerado.
                  </p>

                  {/* Resumo da Quitação */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.75rem',
                      marginTop: '1.1rem',
                      textAlign: 'left',
                      backgroundColor: '#ffffff',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #dcfce7',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        Pagador (Cliente)
                      </span>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginTop: '0.1rem' }}>
                        {dadosReciboConfirmado.parcela.pessoaNome}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        Valor Liquidado
                      </span>
                      <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.15rem', marginTop: '0.1rem' }}>
                        {formatCurrency(dadosReciboConfirmado.valorPago)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        Forma de Pagamento
                      </span>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem', marginTop: '0.1rem' }}>
                        {formatFormaPagamento(dadosReciboConfirmado.formaPagamento)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                        Data da Quitação
                      </span>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem', marginTop: '0.1rem' }}>
                        {formatDate(dadosReciboConfirmado.dataPagamento)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação do Recibo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleBaixarPdfManual}
                    disabled={gerandoPdf}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.85rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    <Download size={18} />
                    <span>{gerandoPdf ? 'Gerando Recibo PDF...' : 'Baixar Recibo Oficial em PDF'}</span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAbrirPdfManual}
                      disabled={gerandoPdf}
                      style={{ justifyContent: 'center', fontSize: '0.86rem', fontWeight: 600 }}
                    >
                      <FileText size={16} />
                      <span>Visualizar / Imprimir</span>
                    </button>

                    <a
                      href={gerarUrlApiWhatsApp(
                        dadosReciboConfirmado.parcela.pessoaTelefone || '',
                        gerarMensagemReciboWhatsApp(dadosReciboConfirmado)
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-whatsapp"
                      style={{
                        justifyContent: 'center',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>Enviar no WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Mensagem enviada ao cliente com cópia com 1 clique */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Sparkles size={14} color="#2563eb" />
                      <span>Mensagem de Pagamento Recebido com Sucesso:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopiarMensagem}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiado ? '#16a34a' : '#2563eb',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {copiado ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiado ? 'Copiado!' : 'Copiar Mensagem'}</span>
                    </button>
                  </div>

                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'inherit',
                      fontSize: '0.78rem',
                      color: '#334155',
                      lineHeight: '1.45',
                      margin: 0,
                      maxHeight: '110px',
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      padding: '0.65rem',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {gerarMensagemReciboWhatsApp(dadosReciboConfirmado)}
                  </pre>
                </div>
              </div>
            )
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="modal-footer">
          {etapa === 'formulario' ? (
            <>
              <button className="btn btn-secondary" onClick={onClose} disabled={salvando}>
                Cancelar
              </button>
              <button className="btn btn-success" onClick={handleConfirmar} disabled={salvando}>
                <CheckCircle2 size={16} />
                <span>{salvando ? 'Processando e Gravando...' : 'Confirmar Baixa'}</span>
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={handleConcluir}
              style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
            >
              <Check size={16} />
              <span>Concluir e Fechar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
