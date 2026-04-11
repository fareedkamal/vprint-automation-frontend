"use client"

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { use } from "react"
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
import { useDashboardQuery } from "@/hooks/use-dashboard-api"
import { cn } from "@/lib/utils"
import type { AutomationEvent, EventsResponse, Order } from "@/types/dashboard"

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

// ── Order info ────────────────────────────────────────────────────────────────

function OrderInfoCard({ order }: { order: Order }) {
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
    ["Created", new Date(order.created_at).toLocaleString()],
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
              <dt className="w-36 text-muted-foreground shrink-0">{label}</dt>
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

  const {
    data: order,
    isLoading: orderLoading,
    error: orderError,
  } = useDashboardQuery<Order>(`internal/dashboard/orders/by-woo/${wooId}`, {
    refetchInterval: 15_000,
  })

  const { data: eventsData, isLoading: eventsLoading } =
    useDashboardQuery<EventsResponse>("internal/dashboard/events", {
      searchParams: { woo_order_id: wooId, limit: 100 },
      enabled: !!order,
      refetchInterval: 15_000,
    })

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

  const failedItems = (order.order_items ?? []).filter(
    (i) => i.vendor === "FireSprint" && i.vendor_status === "failed"
  )
  const processingItems = (order.order_items ?? []).filter(
    (i) => i.vendor === "FireSprint" && i.vendor_status === "processing"
  )
  const pendingItems = (order.order_items ?? []).filter(
    (i) => i.vendor === "FireSprint" && i.vendor_status === "pending"
  )

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
          <h2 className="text-xl font-semibold">Order #{order.woo_order_id}</h2>
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

      {/* Alert: currently processing */}
      {processingItems.length > 0 && (
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
          <OrderInfoCard order={order} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
