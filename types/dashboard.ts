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
  /** Browserbase live-view URL */
  streamingUrl?: string | null
  /** Browserbase debug/inspector URL */
  debugUrl?: string | null
  /** 0–100 overall progress percentage */
  progressPct?: number
  /** 0-based index of item currently being processed */
  currentItemIndex?: number
  /** Total items in this order run */
  totalItems?: number
  /** Live dashboard control signal for the active order */
  controlState?: "paused" | "stop_requested" | null
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
  firesprint_order_id?: string | null
  firesprint_order_url?: string | null
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
  /** Set when automation starts processing this order */
  processing_started_at?: string | null
  /** Set when automation reaches a terminal state (placed or failed) */
  completed_at?: string | null
  /** Live control state attached by backend dashboard endpoint */
  control_state?: "paused" | "stop_requested" | null
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
