-- ============================================================
-- TABLAS
-- ============================================================

-- profiles: uno por usuario, se crea automáticamente al registrarse (ver trigger)
CREATE TABLE public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name     text,
  company_name  text,
  nif           text,
  address       text,
  logo_url      text,
  brand_color   text        DEFAULT '#2563EB',
  tax_rate      text        NOT NULL DEFAULT '7',
  plan          text        NOT NULL DEFAULT 'free',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid          NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  budget_number  integer       NOT NULL,
  client_name    text,
  client_email   text,
  status         text          NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'sent')),
  subtotal       numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate       numeric(5,2)  NOT NULL DEFAULT 7,
  tax_amount     numeric(10,2) NOT NULL DEFAULT 0,
  total          numeric(10,2) NOT NULL DEFAULT 0,
  notes          text,
  valid_days     integer       DEFAULT 30,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE public.line_items (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id    uuid          NOT NULL REFERENCES public.budgets ON DELETE CASCADE,
  user_id      uuid          NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  description  text          NOT NULL,
  unit         text,
  quantity     numeric(10,3) NOT NULL DEFAULT 1,
  unit_price   numeric(10,2) NOT NULL DEFAULT 0,
  total        numeric(10,2) NOT NULL DEFAULT 0,
  confidence   text          CHECK (confidence IN ('alta', 'media', 'baja')),
  position     integer       NOT NULL DEFAULT 0,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE public.uploads (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id     uuid        REFERENCES public.budgets ON DELETE SET NULL,
  user_id       uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  storage_path  text        NOT NULL,
  file_name     text        NOT NULL,
  mime_type     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX budgets_user_id_idx    ON public.budgets (user_id);
CREATE INDEX line_items_budget_idx  ON public.line_items (budget_id);
CREATE INDEX line_items_user_idx    ON public.line_items (user_id);
CREATE INDEX uploads_user_idx       ON public.uploads (user_id);
CREATE INDEX uploads_budget_idx     ON public.uploads (budget_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- 1. Crea el profile automáticamente cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Asigna budget_number secuencial por usuario (no global)
--    SECURITY DEFINER para leer todos los budgets del usuario sin que RLS interfiera
CREATE OR REPLACE FUNCTION public.set_budget_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.budget_number := COALESCE(
    (SELECT MAX(budget_number) FROM public.budgets WHERE user_id = NEW.user_id),
    0
  ) + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_budget_number_before_insert
  BEFORE INSERT ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_budget_number();

-- 3. Actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads    ENABLE ROW LEVEL SECURITY;

-- profiles: los usuarios solo ven y editan su propio perfil
-- el INSERT lo hace el trigger (SECURITY DEFINER), pero la política existe por si acaso
CREATE POLICY "profiles: select own" ON public.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: insert own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- budgets
CREATE POLICY "budgets: select own" ON public.budgets
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "budgets: insert own" ON public.budgets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "budgets: update own" ON public.budgets
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "budgets: delete own" ON public.budgets
  FOR DELETE USING (user_id = auth.uid());

-- line_items
CREATE POLICY "line_items: select own" ON public.line_items
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "line_items: insert own" ON public.line_items
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "line_items: update own" ON public.line_items
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "line_items: delete own" ON public.line_items
  FOR DELETE USING (user_id = auth.uid());

-- uploads
CREATE POLICY "uploads: select own" ON public.uploads
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "uploads: insert own" ON public.uploads
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "uploads: update own" ON public.uploads
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "uploads: delete own" ON public.uploads
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Bucket para logos de empresa (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', false);

-- Bucket para fotos de obra subidas por el usuario (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false);

-- Política de Storage: cada usuario solo accede a su carpeta (path: {user_id}/...)
CREATE POLICY "logos: user owns folder" ON storage.objects
  FOR ALL
  USING  (bucket_id = 'logos'   AND auth.uid()::text = (string_to_array(name, '/'))[1])
  WITH CHECK (bucket_id = 'logos'   AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "uploads: user owns folder" ON storage.objects
  FOR ALL
  USING  (bucket_id = 'uploads' AND auth.uid()::text = (string_to_array(name, '/'))[1])
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (string_to_array(name, '/'))[1]);
