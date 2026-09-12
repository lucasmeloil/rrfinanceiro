import React, { useState, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Phone,
  MoreVertical,
  ChevronRight,
  Check,
  CheckCheck,
  RotateCcw,
  Tag,
  HelpCircle,
  Eye,
  Sliders,
  List,
} from 'lucide-react';
import { WhatsAppTemplate } from '../../types';
import { storageService } from '../../services/storage';
import { financialEngine, getTodayDateStr } from '../../services/financialEngine';

interface WhatsAppTemplatesViewProps {
  onTemplatesChange?: () => void;
}

export const WhatsAppTemplatesView: React.FC<WhatsAppTemplatesViewProps> = ({
  onTemplatesChange,
}) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() =>
    storageService.getWhatsAppTemplates()
  );
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState<string>(() => {
    const list = storageService.getWhatsAppTemplates();
    return list.length > 0 ? list[0].id : '';
  });

  // Campos de edição do modelo selecionado
  const templateAtual = templates.find((t) => t.id === templateSelecionadoId) || templates[0];
  const [tituloEdit, setTituloEdit] = useState(templateAtual?.titulo || '');
  const [mensagemEdit, setMensagemEdit] = useState(templateAtual?.mensagem || '');
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  // Tab mobile para alternar entre as 3 seções em telas pequenas
  const [tabMobile, setTabMobile] = useState<'lista' | 'editor' | 'previa'>('editor');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const config = storageService.getConfig();

  // Atualiza os campos de edição ao trocar de modelo
  const handleSelecionarTemplate = (t: WhatsAppTemplate) => {
    setTemplateSelecionadoId(t.id);
    setTituloEdit(t.titulo);
    setMensagemEdit(t.mensagem);
    setSalvoSucesso(false);
    // No mobile, ao clicar em um modelo, leva para o editor
    setTabMobile('editor');
  };

  // Salvar alterações no modelo atual
  const handleSalvar = async () => {
    if (!templateAtual) return;
    const atualizado: WhatsAppTemplate = {
      ...templateAtual,
      titulo: tituloEdit.trim() || 'Modelo Sem Título',
      mensagem: mensagemEdit,
      updated_at: new Date().toISOString(),
    };

    await storageService.saveWhatsAppTemplate(atualizado);
    const novaLista = storageService.getWhatsAppTemplates();
    setTemplates(novaLista);
    setSalvoSucesso(true);
    setTimeout(() => setSalvoSucesso(false), 2500);

    if (onTemplatesChange) {
      onTemplatesChange();
    }
  };

  // Criar novo modelo personalizado
  const handleCriarNovo = async () => {
    const novoId = `tpl-custom-${Date.now()}`;
    const novo: WhatsAppTemplate = {
      id: novoId,
      titulo: 'Novo Aviso Personalizado',
      tipo: 'personalizado',
      isSystem: false,
      mensagem: `Olá, {nome}!\n\nInformamos que sua fatura de {descricao} no valor de {valor} vence em {vencimento}.\n\n🔑 Chave PIX: {chave_pix}\n\nObrigado,\n{empresa}`,
      created_at: new Date().toISOString(),
    };

    await storageService.saveWhatsAppTemplate(novo);
    const novaLista = storageService.getWhatsAppTemplates();
    setTemplates(novaLista);
    handleSelecionarTemplate(novo);
  };

  // Excluir modelo customizado
  const handleExcluir = async () => {
    if (!templateAtual || templateAtual.isSystem) return;
    if (confirm(`Deseja realmente excluir o modelo "${templateAtual.titulo}"?`)) {
      await storageService.deleteWhatsAppTemplate(templateAtual.id);
      const novaLista = storageService.getWhatsAppTemplates();
      setTemplates(novaLista);
      if (novaLista.length > 0) {
        handleSelecionarTemplate(novaLista[0]);
      }
      if (onTemplatesChange) {
        onTemplatesChange();
      }
    }
  };

  // Restaurar modelos padrão do sistema
  const handleRestaurarPadrao = async () => {
    if (confirm('Deseja restaurar todos os modelos originais do sistema?')) {
      await storageService.resetWhatsAppTemplates();
      const novaLista = storageService.getWhatsAppTemplates();
      setTemplates(novaLista);
      if (novaLista.length > 0) {
        handleSelecionarTemplate(novaLista[0]);
      }
      if (onTemplatesChange) {
        onTemplatesChange();
      }
    }
  };

  // Inserir tag de variável na posição do cursor
  const handleInserirTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMensagemEdit((prev) => prev + tag);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = mensagemEdit;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setMensagemEdit(before + tag + after);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Renderização da mensagem com dados de simulação
  const previewSimulado = financialEngine.aplicarTemplate(mensagemEdit, {
    nome: 'Lucas dos Santos Melo',
    valor: 200.0,
    vencimento: getTodayDateStr(),
    emissao: '2026-09-01',
    descricao: 'Mensalidade Recorrente (Ref. 09/2026)',
    chavePix: config.chavePixPadrao || 'pix@rrfinanceiro.com.br',
    empresa: config.nomeEmpresa || 'RR Financeiro',
    parcela: '1/1',
  });

  const tagsDisponiveis = [
    { label: '{nome}', desc: 'Nome do Cliente' },
    { label: '{valor}', desc: 'Valor da Fatura (ex: R$ 200,00)' },
    { label: '{vencimento}', desc: 'Data de Vencimento' },
    { label: '{emissao}', desc: 'Data de Emissão' },
    { label: '{descricao}', desc: 'Descrição da Conta' },
    { label: '{chave_pix}', desc: 'Chave PIX' },
    { label: '{empresa}', desc: 'Nome da Empresa' },
    { label: '{parcela}', desc: 'Parcela (ex: 1/1)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Cabeçalho do Módulo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              WhatsApp Templates
            </h2>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0.2rem 0 0' }}>
            Gestão de avisos pré-moldados e automações com substituição dinâmica de dados.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRestaurarPadrao}
            title="Restaurar modelos de fábrica"
            style={{ minHeight: '40px', fontSize: '0.82rem' }}
          >
            <RotateCcw size={15} />
            <span className="desktop-only">Restaurar Padrões</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCriarNovo}
            style={{ minHeight: '42px', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <Plus size={18} />
            <span>NOVO MODELO</span>
          </button>
        </div>
      </div>

      {/* Alternador de Abas Mobile (Apenas em telas <= 1024px) */}
      <div
        className="mobile-only"
        style={{
          backgroundColor: '#f1f5f9',
          padding: '0.3rem',
          borderRadius: '10px',
          display: 'flex',
          gap: '0.35rem',
        }}
      >
        <button
          type="button"
          onClick={() => setTabMobile('lista')}
          style={{
            flex: 1,
            padding: '0.55rem 0.5rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: tabMobile === 'lista' ? '#ffffff' : 'transparent',
            color: tabMobile === 'lista' ? '#2563eb' : '#64748b',
            boxShadow: tabMobile === 'lista' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <List size={16} />
          <span>Modelos ({templates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabMobile('editor')}
          style={{
            flex: 1,
            padding: '0.55rem 0.5rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: tabMobile === 'editor' ? '#ffffff' : 'transparent',
            color: tabMobile === 'editor' ? '#2563eb' : '#64748b',
            boxShadow: tabMobile === 'editor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <Sliders size={16} />
          <span>Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setTabMobile('previa')}
          style={{
            flex: 1,
            padding: '0.55rem 0.5rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: tabMobile === 'previa' ? '#ffffff' : 'transparent',
            color: tabMobile === 'previa' ? '#2563eb' : '#64748b',
            boxShadow: tabMobile === 'previa' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <Eye size={16} />
          <span>Prévia WhatsApp</span>
        </button>
      </div>

      {/* Grade de 3 Colunas (Desktop) ou Visualização em Abas (Mobile) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem',
          alignItems: 'start',
        }}
        className="whatsapp-templates-grid"
      >
        {/* COLUNA 1: LISTA DE MODELOS DISPONÍVEIS */}
        <div
          className={`card tpl-col-lista ${tabMobile !== 'lista' ? 'hide-on-mobile-tab' : ''}`}
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Modelos Disponíveis ({templates.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {templates.map((t) => {
              const isSelected = t.id === templateSelecionadoId;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelecionarTemplate(t)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        color: isSelected ? '#1d4ed8' : '#0f172a',
                        textTransform: 'uppercase',
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                      }}
                    >
                      {t.titulo}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: t.isSystem ? '#64748b' : '#059669',
                        marginTop: '0.2rem',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {t.isSystem ? 'MENSAGEM DO SISTEMA' : 'PERSONALIZADO'}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    color={isSelected ? '#2563eb' : '#94a3b8'}
                    style={{ flexShrink: 0 }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 2: EDITOR DE MODELO */}
        <div
          className={`card tpl-col-editor ${tabMobile !== 'editor' ? 'hide-on-mobile-tab' : ''}`}
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Editor de Modelo
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {!templateAtual?.isSystem && (
                <button
                  type="button"
                  onClick={handleExcluir}
                  className="btn btn-secondary btn-sm"
                  title="Excluir este modelo"
                  style={{
                    color: '#dc2626',
                    borderColor: '#fca5a5',
                    backgroundColor: '#fff1f2',
                    minHeight: '36px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <Trash2 size={15} />
                  <span>EXCLUIR</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSalvar}
                className="btn btn-primary btn-sm"
                style={{
                  minHeight: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                }}
              >
                {salvoSucesso ? <Check size={16} /> : <Save size={16} />}
                <span>{salvoSucesso ? 'SALVO!' : 'SALVAR'}</span>
              </button>
            </div>
          </div>

          {/* Campo: Nome do Modelo */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              Nome do Modelo
            </label>
            <input
              type="text"
              className="form-control"
              value={tituloEdit}
              onChange={(e) => setTituloEdit(e.target.value)}
              placeholder="Ex: Aviso Vencimento se Aproxima"
              style={{ fontWeight: 600 }}
            />
          </div>

          {/* Campo: Conteúdo da Mensagem */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
              Conteúdo da Mensagem
            </label>
            <textarea
              ref={textareaRef}
              className="form-control"
              rows={8}
              value={mensagemEdit}
              onChange={(e) => setMensagemEdit(e.target.value)}
              placeholder="Digite o texto da mensagem..."
              style={{
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                resize: 'vertical',
                minHeight: '170px',
              }}
            />
          </div>

          {/* Inserção rápida de tags */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Tag size={13} color="#2563eb" />
              <span>Inserir tags dinâmicas no texto:</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {tagsDisponiveis.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => handleInserirTag(` ${t.label} `)}
                  title={t.desc}
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  +{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dica de Automação */}
          <div
            style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                Dica de Automação
              </div>
              <p style={{ fontSize: '0.78rem', color: '#334155', margin: '0.2rem 0 0', lineHeight: 1.45 }}>
                Use mensagens curtas e diretas. O WhatsApp prioriza comunicações que geram engajamento imediato. O sistema substitui automaticamente as tags pelos dados reais do cliente e da fatura.
              </p>
            </div>
          </div>
        </div>

        {/* COLUNA 3: VISUALIZAÇÃO EM TEMPO REAL (SIMULADOR SMARTPHONE WHATSAPP) */}
        <div
          className={`tpl-col-previa ${tabMobile !== 'previa' ? 'hide-on-mobile-tab' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.65rem',
              width: '100%',
              textAlign: 'center',
            }}
          >
            Visualização em Tempo Real
          </div>

          {/* Moldura do Smartphone */}
          <div
            style={{
              width: '100%',
              maxWidth: '320px',
              borderRadius: '36px',
              border: '10px solid #1e293b',
              backgroundColor: '#0f172a',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 2px #334155',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '520px',
            }}
          >
            {/* Notch e Barra de Status do Celular */}
            <div
              style={{
                backgroundColor: '#075e54',
                padding: '0.45rem 1rem 0.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
            >
              <span>15:52</span>
              <div
                style={{
                  width: '60px',
                  height: '4px',
                  backgroundColor: '#042f2e',
                  borderRadius: '99px',
                }}
              />
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem' }}>5G</span>
                <span>📶</span>
              </div>
            </div>

            {/* Cabeçalho do WhatsApp */}
            <div
              style={{
                backgroundColor: '#075e54',
                padding: '0.5rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: '#128c7e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  <Phone size={15} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {config.nomeEmpresa || 'RR Financeiro'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#bbf7d0', fontWeight: 500 }}>
                    Online
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#e2e8f0' }}>
                <MoreVertical size={16} />
              </div>
            </div>

            {/* Área de Conversa do WhatsApp com fundo característico */}
            <div
              style={{
                flex: 1,
                backgroundColor: '#efeae2',
                backgroundImage:
                  'radial-gradient(#d1d5db 0.75px, transparent 0.75px), radial-gradient(#d1d5db 0.75px, #efeae2 0.75px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px',
                padding: '1rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                overflowY: 'auto',
              }}
            >
              {/* Balão de Mensagem Estilo WhatsApp */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px 10px 10px 2px',
                  padding: '0.75rem 0.85rem 0.45rem',
                  maxWidth: '92%',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
                  position: 'relative',
                  marginBottom: '0.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: '#111827',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {previewSimulado}
                </div>

                {/* Horário e Tiques Azuis Duplos do WhatsApp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.25rem',
                    fontSize: '0.65rem',
                    color: '#64748b',
                    marginTop: '0.35rem',
                  }}
                >
                  <span>15:52</span>
                  <CheckCheck size={14} color="#38bdf8" />
                </div>
              </div>
            </div>

            {/* Barra Inferior Simulada do WhatsApp */}
            <div
              style={{
                backgroundColor: '#f0f2f5',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}
              >
                Mensagem
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Phone size={14} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
