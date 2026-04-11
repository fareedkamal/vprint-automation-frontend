export type VendorStatus =
  | "pending"
  | "processing"
  | "placed"
  | "failed"
  | "awaiting_approval"
  | "on_hold"
  | "in-review"
  | "other_vendor_status"

export type PollerProcessing = {
  active: boolean
  orderId?: string
  wooOrderId?: string | number
  step?: string
}

export type PollerSnapshot = {
  isBusy: boolean
  processing: PollerProcessing
}

export type FiresprintQueue = {
  pending: number
  processing: number
  pending_plus_processing: number
}

export type CompletionStats = {
  placed: number
  failed: number
  terminal: number
  completion_rate: number | null
}

export type OverviewData = {
  generated_at: string
  poller: PollerSnapshot
  firesprint_lines_by_status: Record<string, number>
  firesprint_queue: FiresprintQueue
  order_status_counts: Record<string, number>
  firesprint_line_completion: CompletionStats
  webhooks_logged_last_24h: number
}

export type OrderItem = {
  id: string
  order_id: string
  vendor: string
  vendor_status: string
  sku: string
  product_name: string | null
  quantity: number | null
  agent_message: string | null
  artwork_url: string | null
  woo_line_item_id: string | null
}

export type Order = {
  id: string
  woo_order_id: number
  status: string
  woo_status: string | null
  customer_name: string | null
  customer_email: string | null
  created_at: string
  date_created?: string
  order_items: OrderItem[]
}

export type OrdersResponse = {
  limit: number
  offset: number
  total: number
  firesprint_only: boolean
  orders: Order[]
}

export type AutomationEvent = {
  id: string
  event_type: string
  order_id: string | null
  woo_order_id: number | null
  message: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export type EventsResponse = {
  limit: number
  order_id: string | null
  woo_order_id: number | null
  event_type: string | null
  events: AutomationEvent[]
}

export type EventTypesResponse = {
  event_types: string[]
}
