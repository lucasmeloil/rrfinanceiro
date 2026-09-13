export type StatusConta = 'pendente' | 'pago' | 'vencido' | 'parcial';
export type TipoConta = 'receber' | 'pagar';
export type TipoPessoa = 'cliente' | 'fornecedor' | 'ambos';

export interface Pessoa {
  id: string;
  nome: string; // Razão social ou nome principal
  razao_social?: string;
  nome_fantasia?: string;
  cpf_cnpj: string;
  inscricao_estadual?: string;
  telefone: string;
  email: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  endereco: string;
  situacao_cadastral?: string;
  cnae_principal?: string;
  natureza_juridica?: string;
  porte?: string;
  capital_social?: number;
  data_abertura?: string;
  tipo: TipoPessoa;
  dia_emissao_mensalidade?: number; // 1 a 31
  dia_vencimento_mensalidade?: number; // 1 a 31
  valor_mensalidade_padrao?: number;
  chave_pix?: string;
  observacoes?: string;
  created_at: string;
}

export type FormaPagamento =
  | 'pix'
  | 'dinheiro'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'boleto'
  | 'transferencia'
  | 'outro';

export interface Parcela {
  id: string;
  conta_id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  valor_original_historico?: number;
  valor_pago?: number;
  data_vencimento: string; // YYYY-MM-DD
  data_pagamento?: string; // YYYY-MM-DD
  forma_pagamento?: FormaPagamento;
  status: 'pendente' | 'pago' | 'vencido' | 'parcial';
  is_complementar?: boolean;
  parcela_origem_id?: string;
  observacoes?: string;
}

export interface Conta {
  id: string;
  pessoa_id: string;
  tipo: TipoConta;
  categoria: string;
  descricao: string;
  data_emissao: string; // YYYY-MM-DD
  data_vencimento: string; // YYYY-MM-DD
  valor_total: number;
  status: StatusConta;
  numero_parcelas: number;
  parcelas?: Parcela[];
  created_at: string;
}

export interface Mensalidade {
  id: string;
  pessoa_id: string;
  mes_referencia: string; // e.g. "2026-09"
  data_emissao: string; // YYYY-MM-DD
  data_vencimento: string; // YYYY-MM-DD
  valor: number;
  valor_pago?: number;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'parcial';
  conta_id?: string;
  observacoes?: string;
  created_at: string;
}

export interface MesFluxoCaixa {
  mes: string;
  mesAno: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export interface ResumoDashboard {
  totalReceberPendente: number;
  totalReceberVencido: number;
  totalReceberAberto: number;
  totalRecebidoMes: number;
  totalPagarPendente: number;
  totalPagarVencido: number;
  totalPagarAberto: number;
  totalPagoMes: number;
  saldoProjetado: number;
  inadimplenciaTaxa: number;
  vencimentosHoje: ParcelaComPessoa[];
  proximosVencimentos: ParcelaComPessoa[];
  parcelasVencidas: ParcelaComPessoa[];
  fluxoCaixa6Meses: MesFluxoCaixa[];
}

export interface ParcelaComPessoa extends Parcela {
  pessoaNome: string;
  pessoaTelefone: string;
  pessoaEmail: string;
  tipoConta: TipoConta;
  descricaoConta: string;
}

export interface FiltrosRelatorio {
  tipo: 'todos' | 'receber' | 'pagar' | 'mensalidades';
  status: 'todos' | 'pendente' | 'pago' | 'vencido';
  pessoaId?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface ConfiguracoesApp {
  nomeEmpresa: string;
  cnpjEmpresa: string;
  chavePixPadrao: string;
  instrucoesCobranca: string;
  modoOffline: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export type TipoWhatsAppTemplate =
  | 'vencimento_proximo'
  | 'em_atraso'
  | 'vence_hoje'
  | 'fatura_disponivel'
  | 'pagamento_recebido'
  | 'personalizado';

export interface WhatsAppTemplate {
  id: string;
  titulo: string;
  tipo: TipoWhatsAppTemplate;
  mensagem: string;
  isSystem?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TipoNotificacao = 'sucesso' | 'info' | 'aviso' | 'erro';
export type CategoriaNotificacao = 'financeiro' | 'baixa' | 'cobranca' | 'cliente' | 'sistema' | 'seguranca';

export interface NotificacaoSistema {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  categoria: CategoriaNotificacao;
  lida: boolean;
  dataHora: string;
  linkAcao?: {
    tab: 'dashboard' | 'pessoas' | 'receber' | 'pagar' | 'mensalidades' | 'cobrancas' | 'financeiro' | 'relatorios' | 'config' | 'usuarios';
    label: string;
  };
}

export interface ToastNotificacao extends NotificacaoSistema {
  duracao?: number;
}
