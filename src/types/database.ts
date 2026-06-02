export type BudgetStatus = 'draft' | 'sent'
export type Confidence = 'alta' | 'media' | 'baja'

export interface Profile {
  id: string
  full_name: string | null
  company_name: string | null
  nif: string | null
  address: string | null
  logo_url: string | null
  brand_color: string | null
  tax_rate: string
  phone: string | null
  iban: string | null
  invoice_prefix: string | null
  template_url: string | null
  plan: string
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  budget_number: number
  client_name: string | null
  client_email: string | null
  client_address: string | null
  client_phone: string | null
  client_nif: string | null
  status: BudgetStatus
  tax_type: string
  tax_rate: number
  subtotal: number
  overhead_enabled: boolean
  overhead_rate: number
  profit_enabled: boolean
  profit_rate: number
  extras_description: string | null
  extras_amount: number | null
  tax_amount: number
  total: number
  issued_date: string
  invoice_number: string | null
  notes: string | null
  valid_days: number | null
  created_at: string
  updated_at: string
}

export interface LineItem {
  id: string
  budget_id: string
  user_id: string
  description: string
  unit: string | null
  quantity: number
  unit_price: number
  total: number
  confidence: Confidence | null
  position: number
  created_at: string
}

export interface Upload {
  id: string
  budget_id: string | null
  user_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  created_at: string
}
