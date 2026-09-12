import { Pessoa, Conta, Parcela, Mensalidade, ConfiguracoesApp, WhatsAppTemplate } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  PESSOAS: 'rr_financeiro_pessoas',
  CONTAS: 'rr_financeiro_contas',
  PARCELAS: 'rr_financeiro_parcelas',
  MENSALIDADES: 'rr_financeiro_mensalidades',
  CONFIG: 'rr_financeiro_config',
  TEMPLATES: 'rr_financeiro_whatsapp_templates',
};

export const TEMPLATES_PADRAO: WhatsAppTemplate[] = [
  {
    id: 'tpl-vencimento-proximo',
    titulo: 'Aviso vencimento se aproxima',
    tipo: 'vencimento_proximo',
    isSystem: true,
    mensagem: `Olá, {nome} 👋\n\nPassando aqui só para lembrar que a fatura do sistema {empresa} no valor de {valor}, com vencimento em {vencimento}, está chegando.\nSe puder já deixar o pagamento programado, evita qualquer correria de última hora 😊.\n\nAgradecemos muito pela confiança e pela parceria de sempre ✨.\n\n_Mensagem enviada automaticamente pelo sistema {empresa}_`,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-fatura-em-atraso',
    titulo: 'Fatura em atraso',
    tipo: 'em_atraso',
    isSystem: true,
    mensagem: `Olá, {nome}! Tudo bem?\n\nConsta em nosso sistema que a fatura no valor de *{valor}*, referente a {descricao}, com vencimento em *{vencimento}*, ainda não foi compensada.\n\nCaso já tenha efetuado o pagamento, por favor desconsidere este aviso ou nos envie o comprovante por aqui.\n\n🔑 *Chave PIX:* {chave_pix}\n\nQualquer dúvida estamos à sua total disposição!\n\n_Equipe Financeira {empresa}_`,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-vencimento-hoje',
    titulo: 'Vencimento hoje',
    tipo: 'vence_hoje',
    isSystem: true,
    mensagem: `Olá, {nome} ☀️\n\nLembramos que a sua fatura referente a {descricao} no valor de *{valor}* vence *HOJE ({vencimento})*.\n\nPara sua comodidade, você pode realizar o pagamento via PIX:\n🔑 *Chave PIX:* {chave_pix}\n\nAgradecemos pela pontualidade e pela parceria!\n\n_{empresa}_`,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-fatura-disponivel',
    titulo: 'Fatura disponível',
    tipo: 'fatura_disponivel',
    isSystem: true,
    mensagem: `Olá, {nome}!\n\nSua fatura de {descricao} no valor de *{valor}* foi emitida com sucesso em {emissao} e está disponível para quitação.\n\n📅 *Vencimento:* {vencimento}\n💰 *Valor:* {valor}\n🔑 *Chave PIX:* {chave_pix}\n\nSe precisar da segunda via ou de algum esclarecimento, estamos à disposição!\n\n_{empresa}_`,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-pagamento-recebido',
    titulo: 'Pagamento recebido',
    tipo: 'pagamento_recebido',
    isSystem: true,
    mensagem: `Olá, {nome} ✅\n\nConfirmamos com sucesso o recebimento do pagamento no valor de *{valor}* referente a {descricao} (Venc: {vencimento}).\n\nSua fatura foi baixada em nosso sistema com sucesso. Muito obrigado pela preferência e pontualidade!\n\n_Atenciosamente, equipe {empresa}_`,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

export const CONFIG_PADRAO: ConfiguracoesApp = {
  nomeEmpresa: 'RR Financeiro & Gestão',
  cnpjEmpresa: '12.345.678/0001-99',
  chavePixPadrao: 'pix@rrfinanceiro.com.br',
  instrucoesCobranca: 'Favor enviar o comprovante de pagamento respondendo esta mensagem ou pelo e-mail financeiro@rrfinanceiro.com.br',
  modoOffline: false,
  supabaseUrl: 'https://djqykdfnmbonnohcijwf.supabase.co',
  supabaseAnonKey: 'sb_publishable_JVEchFVme0KIYWjLrySSSA_XAI-8VI0',
};

const getTodayIso = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getRelativeDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const SEED_PESSOAS: Pessoa[] = [];
const SEED_CONTAS: Conta[] = [];
const SEED_PARCELAS: Parcela[] = [];
const SEED_MENSALIDADES: Mensalidade[] = [];

class StorageService {
  private get<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultVal;
      return JSON.parse(data) as T;
    } catch {
      return defaultVal;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Erro ao salvar ${key} no localStorage:`, e);
    }
  }

  public init(): void {
    if (!localStorage.getItem(STORAGE_KEYS.PESSOAS)) {
      this.set(STORAGE_KEYS.PESSOAS, SEED_PESSOAS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONTAS)) {
      this.set(STORAGE_KEYS.CONTAS, SEED_CONTAS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PARCELAS)) {
      this.set(STORAGE_KEYS.PARCELAS, SEED_PARCELAS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MENSALIDADES)) {
      this.set(STORAGE_KEYS.MENSALIDADES, SEED_MENSALIDADES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
      this.set(STORAGE_KEYS.CONFIG, CONFIG_PADRAO);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
      this.set(STORAGE_KEYS.TEMPLATES, TEMPLATES_PADRAO);
    }
  }

  public zerarDadosDoSistema(): void {
    this.set(STORAGE_KEYS.PESSOAS, []);
    this.set(STORAGE_KEYS.CONTAS, []);
    this.set(STORAGE_KEYS.PARCELAS, []);
    this.set(STORAGE_KEYS.MENSALIDADES, []);
  }

  /**
   * Sincronização em tempo real com o Supabase
   * Busca os registros reais gravados no banco e atualiza o estado local
   */
  public async sincronizarComSupabase(): Promise<{
    pessoas: Pessoa[];
    contas: Conta[];
    parcelas: Parcela[];
    mensalidades: Mensalidade[];
    templates: WhatsAppTemplate[];
  } | null> {
    try {
      // 1. Busca Pessoas
      const { data: supaPessoas, error: errPessoas } = await supabase
        .from('pessoas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!errPessoas && Array.isArray(supaPessoas)) {
        const pessoasFormatadas: Pessoa[] = supaPessoas.map((p: any) => ({
          ...p,
          capital_social: Number(p.capital_social) || 0,
          valor_mensalidade_padrao: Number(p.valor_mensalidade_padrao) || 0,
          dia_emissao_mensalidade: Number(p.dia_emissao_mensalidade) || 1,
          dia_vencimento_mensalidade: Number(p.dia_vencimento_mensalidade) || 10,
        }));
        this.set(STORAGE_KEYS.PESSOAS, pessoasFormatadas);
      }

      // 2. Busca Contas
      const { data: supaContas, error: errContas } = await supabase
        .from('contas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!errContas && Array.isArray(supaContas)) {
        const contasFormatadas: Conta[] = supaContas.map((c: any) => ({
          ...c,
          valor_total: Number(c.valor_total) || 0,
          numero_parcelas: Number(c.numero_parcelas) || 1,
        }));
        this.set(STORAGE_KEYS.CONTAS, contasFormatadas);
      }

      // 3. Busca Parcelas
      const { data: supaParcelas, error: errParcelas } = await supabase
        .from('parcelas')
        .select('*');

      if (!errParcelas && Array.isArray(supaParcelas)) {
        const parcelasFormatadas: Parcela[] = supaParcelas.map((pr: any) => ({
          ...pr,
          valor: Number(pr.valor) || 0,
          valor_pago: pr.valor_pago !== null && pr.valor_pago !== undefined ? Number(pr.valor_pago) : undefined,
          valor_original_historico: pr.valor_original_historico !== null && pr.valor_original_historico !== undefined ? Number(pr.valor_original_historico) : undefined,
          numero_parcela: Number(pr.numero_parcela) || 1,
          total_parcelas: Number(pr.total_parcelas) || 1,
        }));
        this.set(STORAGE_KEYS.PARCELAS, parcelasFormatadas);
      }

      // 4. Busca Mensalidades
      const { data: supaMensalidades, error: errMensalidades } = await supabase
        .from('mensalidades')
        .select('*')
        .order('mes_referencia', { ascending: false });

      if (!errMensalidades && Array.isArray(supaMensalidades)) {
        const mensFormatadas: Mensalidade[] = supaMensalidades.map((m: any) => ({
          ...m,
          valor: Number(m.valor) || 0,
          valor_pago: m.valor_pago !== null && m.valor_pago !== undefined ? Number(m.valor_pago) : undefined,
        }));
        this.set(STORAGE_KEYS.MENSALIDADES, mensFormatadas);
      }

      // 5. Busca WhatsApp Templates diretamente do Supabase
      const { data: supaTemplates, error: errTemplates } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (!errTemplates && Array.isArray(supaTemplates) && supaTemplates.length > 0) {
        const templatesFormatados: WhatsAppTemplate[] = supaTemplates.map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          tipo: t.tipo,
          mensagem: t.mensagem,
          isSystem: !!t.is_system,
          created_at: t.created_at,
          updated_at: t.updated_at,
        }));
        this.set(STORAGE_KEYS.TEMPLATES, templatesFormatados);
      }

      // 6. Busca Configurações da Empresa
      const { data: supaConfig, error: errConfig } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('id', 'config_padrao')
        .maybeSingle();

      if (!errConfig && supaConfig) {
        this.set(STORAGE_KEYS.CONFIG, {
          nomeEmpresa: supaConfig.nome_empresa || CONFIG_PADRAO.nomeEmpresa,
          cnpjEmpresa: supaConfig.cnpj_empresa || CONFIG_PADRAO.cnpjEmpresa,
          chavePixPadrao: supaConfig.chave_pix_padrao || CONFIG_PADRAO.chavePixPadrao,
          instrucoesCobranca: supaConfig.instrucoes_cobranca || CONFIG_PADRAO.instrucoesCobranca,
          modoOffline: !!supaConfig.modo_offline,
          supabaseUrl: CONFIG_PADRAO.supabaseUrl,
          supabaseAnonKey: CONFIG_PADRAO.supabaseAnonKey,
        });
      }

      return {
        pessoas: this.getPessoas(),
        contas: this.getContas(),
        parcelas: this.getParcelas(),
        mensalidades: this.getMensalidades(),
        templates: this.getWhatsAppTemplates(),
      };
    } catch (e) {
      console.warn('Falha na sincronização direta com Supabase:', e);
      return null;
    }
  }

  // --- PESSOAS ---
  public getPessoas(): Pessoa[] {
    this.init();
    return this.get<Pessoa[]>(STORAGE_KEYS.PESSOAS, []);
  }

  public getPessoaById(id: string): Pessoa | undefined {
    return this.getPessoas().find((p) => p.id === id);
  }

  public async savePessoa(pessoa: Pessoa): Promise<void> {
    const list = this.getPessoas();
    const index = list.findIndex((p) => p.id === pessoa.id);
    if (index >= 0) {
      list[index] = pessoa;
    } else {
      list.unshift(pessoa);
    }
    this.set(STORAGE_KEYS.PESSOAS, list);

    // Sincronização direta com Supabase
    try {
      await supabase.from('pessoas').upsert(pessoa);
    } catch (err) {
      console.error('Erro ao salvar pessoa no Supabase:', err);
    }
  }

  public async deletePessoa(id: string): Promise<void> {
    const list = this.getPessoas().filter((p) => p.id !== id);
    this.set(STORAGE_KEYS.PESSOAS, list);

    try {
      await supabase.from('pessoas').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao remover pessoa do Supabase:', err);
    }
  }

  // --- CONTAS ---
  public getContas(): Conta[] {
    this.init();
    const contas = this.get<Conta[]>(STORAGE_KEYS.CONTAS, []);
    const parcelas = this.getParcelas();
    return contas.map((conta) => ({
      ...conta,
      parcelas: parcelas.filter((par) => par.conta_id === conta.id),
    }));
  }

  public getContaById(id: string): Conta | undefined {
    return this.getContas().find((c) => c.id === id);
  }

  public async saveConta(conta: Conta, parcelas?: Parcela[]): Promise<void> {
    const contas = this.getContas();
    const index = contas.findIndex((c) => c.id === conta.id);
    const contaClean = { ...conta };
    delete contaClean.parcelas;

    if (index >= 0) {
      contas[index] = contaClean;
    } else {
      contas.unshift(contaClean);
    }
    this.set(STORAGE_KEYS.CONTAS, contas);

    if (parcelas && parcelas.length > 0) {
      let todasParcelas = this.getParcelas().filter((p) => p.conta_id !== conta.id);
      todasParcelas = [...todasParcelas, ...parcelas];
      this.set(STORAGE_KEYS.PARCELAS, todasParcelas);
    }

    // Sincroniza com Supabase
    try {
      await supabase.from('contas').upsert(contaClean);
      if (parcelas && parcelas.length > 0) {
        await supabase.from('parcelas').upsert(parcelas);
      }
    } catch (err) {}
  }

  public async deleteConta(id: string): Promise<void> {
    const contas = this.getContas().filter((c) => c.id !== id);
    this.set(STORAGE_KEYS.CONTAS, contas);
    const parcelas = this.getParcelas().filter((p) => p.conta_id !== id);
    this.set(STORAGE_KEYS.PARCELAS, parcelas);

    try {
      await supabase.from('contas').delete().eq('id', id);
    } catch (err) {}
  }

  // --- PARCELAS ---
  public getParcelas(): Parcela[] {
    this.init();
    const today = getTodayIso();
    const parcelas = this.get<Parcela[]>(STORAGE_KEYS.PARCELAS, []);
    return parcelas.map((par) => {
      if (par.status !== 'pago' && par.data_vencimento < today) {
        return { ...par, status: 'vencido' };
      }
      return par;
    });
  }

  public async saveParcela(parcela: Parcela): Promise<void> {
    const parcelas = this.getParcelas();
    const index = parcelas.findIndex((p) => p.id === parcela.id);
    if (index >= 0) {
      parcelas[index] = parcela;
    } else {
      parcelas.push(parcela);
    }
    this.set(STORAGE_KEYS.PARCELAS, parcelas);
    await this.recalcularStatusConta(parcela.conta_id);

    try {
      await supabase.from('parcelas').upsert(parcela);
    } catch (err) {
      console.error('Erro ao salvar parcela no Supabase:', err);
    }
  }

  public async recalcularStatusConta(contaId: string): Promise<void> {
    const conta = this.getContaById(contaId);
    if (!conta) return;
    const parcelas = this.getParcelas().filter((p) => p.conta_id === contaId);
    if (parcelas.length === 0) return;

    const todasPagas = parcelas.every((p) => p.status === 'pago');
    const algumaPaga = parcelas.some((p) => p.status === 'pago' || (p.valor_pago && p.valor_pago > 0));
    const algumaVencida = parcelas.some((p) => p.status === 'vencido');

    let novoStatus: Conta['status'] = 'pendente';
    if (todasPagas) {
      novoStatus = 'pago';
    } else if (algumaPaga) {
      novoStatus = 'parcial';
    } else if (algumaVencida) {
      novoStatus = 'vencido';
    }

    const contas = this.get<Conta[]>(STORAGE_KEYS.CONTAS, []);
    const idx = contas.findIndex((c) => c.id === contaId);
    if (idx >= 0) {
      contas[idx].status = novoStatus;
      this.set(STORAGE_KEYS.CONTAS, contas);
      try {
        await supabase.from('contas').update({ status: novoStatus }).eq('id', contaId);
      } catch (err) {
        console.error('Erro ao atualizar status da conta no Supabase:', err);
      }
    }
  }

  // --- MENSALIDADES ---
  public getMensalidades(): Mensalidade[] {
    this.init();
    const today = getTodayIso();
    const mens = this.get<Mensalidade[]>(STORAGE_KEYS.MENSALIDADES, []);
    return mens.map((m) => {
      if (m.status !== 'pago' && m.data_vencimento < today) {
        return { ...m, status: 'vencido' };
      }
      return m;
    });
  }

  public async saveMensalidade(mensalidade: Mensalidade): Promise<void> {
    const list = this.getMensalidades();
    const index = list.findIndex((m) => m.id === mensalidade.id);
    if (index >= 0) {
      list[index] = mensalidade;
    } else {
      list.unshift(mensalidade);
    }
    this.set(STORAGE_KEYS.MENSALIDADES, list);

    try {
      await supabase.from('mensalidades').upsert(mensalidade);
    } catch (err) {}
  }

  public async deleteMensalidade(id: string): Promise<void> {
    const list = this.getMensalidades().filter((m) => m.id !== id);
    this.set(STORAGE_KEYS.MENSALIDADES, list);

    try {
      await supabase.from('mensalidades').delete().eq('id', id);
    } catch (err) {}
  }

  // --- WHATSAPP TEMPLATES ---
  public getWhatsAppTemplates(): WhatsAppTemplate[] {
    this.init();
    const stored = this.get<WhatsAppTemplate[]>(STORAGE_KEYS.TEMPLATES, TEMPLATES_PADRAO);
    if (!stored || stored.length === 0) {
      return TEMPLATES_PADRAO;
    }
    return stored;
  }

  public async saveWhatsAppTemplate(template: WhatsAppTemplate): Promise<void> {
    const list = this.getWhatsAppTemplates();
    const idx = list.findIndex((t) => t.id === template.id);
    const updated = {
      ...template,
      updated_at: new Date().toISOString(),
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    this.set(STORAGE_KEYS.TEMPLATES, list);

    // Gravação direta no Supabase
    try {
      await supabase.from('whatsapp_templates').upsert({
        id: updated.id,
        titulo: updated.titulo,
        tipo: updated.tipo,
        mensagem: updated.mensagem,
        is_system: !!updated.isSystem,
        updated_at: updated.updated_at,
      });
    } catch (err) {
      console.error('Erro ao salvar template no Supabase:', err);
    }
  }

  public async deleteWhatsAppTemplate(id: string): Promise<boolean> {
    const list = this.getWhatsAppTemplates();
    const target = list.find((t) => t.id === id);
    if (target?.isSystem) {
      // Modelos padrão do sistema não são excluídos, podem ser restaurados
      return false;
    }
    const filtered = list.filter((t) => t.id !== id);
    this.set(STORAGE_KEYS.TEMPLATES, filtered);

    // Exclusão direta no Supabase
    try {
      await supabase.from('whatsapp_templates').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao excluir template no Supabase:', err);
    }
    return true;
  }

  public async resetWhatsAppTemplates(): Promise<void> {
    this.set(STORAGE_KEYS.TEMPLATES, TEMPLATES_PADRAO);
    try {
      for (const tpl of TEMPLATES_PADRAO) {
        await supabase.from('whatsapp_templates').upsert({
          id: tpl.id,
          titulo: tpl.titulo,
          tipo: tpl.tipo,
          mensagem: tpl.mensagem,
          is_system: !!tpl.isSystem,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Erro ao restaurar templates no Supabase:', err);
    }
  }

  // --- CONFIGURAÇÕES ---
  public getConfig(): ConfiguracoesApp {
    this.init();
    return this.get<ConfiguracoesApp>(STORAGE_KEYS.CONFIG, CONFIG_PADRAO);
  }

  public async saveConfig(config: ConfiguracoesApp): Promise<void> {
    this.set(STORAGE_KEYS.CONFIG, config);
    try {
      await supabase.from('configuracoes').upsert({
        id: 'config_padrao',
        nome_empresa: config.nomeEmpresa,
        cnpj_empresa: config.cnpjEmpresa,
        chave_pix_padrao: config.chavePixPadrao,
        instrucoes_cobranca: config.instrucoesCobranca,
        modo_offline: config.modoOffline,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Erro ao sincronizar configurações no Supabase:', err);
    }
  }

  // --- BACKUP & RESTORE ---
  public exportarDadosCompletos(): string {
    const payload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      pessoas: this.getPessoas(),
      contas: this.getContas(),
      parcelas: this.getParcelas(),
      mensalidades: this.getMensalidades(),
      config: this.getConfig(),
    };
    return JSON.stringify(payload, null, 2);
  }

  public importarDados(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.pessoas)) this.set(STORAGE_KEYS.PESSOAS, data.pessoas);
      if (Array.isArray(data.contas)) this.set(STORAGE_KEYS.CONTAS, data.contas);
      if (Array.isArray(data.parcelas)) this.set(STORAGE_KEYS.PARCELAS, data.parcelas);
      if (Array.isArray(data.mensalidades)) this.set(STORAGE_KEYS.MENSALIDADES, data.mensalidades);
      if (data.config) this.set(STORAGE_KEYS.CONFIG, data.config);
      return true;
    } catch (e) {
      console.error('Falha na importação do backup:', e);
      return false;
    }
  }

  public resetParaPadrao(): void {
    localStorage.removeItem(STORAGE_KEYS.PESSOAS);
    localStorage.removeItem(STORAGE_KEYS.CONTAS);
    localStorage.removeItem(STORAGE_KEYS.PARCELAS);
    localStorage.removeItem(STORAGE_KEYS.MENSALIDADES);
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    this.init();
  }
}

export const storageService = new StorageService();
