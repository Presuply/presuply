ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS tax_type text NOT NULL DEFAULT 'IGIC',
  ADD COLUMN IF NOT EXISTS overhead_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overhead_rate numeric(5,2) NOT NULL DEFAULT 13.00,
  ADD COLUMN IF NOT EXISTS profit_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profit_rate numeric(5,2) NOT NULL DEFAULT 6.00,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_nif text,
  ADD COLUMN IF NOT EXISTS extras_description text,
  ADD COLUMN IF NOT EXISTS extras_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_number text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS invoice_prefix text DEFAULT '26';
