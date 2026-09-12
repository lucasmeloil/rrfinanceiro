import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://djqykdfnmbonnohcijwf.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_JVEchFVme0KIYWjLrySSSA_XAI-8VI0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface SupabaseSyncStatus {
  online: boolean;
  tablePessoas: boolean;
  tableContas: boolean;
  tableParcelas: boolean;
  tableMensalidades: boolean;
  tableConfiguracoes: boolean;
  tableAuditoria: boolean;
  lastChecked: string;
  error?: string;
}

export async function checkSupabaseConnection(): Promise<SupabaseSyncStatus> {
  const status: SupabaseSyncStatus = {
    online: false,
    tablePessoas: false,
    tableContas: false,
    tableParcelas: false,
    tableMensalidades: false,
    tableConfiguracoes: false,
    tableAuditoria: false,
    lastChecked: new Date().toLocaleTimeString('pt-BR'),
  };

  try {
    // Tenta consultar a tabela pessoas
    const { error } = await supabase.from('pessoas').select('id').limit(1);
    if (!error) {
      status.online = true;
      status.tablePessoas = true;
    } else {
      status.error = error.message;
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        status.online = true;
      }
    }

    // Checa contas
    const { error: errContas } = await supabase.from('contas').select('id').limit(1);
    if (!errContas) status.tableContas = true;

    // Checa parcelas
    const { error: errParcelas } = await supabase.from('parcelas').select('id').limit(1);
    if (!errParcelas) status.tableParcelas = true;

    // Checa mensalidades
    const { error: errMens } = await supabase.from('mensalidades').select('id').limit(1);
    if (!errMens) status.tableMensalidades = true;

    // Checa configuracoes
    const { error: errCfg } = await supabase.from('configuracoes').select('id').limit(1);
    if (!errCfg) status.tableConfiguracoes = true;

    // Checa auditoria
    const { error: errAudit } = await supabase.from('auditoria_seguranca').select('id').limit(1);
    if (!errAudit) status.tableAuditoria = true;

    return status;
  } catch (err: any) {
    status.error = err.message || 'Falha de conexão com Supabase';
    return status;
  }
}
