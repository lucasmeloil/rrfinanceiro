-- ==============================================================================
-- RR FINANCEIRO - ESQUEMA DE BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Projeto: https://djqykdfnmbonnohcijwf.supabase.co
-- Status: Implante Executado com Sucesso via Supabase Management API
-- ==============================================================================

-- 1. TABELA DE PESSOAS (CLIENTES & FORNECEDORES)
CREATE TABLE IF NOT EXISTS public.pessoas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    tipo TEXT NOT NULL DEFAULT 'cliente',
    dia_emissao_mensalidade INTEGER DEFAULT 1,
    dia_vencimento_mensalidade INTEGER DEFAULT 10,
    valor_mensalidade_padrao NUMERIC(12, 2) DEFAULT 0.00,
    chave_pix TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CONTAS (A RECEBER E A PAGAR)
CREATE TABLE IF NOT EXISTS public.contas (
    id TEXT PRIMARY KEY,
    pessoa_id TEXT REFERENCES public.pessoas(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receber', 'pagar')),
    categoria TEXT,
    descricao TEXT NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor_total NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    numero_parcelas INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE PARCELAS (INCLUINDO PARCELAS COMPLEMENTARES)
CREATE TABLE IF NOT EXISTS public.parcelas (
    id TEXT PRIMARY KEY,
    conta_id TEXT REFERENCES public.contas(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    total_parcelas INTEGER NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    valor_pago NUMERIC(12, 2),
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente',
    is_complementar BOOLEAN DEFAULT FALSE,
    parcela_origem_id TEXT,
    observacoes TEXT
);

-- 4. TABELA DE MENSALIDADES (RECORRÊNCIA E LOTES)
CREATE TABLE IF NOT EXISTS public.mensalidades (
    id TEXT PRIMARY KEY,
    pessoa_id TEXT REFERENCES public.pessoas(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL,
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    valor_pago NUMERIC(12, 2),
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente',
    conta_id TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id TEXT PRIMARY KEY DEFAULT 'config_padrao',
    nome_empresa TEXT DEFAULT 'RR Financeiro & Gestão',
    cnpj_empresa TEXT,
    chave_pix_padrao TEXT,
    instrucoes_cobranca TEXT,
    modo_offline BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE AUDITORIA DE SEGURANÇA CYBER
CREATE TABLE IF NOT EXISTS public.auditoria_seguranca (
    id TEXT PRIMARY KEY,
    threat_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    details TEXT NOT NULL,
    blocked_input TEXT,
    ip_mock TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_seguranca ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS COMPLETAS DE CRUD: PESSOAS
DROP POLICY IF EXISTS "Permitir select pessoas" ON public.pessoas;
CREATE POLICY "Permitir select pessoas" ON public.pessoas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insert pessoas" ON public.pessoas;
CREATE POLICY "Permitir insert pessoas" ON public.pessoas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update pessoas" ON public.pessoas;
CREATE POLICY "Permitir update pessoas" ON public.pessoas FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete pessoas" ON public.pessoas;
CREATE POLICY "Permitir delete pessoas" ON public.pessoas FOR DELETE USING (true);

-- POLÍTICAS COMPLETAS DE CRUD: CONTAS
DROP POLICY IF EXISTS "Permitir select contas" ON public.contas;
CREATE POLICY "Permitir select contas" ON public.contas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insert contas" ON public.contas;
CREATE POLICY "Permitir insert contas" ON public.contas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update contas" ON public.contas;
CREATE POLICY "Permitir update contas" ON public.contas FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete contas" ON public.contas;
CREATE POLICY "Permitir delete contas" ON public.contas FOR DELETE USING (true);

-- POLÍTICAS COMPLETAS DE CRUD: PARCELAS
DROP POLICY IF EXISTS "Permitir select parcelas" ON public.parcelas;
CREATE POLICY "Permitir select parcelas" ON public.parcelas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insert parcelas" ON public.parcelas;
CREATE POLICY "Permitir insert parcelas" ON public.parcelas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update parcelas" ON public.parcelas;
CREATE POLICY "Permitir update parcelas" ON public.parcelas FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete parcelas" ON public.parcelas;
CREATE POLICY "Permitir delete parcelas" ON public.parcelas FOR DELETE USING (true);

-- POLÍTICAS COMPLETAS DE CRUD: MENSALIDADES
DROP POLICY IF EXISTS "Permitir select mensalidades" ON public.mensalidades;
CREATE POLICY "Permitir select mensalidades" ON public.mensalidades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insert mensalidades" ON public.mensalidades;
CREATE POLICY "Permitir insert mensalidades" ON public.mensalidades FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update mensalidades" ON public.mensalidades;
CREATE POLICY "Permitir update mensalidades" ON public.mensalidades FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete mensalidades" ON public.mensalidades;
CREATE POLICY "Permitir delete mensalidades" ON public.mensalidades FOR DELETE USING (true);

-- POLÍTICAS COMPLETAS DE CRUD: CONFIGURACOES
DROP POLICY IF EXISTS "Permitir select configuracoes" ON public.configuracoes;
CREATE POLICY "Permitir select configuracoes" ON public.configuracoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insert configuracoes" ON public.configuracoes;
CREATE POLICY "Permitir insert configuracoes" ON public.configuracoes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update configuracoes" ON public.configuracoes;
CREATE POLICY "Permitir update configuracoes" ON public.configuracoes FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete configuracoes" ON public.configuracoes;
CREATE POLICY "Permitir delete configuracoes" ON public.configuracoes FOR DELETE USING (true);

-- POLÍTICAS COMPLETAS DE CRUD: AUDITORIA_SEGURANCA
DROP POLICY IF EXISTS "Permitir select auditoria" ON public.auditoria_seguranca;
CREATE POLICY "Permitir select auditoria" ON public.auditoria_seguranca FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insert auditoria" ON public.auditoria_seguranca;
CREATE POLICY "Permitir insert auditoria" ON public.auditoria_seguranca FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update auditoria" ON public.auditoria_seguranca;
CREATE POLICY "Permitir update auditoria" ON public.auditoria_seguranca FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete auditoria" ON public.auditoria_seguranca;
CREATE POLICY "Permitir delete auditoria" ON public.auditoria_seguranca FOR DELETE USING (true);

-- ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_contas_pessoa ON public.contas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_conta ON public.parcelas(conta_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON public.parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_mensalidades_pessoa ON public.mensalidades(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_mensalidades_mes ON public.mensalidades(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON public.auditoria_seguranca(created_at);
