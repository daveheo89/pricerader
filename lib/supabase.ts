import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── 타입 ────────────────────────────────────
export type Product = {
  id:              string
  group_id:        string | null
  name:            string
  my_price:        number | null
  is_tracking:     boolean
  last_checked_at: string | null
  created_at:      string
}

export type PriceHistory = {
  id:                  string
  product_id:          string
  checked_at:          string
  naver_lowest_price:  number | null
  mall_name:           string | null
  shipping:            number
  total:               number | null
  link:                string | null
}

export type Group = {
  id:         string
  name:       string
  color:      string
  created_at: string
}

export type Settings = {
  id:                    number
  naver_client_id:       string | null
  naver_client_secret:   string | null
  alert_email:           string | null
  cron_time:             string
}
