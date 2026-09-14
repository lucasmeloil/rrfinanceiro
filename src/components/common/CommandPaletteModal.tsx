import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  BellRing,
  DollarSign,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Command,
} from 'lucide-react';
import { Pessoa, ParcelaComPessoa } from '../../types';
import { ActiveTab } from '../layout/Sidebar';
import { formatCurrency, formatDate, financialEngine } from '../../services/financialEngine';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pessoas: Pessoa[];
  parcelas: ParcelaComPessoa[];
  onNavigateTab: (tab: ActiveTab) => void;
  onDarBaixaParcela?: (parcela: ParcelaComPessoa) => void;
  onOpenNovaConta?: (tipo: 'receber' | 'pagar') => void;
  onOpenNovoCliente?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Ações Rápidas' | 'Clientes & Contatos' | 'Contas & Parcelas' | 'Navegação';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeType?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
  iconColor?: string;
  onSelect: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  pessoas,
  parcelas,
  onNavigateTab,
  onDarBaixaParcela,
  onOpenNovaConta,
  onOpenNovoCliente,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Itens dinâmicos baseados na consulta
  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    // 1. Ações Rápidas Padrão
    const acoes: PaletteItem[] = [
      {
        id: 'act-receber',
        category: 'Ações Rápidas',
        title: 'Nova Conta a Receber',
        subtitle: 'Lançar fatura, venda ou recebível para cliente',
        icon: ArrowDownCircle,
        iconColor: '#2563eb',
        onSelect: () => {
          onClose();
          if (onOpenNovaConta) onOpenNovaConta('receber');
          else onNavigateTab('receber');
        },
      },
      {
        id: 'act-pagar',
        category: 'Ações Rápidas',
        title: 'Nova Conta a Pagar',
        subtitle: 'Cadastrar despesa, custo ou fornecedor a quitar',
        icon: ArrowUpCircle,
        iconColor: '#dc2626',
        onSelect: () => {
          onClose();
          if (onOpenNovaConta) onOpenNovaConta('pagar');
          else onNavigateTab('pagar');
        },
      },
      {
        id: 'act-cliente',
        category: 'Ações Rápidas',
        title: 'Novo Cliente / Fornecedor',
        subtitle: 'Cadastrar pessoa física ou jurídica com busca CNPJ/CEP',
        icon: Users,
        iconColor: '#059669',
        onSelect: () => {
          onClose();
          if (onOpenNovoCliente) onOpenNovoCliente();
          else onNavigateTab('pessoas');
        },
      },
      {
        id: 'act-mensalidades',
        category: 'Ações Rápidas',
        title: 'Gerar Mensalidades em Lote',
        subtitle: 'Emitir cobranças recorrentes automáticas do mês',
        icon: CalendarDays,
        iconColor: '#7c3aed',
        onSelect: () => {
          onClose();
          onNavigateTab('mensalidades');
        },
      },
      {
        id: 'act-excel',
        category: 'Ações Rápidas',
        title: 'Relatório Executivo em Excel',
        subtitle: 'Exportar faturamentos, baixas e extratos formatados',
        icon: FileSpreadsheet,
        iconColor: '#16a34a',
        onSelect: () => {
          onClose();
          onNavigateTab('financeiro');
        },
      },
    ];

    if (!q) {
      result.push(...acoes);
      return result;
    }

    // Filtrar Ações Rápidas por texto
    const acoesFiltradas = acoes.filter(
      (a) => a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );
    result.push(...acoesFiltradas);

    // 2. Busca de Clientes / Fornecedores
    const clientesFiltrados = pessoas
      .filter((p) => {
        const nome = p.nome?.toLowerCase() || '';
        const doc = p.cpf_cnpj?.toLowerCase() || '';
        const tel = p.telefone?.toLowerCase() || '';
        const mail = p.email?.toLowerCase() || '';
        return nome.includes(q) || doc.includes(q) || tel.includes(q) || mail.includes(q);
      })
      .slice(0, 5);

    clientesFiltrados.forEach((p) => {
      result.push({
        id: `cli-${p.id}`,
        category: 'Clientes & Contatos',
        title: p.nome,
        subtitle: `${p.cpf_cnpj ? p.cpf_cnpj + ' • ' : ''}${p.telefone || p.email || 'Sem contato'}`,
        badge: p.tipo === 'cliente' ? 'Cliente' : p.tipo === 'fornecedor' ? 'Fornecedor' : 'Ambos',
        badgeType: 'info',
        icon: Users,
        iconColor: '#2563eb',
        onSelect: () => {
          onClose();
          onNavigateTab('pessoas');
        },
      });
    });

    // 3. Busca de Contas / Parcelas
    const parcelasFiltradas = parcelas
      .filter((par) => {
        const desc = par.descricaoConta?.toLowerCase() || '';
        const pessoa = par.pessoaNome?.toLowerCase() || '';
        const val = String(par.valor);
        return desc.includes(q) || pessoa.includes(q) || val.includes(q);
      })
      .slice(0, 6);

    parcelasFiltradas.forEach((par) => {
      const isReceber = par.tipoConta === 'receber';
      const isPago = par.status === 'pago';
      const isVencido = par.status === 'vencido';

      result.push({
        id: `par-${par.id}`,
        category: 'Contas & Parcelas',
        title: `${par.pessoaNome} - ${formatCurrency(par.valor)}`,
        subtitle: `${par.descricaoConta} (Parc. ${par.numero_parcela}/${par.total_parcelas}) • Venc: ${formatDate(par.data_vencimento)}`,
        badge: isPago ? 'Pago' : isVencido ? 'Vencida' : isReceber ? 'A Receber' : 'A Pagar',
        badgeType: isPago ? 'success' : isVencido ? 'danger' : 'warning',
        icon: isReceber ? ArrowDownCircle : ArrowUpCircle,
        iconColor: isReceber ? '#2563eb' : '#dc2626',
        onSelect: () => {
          onClose();
          if (!isPago && onDarBaixaParcela) {
            onDarBaixaParcela(par);
          } else {
            onNavigateTab(isReceber ? 'receber' : 'pagar');
          }
        },
      });
    });

    // 4. Seções do Sistema
    const secoes: { id: ActiveTab; title: string; desc: string; icon: React.ComponentType<any> }[] = [
      { id: 'dashboard', title: 'Dashboard Executivo', desc: 'KPIs, fluxo de caixa e alertas', icon: Sparkles },
      { id: 'receber', title: 'Contas a Receber', desc: 'Faturas, mensalidades e parcelamentos', icon: ArrowDownCircle },
      { id: 'pagar', title: 'Contas a Pagar', desc: 'Despesas e pagamentos a fornecedores', icon: ArrowUpCircle },
      { id: 'cobrancas', title: 'Cobranças & WhatsApp', desc: 'Lembretes automáticos e mensagens', icon: BellRing },
      { id: 'financeiro', title: 'Financeiro & Controladoria', desc: 'Extrato, conciliação e relatórios', icon: DollarSign },
      { id: 'config', title: 'Backup & Configurações', desc: 'Sincronização em nuvem e ajustes', icon: Command },
    ];

    const secoesFiltradas = secoes.filter(
      (s) => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
    );

    secoesFiltradas.forEach((s) => {
      result.push({
        id: `sec-${s.id}`,
        category: 'Navegação',
        title: s.title,
        subtitle: s.desc,
        icon: s.icon,
        iconColor: '#64748b',
        onSelect: () => {
          onClose();
          onNavigateTab(s.id);
        },
      });
    });

    return result;
  }, [query, pessoas, parcelas, onClose, onNavigateTab, onDarBaixaParcela, onOpenNovaConta, onOpenNovoCliente]);

  // Teclado (navegação com setas e enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, items.length - 1)));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].onSelect();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  // Scroll automático do item selecionado
  useEffect(() => {
    if (listRef.current) {
      const selectedElem = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElem) {
        selectedElem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={onClose} aria-hidden="true">
      <div
        className="command-palette-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Busca Rápida e Ações Globais"
      >
        {/* Cabeçalho com Campo de Busca */}
        <div className="command-palette-header">
          <Search size={20} className="command-palette-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Buscar clientes, faturas, vencimentos ou digitar ação... (ex: 'João', 'Fatura', 'Pagar')"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          {query && (
            <button
              className="command-palette-clear"
              onClick={() => setQuery('')}
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
          <span className="command-palette-esc-badge">ESC</span>
        </div>

        {/* Lista de Resultados Agrupados */}
        <div className="command-palette-list" ref={listRef}>
          {items.length === 0 ? (
            <div className="command-palette-empty">
              <Search size={36} color="#94a3b8" />
              <p style={{ fontWeight: 600, marginTop: '0.75rem', color: '#334155' }}>
                Nenhum resultado encontrado para "{query}"
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Tente buscar pelo nome do cliente, código da parcela ou descrição.
              </p>
            </div>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              const showCategory =
                index === 0 || items[index - 1].category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {showCategory && (
                    <div className="command-palette-category">{item.category}</div>
                  )}
                  <div
                    data-index={index}
                    className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div
                      className="command-palette-item-icon"
                      style={{ color: item.iconColor || 'var(--blue-primary)' }}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="command-palette-item-info">
                      <div className="command-palette-item-title">{item.title}</div>
                      {item.subtitle && (
                        <div className="command-palette-item-sub">{item.subtitle}</div>
                      )}
                    </div>

                    {item.badge && (
                      <span className={`command-palette-badge badge-${item.badgeType || 'default'}`}>
                        {item.badge}
                      </span>
                    )}

                    <div className="command-palette-item-enter">
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Rodapé com Dicas de Atalhos */}
        <div className="command-palette-footer">
          <div className="command-palette-shortcut-hint">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navegar</span>
            <span><kbd>↵</kbd> Selecionar</span>
            <span><kbd>ESC</kbd> Fechar</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
            RR Financeiro • Busca Global
          </div>
        </div>
      </div>
    </div>
  );
};
