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
  status: BudgetStatus
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
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
