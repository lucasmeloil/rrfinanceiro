import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { ParcelaComPessoa, FormaPagamento } from '../../types';
import { formatCurrency, formatDate, getTodayDateStr, financialEngine } from '../../services/financialEngine';

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
  const [valorPago, setValorPago] = useState<number>(valorOriginal);
  const [dataPagamento, setDataPagamento] = useState<string>(getTodayDateStr());
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [gerarComplementar, setGerarComplementar] = useState<boolean>(true);
  const [dataVencimentoComplementar, setDataVencimentoComplementar] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);

  useEffect(() => {
    if (parcela) {
      setValorPago(Number(parcela.valor));
      setDataPagamento(getTodayDateStr());
      setFormaPagamento('pix');
      setGerarComplementar(true);
      setObservacoes('');
      setErro('');
      setSalvando(false);

      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDataVencimentoComplementar(d.toISOString().split('T')[0]);
    }
  }, [parcela]);

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

      onSuccess();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao processar baixa.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="modal-title">Registrar Baixa de Parcela</h3>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {parcela.pessoaNome} • {parcela.descricaoConta}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {erro && (
            <div className="alert-box alert-danger">
              <AlertCircle size={18} />
              <span>{erro}</span>
            </div>
          )}

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
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={salvando}>
            Cancelar
          </button>
          <button className="btn btn-success" onClick={handleConfirmar} disabled={salvando}>
            <CheckCircle2 size={16} />
            <span>{salvando ? 'Processando e Gravando...' : 'Confirmar Baixa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
