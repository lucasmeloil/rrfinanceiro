import React, { useState, useEffect } from 'react';
import {
  BellRing,
  AlertTriangle,
  Clock,
  MessageCircle,
  Copy,
  Check,
  Search,
  CheckCircle2,
  Phone,
  Mail,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ParcelaComPessoa, WhatsAppTemplate } from '../../types';
import {
  formatCurrency,
  formatDate,
  getTodayDateStr,
} from '../../services/financialEngine';
import { storageService } from '../../services/storage';
import { WhatsAppTemplatesView } from './WhatsAppTemplatesView';
import { ModalEnviarMensagem } from './ModalEnviarMensagem';

interface CobrancasViewProps {
  parcelas: ParcelaComPessoa[];
  onDarBaixa?: (parcela: ParcelaComPessoa) => void;
}

export const CobrancasView: React.FC<CobrancasViewProps> = ({ parcelas }) => {
  const [secaoPrincipal, setSecaoPrincipal] = useState<'disparos' | 'templates'>('disparos');
  const [tabCobranca, setTabCobranca] = useState<'vencidas' | 'hoje' | 'proximas'>('vencidas');
  const [tabInicializada, setTabInicializada] = useState(false);
  const [busca, setBusca] = useState('');

  // Modal de Envio de Mensagem customizada com templates
  const [parcelaParaMensagem, setParcelaParaMensagem] = useState<ParcelaComPessoa | null>(null);
  const [modalMensagemAberto, setModalMensagemAberto] = useState<boolean>(false);

  // Modelos de WhatsApp carregados do storage / Supabase
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() =>
    storageService.getWhatsAppTemplates()
  );

  const today = getTodayDateStr();
  const d7 = new Date();
  d7.setDate(d7.getDate() + 7);
  const next7DaysStr = d7.toISOString().split('T')[0];

  // Apenas contas a receber pendentes ou vencidas
  const parcelasReceber = parcelas.filter((p) => p.tipoConta === 'receber' && p.status !== 'pago');

  // Conta só deve aparecer com status vencida quando virar o dia da data de vencimento (< today) e NÃO no dia
  const vencidas = parcelasReceber.filter((p) => p.data_vencimento < today);
  const vencemHoje = parcelasReceber.filter((p) => p.data_vencimento === today);
  const proximas = parcelasReceber.filter(
    (p) => p.data_vencimento > today && p.data_vencimento <= next7DaysStr
  );

  // Se não houver faturas vencidas em atraso, foca automaticamente nos vencimentos de hoje
  useEffect(() => {
    if (!tabInicializada && parcelasReceber.length > 0) {
      if (vencidas.length === 0 && vencemHoje.length > 0) {
        setTabCobranca('hoje');
      }
      setTabInicializada(true);
    }
  }, [tabInicializada, parcelasReceber.length, vencidas.length, vencemHoje.length]);

  const getListaAtiva = () => {
    switch (tabCobranca) {
      case 'vencidas':
        return vencidas;
      case 'hoje':
        return vencemHoje;
      case 'proximas':
        return proximas;
    }
  };

  const listaFiltrada = getListaAtiva().filter((p) => {
    const nome = p.pessoaNome.toLowerCase();
    const desc = p.descricaoConta.toLowerCase();
    return nome.includes(busca.toLowerCase()) || desc.includes(busca.toLowerCase());
  });

  const totalVencidasValor = vencidas.reduce((a, b) => a + Number(b.valor), 0);
  const totalHojeValor = vencemHoje.reduce((a, b) => a + Number(b.valor), 0);
  const totalProximasValor = proximas.reduce((a, b) => a + Number(b.valor), 0);

  return (
    <div className="page-wrapper">
      {/* Seletor Superior Limpo: Disparo de Lembretes vs Editor de Modelos WhatsApp */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${secaoPrincipal === 'disparos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSecaoPrincipal('disparos')}
            style={{
              minHeight: '40px',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <BellRing size={16} />
            <span>Central de Disparo de Lembretes ({parcelasReceber.length})</span>
          </button>

          <button
            type="button"
            className={`btn ${secaoPrincipal === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSecaoPrincipal('templates')}
            style={{
              minHeight: '40px',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Sparkles size={16} />
            <span>Gerenciar Modelos Salvos ({templates.length})</span>
          </button>
        </div>
      </div>

      {/* SEÇÃO 1: EDITOR E CONFIGURAÇÃO DE TEMPLATES DO SUPABASE */}
      {secaoPrincipal === 'templates' ? (
        <WhatsAppTemplatesView
          onTemplatesChange={() => setTemplates(storageService.getWhatsAppTemplates())}
        />
      ) : (
        <>
          {/* CARDS VISUAIS DE CATEGORIA (SEM DUPLICAÇÃO DE ABAS) */}
          <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
            {/* Card Vencidas */}
            <div
              className="kpi-card"
              onClick={() => setTabCobranca('vencidas')}
              style={{
                cursor: 'pointer',
                border: tabCobranca === 'vencidas' ? '2px solid #ef4444' : '1px solid #e2e8f0',
                backgroundColor: tabCobranca === 'vencidas' ? '#fff5f5' : '#ffffff',
                boxShadow: tabCobranca === 'vencidas' ? '0 0 12px rgba(239, 68, 68, 0.2)' : undefined,
                transition: 'all 0.2s ease',
              }}
            >
              <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                <AlertTriangle size={22} />
              </div>
              <div className="kpi-label" style={{ color: tabCobranca === 'vencidas' ? '#b91c1c' : '#64748b' }}>
                Faturas Vencidas (Em Atraso)
              </div>
              <div className="kpi-value" style={{ color: '#dc2626' }}>
                {formatCurrency(totalVencidasValor)}
              </div>
              <div className="kpi-subtext" style={{ color: '#64748b' }}>
                <span><strong>{vencidas.length}</strong> clientes em atraso</span>
              </div>
            </div>

            {/* Card Vence Hoje */}
            <div
              className="kpi-card"
              onClick={() => setTabCobranca('hoje')}
              style={{
                cursor: 'pointer',
                border: tabCobranca === 'hoje' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                backgroundColor: tabCobranca === 'hoje' ? '#fefce8' : '#ffffff',
                boxShadow: tabCobranca === 'hoje' ? '0 0 12px rgba(245, 158, 11, 0.2)' : undefined,
                transition: 'all 0.2s ease',
              }}
            >
              <div className="kpi-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                <BellRing size={22} />
              </div>
              <div className="kpi-label" style={{ color: tabCobranca === 'hoje' ? '#b45309' : '#64748b' }}>
                Vencimentos de Hoje
              </div>
              <div className="kpi-value" style={{ color: '#d97706' }}>
                {formatCurrency(totalHojeValor)}
              </div>
              <div className="kpi-subtext" style={{ color: '#64748b' }}>
                <span><strong>{vencemHoje.length}</strong> faturas vencendo hoje</span>
              </div>
            </div>

            {/* Card Próximos 7 Dias */}
            <div
              className="kpi-card"
              onClick={() => setTabCobranca('proximas')}
              style={{
                cursor: 'pointer',
                border: tabCobranca === 'proximas' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: tabCobranca === 'proximas' ? '#f0f7ff' : '#ffffff',
                boxShadow: tabCobranca === 'proximas' ? '0 0 12px rgba(37, 99, 235, 0.2)' : undefined,
                transition: 'all 0.2s ease',
              }}
            >
              <div className="kpi-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <Clock size={22} />
              </div>
              <div className="kpi-label" style={{ color: tabCobranca === 'proximas' ? '#1d4ed8' : '#64748b' }}>
                Próximos 7 Dias (A Vencer)
              </div>
              <div className="kpi-value" style={{ color: '#2563eb' }}>
                {formatCurrency(totalProximasValor)}
              </div>
              <div className="kpi-subtext" style={{ color: '#64748b' }}>
                <span><strong>{proximas.length}</strong> faturas programadas</span>
              </div>
            </div>
          </div>

          {/* BARRA DE PESQUISA E INFORMAÇÃO */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontSize: '0.88rem', color: '#475569', fontWeight: 600 }}>
              {tabCobranca === 'vencidas' && `Mostrando ${listaFiltrada.length} faturas em atraso`}
              {tabCobranca === 'hoje' && `Mostrando ${listaFiltrada.length} faturas com vencimento para hoje`}
              {tabCobranca === 'proximas' && `Mostrando ${listaFiltrada.length} faturas com vencimento nos próximos 7 dias`}
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search
                size={17}
                style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}
              />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.3rem', width: '100%' }}
                placeholder="Filtrar por nome do cliente ou fatura..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          {/* LISTAGEM DE CLIENTES & FATURAS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {listaFiltrada.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <CheckCircle2 size={44} color="#16a34a" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Nenhuma fatura encontrada nesta categoria
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Todas as cobranças selecionadas estão em dia ou foram quitadas.
                </p>
              </div>
            ) : (
              listaFiltrada.map((par) => {
                const isVencida = par.data_vencimento < today;
                const isHoje = par.data_vencimento === today;

                return (
                  <div
                    key={par.id}
                    className="card"
                    style={{
                      padding: '1.2rem',
                      borderLeft: `5px solid ${isVencida ? '#ef4444' : isHoje ? '#f59e0b' : '#2563eb'}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      {/* Dados do Cliente e Fatura */}
                      <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{par.pessoaNome}</strong>
                          <span
                            className={`badge ${
                              isVencida
                                ? 'badge-danger'
                                : isHoje
                                ? 'badge-warning'
                                : 'badge-secondary'
                            }`}
                          >
                            {isVencida ? 'Em Atraso' : isHoje ? 'Vence Hoje' : 'No Prazo'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '0.3rem' }}>
                          {par.descricaoConta} • Parcela {par.numero_parcela} de {par.total_parcelas}
                          {par.is_complementar && (
                            <span style={{ color: '#7e22ce', fontWeight: 700, marginLeft: '0.35rem' }}>
                              (Parcela Complementar)
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginTop: '0.45rem',
                            fontSize: '0.8rem',
                            color: '#64748b',
                            flexWrap: 'wrap',
                          }}
                        >
                          {par.pessoaTelefone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Phone size={13} color="#2563eb" />
                              <strong style={{ color: '#334155' }}>{par.pessoaTelefone}</strong>
                            </div>
                          ) : (
                            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                              Telefone não cadastrado
                            </div>
                          )}

                          {par.pessoaEmail && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Mail size={13} color="#2563eb" />
                              <span>{par.pessoaEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vencimento, Valor e Ações Rápidas */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.5rem',
                          flexWrap: 'wrap',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <div style={{ textAlign: 'right', minWidth: '110px' }}>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                            Vencimento
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.98rem',
                              color: isVencida ? '#dc2626' : isHoje ? '#d97706' : '#0f172a',
                            }}
                          >
                            {formatDate(par.data_vencimento)}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#2563eb', marginTop: '0.1rem' }}>
                            {formatCurrency(par.valor)}
                          </div>
                        </div>

                        {/* Botão de Ação Principal: Enviar Mensagem */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-whatsapp"
                            onClick={() => {
                              setParcelaParaMensagem(par);
                              setModalMensagemAberto(true);
                            }}
                            style={{
                              backgroundColor: '#22c55e',
                              borderColor: '#16a34a',
                              color: '#ffffff',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.6rem 1.25rem',
                              minHeight: '40px',
                            }}
                            title="Escolher modelo salvo e enviar cobrança por WhatsApp"
                          >
                            <MessageCircle size={17} />
                            <span>Enviar Mensagem</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* MODAL DE ENVIO DE MENSAGEM COM SELETOR DE MODELOS DO BANCO */}
      <ModalEnviarMensagem
        isOpen={modalMensagemAberto}
        parcela={parcelaParaMensagem}
        templates={templates}
        onClose={() => {
          setModalMensagemAberto(false);
          setParcelaParaMensagem(null);
        }}
      />
    </div>
  );
};
