-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Perfis (vinculado ao auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Clientes
CREATE TABLE public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tipos de OP
CREATE TABLE public.op_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, -- Ex: Impressão, Laminação, Corte e Vinco
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tipos de Linha (com Tipo de Receita obrigatório)
CREATE TABLE public.line_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  recipe_type TEXT NOT NULL, -- Tipo de Receita correspondente
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tipos de Tela
CREATE TABLE public.screen_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tipos de Faca
CREATE TABLE public.knife_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tipos de Board
CREATE TABLE public.board_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cadastro de Itens Unificado
CREATE TABLE public.items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  screen_ref TEXT, -- Ref. Tela
  knife_ref TEXT, -- Ref. Faca
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ordens de Produção (Cabeçalho)
CREATE TABLE public.production_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  op_number SERIAL,
  op_type_id UUID REFERENCES public.op_types(id) ON DELETE RESTRICT,
  line_type_id UUID REFERENCES public.line_types(id) ON DELETE RESTRICT,
  board_type_id UUID REFERENCES public.board_types(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Itens da Ordem de Produção
CREATE TABLE public.production_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) - Simplificado para acesso autenticado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knife_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_order_items ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Permitir tudo para usuários logados)
CREATE POLICY "Allow authenticated full access" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.op_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.line_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.screen_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.knife_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.board_types FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.production_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access" ON public.production_order_items FOR ALL TO authenticated USING (true);

-- Trigger para criar Profile automaticamente após Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
