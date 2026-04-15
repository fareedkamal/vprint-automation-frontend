"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Square,
  Timer,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { use } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDashboardQuery, useOrderControl } from "@/hooks/use-dashboard-api"
import { cn } from "@/lib/utils"
import type {
  AutomationEvent,
  EventsResponse,
  Order,
  OverviewData,
} from "@/types/dashboard"

const ORDER_DETAIL_EVENTS_SKELETON_KEYS = [
  "ode1",
  "ode2",
  "ode3",
  "ode4",
  "ode5",
] as const

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  processing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  placed:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  received: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  awaiting_approval:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  on_hold: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "in-review":
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
}

function Pill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] ??
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      )}
    >
      {status}
    </span>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === "placed")
    return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
  if (status === "failed")
    return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
  if (status === "processing")
    return <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
  if (status === "pending")
    return <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
  if (status === "awaiting_approval")
    return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
  return null
}

// ── Duration helper ───────────────────────────────────────────────────────────

function fmtDuration(
  startIso: string | null | undefined,
  endIso: string | null | undefined
): string | null {
  if (!startIso) return null
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const secs = Math.max(0, Math.round((end - start) / 1000))
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  pct,
  color = "blue",
}: {
  pct: number
  color?: "blue" | "green" | "red"
}) {
  const bg = { blue: "bg-blue-500", green: "bg-green-500", red: "bg-red-500" }[
    color
  ]
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Automation progress</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", bg)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Live control panel (shown when order is actively running) ─────────────────

function LiveControlPanel({
  order,
  overview,
  onAction,
}: {
  order: Order
  overview: OverviewData | undefined
  onAction: () => void
}) {
  const proc = overview?.poller.processing
  const isThisOrder = proc?.active && proc.orderId === order.id
  const { act, pending: actionPending, error: actionError } = useOrderControl()

  if (!isThisOrder) return null

  const pct = proc?.progressPct ?? 0
  const itemCount =
    (proc?.totalItems ?? 0) > 1
      ? `Item ${(proc?.currentItemIndex ?? 0) + 1} / ${proc?.totalItems}`
      : null

  async function handleAction(action: "pause" | "resume" | "stop") {
    if (!order.id) return
    if (action === "stop") {
      if (
        !window.confirm(
          "Stop this order and mark it as FAILED? This cannot be undone."
        )
      )
        return
    }
    const ok = await act(order.id, action)
    if (ok) onAction()
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Automation running
          </span>
          {itemCount && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
              {itemCount}
            </span>
          )}
          {proc?.step && (
            <span className="text-xs font-mono text-muted-foreground">
              step: {proc.step}
            </span>
          )}
        </div>

        {/* Progress */}
        <ProgressBar pct={pct} color="blue" />

        {/* Session URLs */}
        {(proc?.streamingUrl || proc?.debugUrl) && (
          <div className="flex flex-wrap gap-2">
            {proc?.streamingUrl && (
              <a
                href={proc.streamingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-950/30 text-xs font-medium hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Live session
              </a>
            )}
            {proc?.debugUrl && (
              <a
                href={proc.debugUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-white dark:bg-purple-950/30 text-xs font-medium hover:bg-purple-50 transition-colors"
              >
                <Bug className="h-3 w-3" />
                Debug inspector
              </a>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-blue-200 dark:border-blue-800">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-yellow-400 text-yellow-600 dark:text-yellow-400 bg-white dark:bg-transparent"
            disabled={actionPending !== null}
            onClick={() => handleAction("pause")}
          >
            {actionPending === "pause" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
            Pause
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-green-400 text-green-600 dark:text-green-400 bg-white dark:bg-transparent"
            disabled={actionPending !== null}
            onClick={() => handleAction("resume")}
          >
            {actionPending === "resume" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Resume
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-red-400 text-red-600 dark:text-red-400 bg-white dark:bg-transparent"
            disabled={actionPending !== null}
            onClick={() => handleAction("stop")}
          >
            {actionPending === "stop" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Square className="h-3 w-3 fill-current" />
            )}
            Stop &amp; fail
          </Button>
        </div>

        {actionError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {actionError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Order info ────────────────────────────────────────────────────────────────

function OrderInfoCard({
  order,
  sessionUrl,
  debugUrl,
}: {
  order: Order
  sessionUrl?: string | null
  debugUrl?: string | null
}) {
  const duration = fmtDuration(order.processing_started_at, order.completed_at)

  const rows: [string, React.ReactNode][] = [
    [
      "Woo Order ID",
      <span key="w" className="font-mono">
        #{order.woo_order_id}
      </span>,
    ],
    [
      "Internal ID",
      <span key="i" className="font-mono text-xs break-all">
        {order.id}
      </span>,
    ],
    ["Status", <Pill key="s" status={order.status} />],
    [
      "WC Status",
      order.woo_status ? <Pill key="ws" status={order.woo_status} /> : "—",
    ],
    ["Customer", order.customer_name ?? "—"],
    ["Email", order.customer_email ?? "—"],
    [
      "Created",
      <span key="c" className="text-sm">
        {new Date(order.created_at).toLocaleString()}
      </span>,
    ],
    [
      "Processing started",
      order.processing_started_at ? (
        <span key="ps" className="text-sm">
          {new Date(order.processing_started_at).toLocaleString()}
        </span>
      ) : (
        <span key="ps" className="text-muted-foreground">
          Not started
        </span>
      ),
    ],
    [
      "Completed at",
      order.completed_at ? (
        <span key="co" className="text-sm">
          {new Date(order.completed_at).toLocaleString()}
        </span>
      ) : (
        <span key="co" className="text-muted-foreground">
          —
        </span>
      ),
    ],
    [
      "Total duration",
      duration ? (
        <span key="dur" className="flex items-center gap-1.5 font-semibold">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          {duration}
          {!order.completed_at && order.processing_started_at && (
            <span className="text-xs text-blue-500 font-normal">(running)</span>
          )}
        </span>
      ) : (
        <span key="dur" className="text-muted-foreground">
          —
        </span>
      ),
    ],
    [
      "Session URL",
      sessionUrl ? (
        <a
          key="session"
          href={sessionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Open live session
        </a>
      ) : (
        <span key="session" className="text-muted-foreground">
          —
        </span>
      ),
    ],
    [
      "Debug URL",
      debugUrl ? (
        <a
          key="debug"
          href={debugUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
        >
          <Bug className="h-3 w-3" />
          Open debug inspector
        </a>
      ) : (
        <span key="debug" className="text-muted-foreground">
          —
        </span>
      ),
    ],
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Order Details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y dark:divide-gray-800">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start gap-4 py-2.5 text-sm">
              <dt className="w-40 text-muted-foreground shrink-0">{label}</dt>
              <dd className="font-medium flex-1 min-w-0">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

// ── Line items ────────────────────────────────────────────────────────────────

function LineItemsTab({ order }: { order: Order }) {
  const fs = (order.order_items ?? []).filter((i) => i.vendor === "FireSprint")
  const other = (order.order_items ?? []).filter(
    (i) => i.vendor !== "FireSprint"
  )

  return (
    <div className="space-y-4">
      {fs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">FireSprint Lines</CardTitle>
            <CardDescription>{fs.length} line item(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-16">Qty</TableHead>
                  <TableHead className="w-40">Status</TableHead>
                  <TableHead>FS Order</TableHead>
                  <TableHead>Reason / Agent Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.product_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.quantity ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={item.vendor_status} />
                        <Pill status={item.vendor_status} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.firesprint_order_url ? (
                        <a
                          href={item.firesprint_order_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {item.firesprint_order_id ?? "View"}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.agent_message ? (
                        <p
                          className={cn(
                            "text-xs max-w-sm leading-relaxed",
                            item.vendor_status === "failed" &&
                              "text-red-600 dark:text-red-400",
                            item.vendor_status === "placed" &&
                              "text-green-600 dark:text-green-400",
                            !["failed", "placed"].includes(
                              item.vendor_status
                            ) && "text-muted-foreground"
                          )}
                        >
                          {item.agent_message}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {other.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Other Vendor Lines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {other.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.product_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.quantity ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.vendor}
                    </TableCell>
                    <TableCell>
                      <Pill status={item.vendor_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {fs.length === 0 && other.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No line items found.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Automation event timeline ─────────────────────────────────────────────────

const EVENT_STYLE: Record<string, string> = {
  order_run_start: "border-blue-400 bg-blue-50 dark:bg-blue-950/40",
  order_run_end: "border-green-400 bg-green-50 dark:bg-green-950/40",
  order_checkout_start: "border-purple-400 bg-purple-50 dark:bg-purple-950/40",
  queue_snapshot: "border-gray-300 bg-gray-50 dark:bg-gray-800/40",
  woo_webhook: "border-sky-400 bg-sky-50 dark:bg-sky-950/40",
}

function EventTimeline({ events }: { events: AutomationEvent[] }) {
  if (!events.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No automation events found for this order.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2.5">
      {events.map((event) => (
        <div
          key={event.id}
          className={cn(
            "border-l-4 rounded-r-lg px-4 py-3",
            EVENT_STYLE[event.event_type] ??
              "border-gray-300 bg-gray-50 dark:bg-gray-800/40"
          )}
        >
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="font-mono text-xs font-semibold">
              {event.event_type}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(event.created_at).toLocaleString()}
            </span>
          </div>
          {event.message && (
            <p className="text-sm text-foreground/80">{event.message}</p>
          )}
          {event.payload && Object.keys(event.payload).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                Payload ›
              </summary>
              <pre className="text-xs mt-1.5 bg-white/60 dark:bg-black/20 rounded p-2 overflow-x-auto">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ wooId: string }>
}) {
  const { wooId } = use(params)
  const queryClient = useQueryClient()

  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useDashboardQuery<Order>(`internal/dashboard/orders/by-woo/${wooId}`, {
    refetchInterval: 10_000,
  })

  const { data: eventsData, isLoading: eventsLoading } =
    useDashboardQuery<EventsResponse>("internal/dashboard/events", {
      searchParams: { woo_order_id: wooId, limit: 100 },
      enabled: !!order,
      refetchInterval: 10_000,
    })

  const { data: overview } = useDashboardQuery<OverviewData>(
    "internal/dashboard/overview",
    { refetchInterval: 8_000 }
  )

  function invalidateAll() {
    queryClient.invalidateQueries({
      queryKey: [`internal/dashboard/orders/by-woo/${wooId}`],
    })
    queryClient.invalidateQueries({
      queryKey: ["internal/dashboard/overview"],
    })
  }

  // ── Loading ──
  if (orderLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    )
  }

  // ── Error / not found ──
  if (orderError || !order) {
    return (
      <div className="p-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-red-600 dark:text-red-400">
            {orderError?.message ?? `Order #${wooId} not found.`}
          </CardContent>
        </Card>
      </div>
    )
  }

  const isActiveOrder =
    overview?.poller.processing.active &&
    overview.poller.processing.orderId === order.id

  const failedItems = (order.order_items ?? []).filter(
    (i) => i.vendor === "FireSprint" && i.vendor_status === "failed"
  )
  const processingItems = (order.order_items ?? []).filter(
    (i) => i.vendor === "FireSprint" && i.vendor_status === "processing"
  )
  const pendingItems = (order.order_items ?? []).filter(
    (i) => i.vendor === "FireSprint" && i.vendor_status === "pending"
  )

  // Progress for placed / failed orders
  const staticPct =
    order.status === "placed" ? 100 : order.status === "failed" ? 100 : null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/orders"
          className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Order #{order.woo_order_id}
            {isActiveOrder && (
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {order.customer_name ?? "Unknown customer"} ·{" "}
            {order.customer_email ?? "no email"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Pill status={order.status} />
          {order.woo_status && order.woo_status !== order.status && (
            <Pill status={order.woo_status} />
          )}
        </div>
      </div>

      {/* Static progress bar (placed / failed) */}
      {staticPct !== null && !isActiveOrder && (
        <ProgressBar
          pct={staticPct}
          color={order.status === "placed" ? "green" : "red"}
        />
      )}

      {/* Live control panel */}
      <LiveControlPanel
        order={order}
        overview={overview}
        onAction={invalidateAll}
      />

      {/* Alert: failed items */}
      {failedItems.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {failedItems.length} FireSprint line
                  {failedItems.length > 1 ? "s" : ""} failed
                </p>
                {failedItems.map((item) =>
                  item.agent_message ? (
                    <p
                      key={item.id}
                      className="text-xs text-red-600 dark:text-red-400"
                    >
                      <span className="font-mono font-semibold">
                        {item.sku}
                      </span>
                      : {item.agent_message}
                    </p>
                  ) : null
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert: currently processing (not live panel) */}
      {processingItems.length > 0 && !isActiveOrder && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {processingItems.length} line
                {processingItems.length > 1 ? "s" : ""} currently being
                automated
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert: in queue */}
      {pendingItems.length > 0 && processingItems.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                {pendingItems.length} line{pendingItems.length > 1 ? "s" : ""}{" "}
                waiting in queue
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="lines">
        <TabsList>
          <TabsTrigger value="lines">
            Line Items ({(order.order_items ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="events">
            Automation Events (
            {eventsLoading ? "…" : (eventsData?.events.length ?? 0)})
          </TabsTrigger>
          <TabsTrigger value="info">Order Info</TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="mt-4">
          <LineItemsTab order={order} />
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {eventsLoading ? (
            <div className="space-y-2.5">
              {ORDER_DETAIL_EVENTS_SKELETON_KEYS.map((rowKey) => (
                <Skeleton key={rowKey} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <EventTimeline events={eventsData?.events ?? []} />
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <OrderInfoCard
            order={order}
            sessionUrl={
              isActiveOrder ? overview?.poller.processing.streamingUrl : null
            }
            debugUrl={
              isActiveOrder ? overview?.poller.processing.debugUrl : null
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
