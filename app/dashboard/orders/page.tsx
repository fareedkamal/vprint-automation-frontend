"use client"

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Square,
  Timer,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDashboardQuery, useOrderControl } from "@/hooks/use-dashboard-api"
import { cn } from "@/lib/utils"
import type { Order, OrdersResponse, OverviewData } from "@/types/dashboard"

const ORDERS_TABLE_SKELETON_KEYS = [
  "ot1",
  "ot2",
  "ot3",
  "ot4",
  "ot5",
  "ot6",
  "ot7",
  "ot8",
  "ot9",
  "ot10",
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-[#dfe568]/40 text-[hsl(262_42%_18%)] dark:bg-[#dfe568]/20 dark:text-[#dfe568]",
  processing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  placed:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  failed:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  received: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  awaiting_approval:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  on_hold: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "in-review":
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  paused:
    "bg-[#dfe568]/40 text-[hsl(262_42%_18%)] dark:bg-[#dfe568]/20 dark:text-[#dfe568]",
  "stop requested":
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

function Pill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] ??
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        className
      )}
    >
      {status}
    </span>
  )
}

function controlStateLabel(
  controlState?: Order["control_state"]
): string | null {
  if (controlState === "paused") return "paused"
  if (controlState === "stop_requested") return "stop requested"
  return null
}

function FsLineSummary({ items }: { items: Order["order_items"] }) {
  const fs = (items ?? []).filter((i) => i.vendor === "FireSprint")
  if (!fs.length)
    return <span className="text-xs text-muted-foreground">—</span>

  const groups = new Map<string, number>()
  for (const item of fs) {
    const s = item.vendor_status ?? "?"
    groups.set(s, (groups.get(s) ?? 0) + 1)
  }

  return (
    <div className="flex flex-wrap gap-1">
      {[...groups.entries()].map(([status, count]) => (
        <Pill key={status} status={`${status} ×${count}`} />
      ))}
    </div>
  )
}

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

const PAGE_SIZE = 10
const MAX_VISIBLE_PAGE_BUTTONS = 10

function pageButtonWindow(
  currentPage: number,
  totalPages: number
): [number, number] {
  if (totalPages <= MAX_VISIBLE_PAGE_BUTTONS)
    return [1, Math.max(1, totalPages)]
  let start = currentPage - Math.floor(MAX_VISIBLE_PAGE_BUTTONS / 2)
  if (start < 1) start = 1
  let end = start + MAX_VISIBLE_PAGE_BUTTONS - 1
  if (end > totalPages) {
    end = totalPages
    start = end - MAX_VISIBLE_PAGE_BUTTONS + 1
  }
  return [start, end]
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage({
  defaultFiresprintOnly = true,
}: {
  defaultFiresprintOnly?: boolean
}) {
  const [firesprintOnly, setFiresprintOnly] = useState(defaultFiresprintOnly)
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("__all__")
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [stopConfirm, setStopConfirm] = useState<{
    order: Order
    isActive: boolean
  } | null>(null)

  const offset = (page - 1) * PAGE_SIZE

  const { data, isLoading, error, refetch, isFetching } =
    useDashboardQuery<OrdersResponse>("internal/dashboard/orders", {
      searchParams: {
        limit: PAGE_SIZE,
        offset,
        firesprint_only: firesprintOnly ? 1 : 0,
        ...(statusFilter !== "__all__" ? { status: statusFilter } : {}),
        ...(appliedSearch ? { q: appliedSearch } : {}),
      },
      refetchInterval: 15_000,
    })

  // Fetch live poller state for active order indicator + progress
  const { data: overview } = useDashboardQuery<OverviewData>(
    "internal/dashboard/overview",
    { refetchInterval: 8_000 }
  )

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)
  const effectivePage = Math.min(page, totalPages)
  const [btnStart, btnEnd] = pageButtonWindow(effectivePage, totalPages)
  const pageButtons = Array.from(
    { length: btnEnd - btnStart + 1 },
    (_, i) => btnStart + i
  )

  const activeOrderId = overview?.poller.processing.active
    ? overview.poller.processing.orderId
    : null
  const { act, pending: actionPending, error: actionError } = useOrderControl()

  useEffect(() => {
    if (!data) return
    const tp = Math.max(1, Math.ceil(data.total / PAGE_SIZE) || 1)
    if (page > tp) setPage(tp)
  }, [data, page])

  async function handleOrderAction(
    action: "pause" | "resume" | "stop",
    order: Order
  ) {
    if (!order.id) return
    const ok = await act(order.id, action)
    if (ok) {
      refetch()
      setSelectedOrder(null)
      setStopConfirm(null)
    }
  }

  function openStopConfirm(order: Order, isActive: boolean) {
    setStopConfirm({ order, isActive })
  }

  function applyFilters() {
    setAppliedSearch(searchInput.trim())
    setPage(1)
  }

  function clearFilters() {
    setSearchInput("")
    setAppliedSearch("")
    setStatusFilter("__all__")
    setPage(1)
  }

  const hasFilter = appliedSearch.length > 0 || statusFilter !== "__all__"

  return (
    <div className="w-full min-w-0 p-6 lg:px-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {data
              ? `Page ${effectivePage} of ${totalPages} · ${total} order${total === 1 ? "" : "s"}`
              : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={firesprintOnly ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setFiresprintOnly((v) => !v)
              setPage(1)
            }}
          >
            FireSprint only
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("h-4 w-4", isFetching && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-56">
              <label
                className="text-xs text-muted-foreground mb-1 block"
                htmlFor="orders-search"
              >
                Search
              </label>
              <Input
                id="orders-search"
                placeholder="Woo #, customer name, email"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <div className="w-48">
              <label
                className="text-xs text-muted-foreground mb-1 block"
                htmlFor="orders-status-filter"
              >
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger id="orders-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="awaiting_approval">
                    Awaiting approval
                  </SelectItem>
                  <SelectItem value="on_hold">On hold</SelectItem>
                  <SelectItem value="in-review">In review</SelectItem>
                  <SelectItem value="placed">Placed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={applyFilters}
            >
              Apply
            </Button>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
          {hasFilter && (
            <p className="text-xs text-muted-foreground mt-2">
              Filters:
              {appliedSearch && (
                <>
                  {" "}
                  search = <code>{appliedSearch}</code>
                </>
              )}
              {appliedSearch && statusFilter !== "__all__" && " ·"}
              {statusFilter !== "__all__" && (
                <>
                  {" "}
                  status = <code>{statusFilter}</code>
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-sm text-red-600 dark:text-red-400">
            {error.message}
          </CardContent>
        </Card>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {ORDERS_TABLE_SKELETON_KEYS.map((rowKey) => (
            <Skeleton key={rowKey} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Table */}
      {data && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Woo #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">
                    <span className="flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />
                      Duration
                    </span>
                  </TableHead>
                  <TableHead>FS Lines</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                  <TableHead className="w-32">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-14 text-sm"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
                {data.orders.map((order) => {
                  const isActive = order.id === activeOrderId

                  // Duration
                  const duration = fmtDuration(
                    order.processing_started_at,
                    order.completed_at ?? (isActive ? null : undefined)
                  )
                  const isLiveDuration = isActive && !order.completed_at

                  return (
                    <TableRow
                      key={order.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40 transition-colors",
                        isActive &&
                          "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      )}
                    >
                      <TableCell className="font-mono font-semibold text-sm">
                        <div className="flex items-center gap-1.5">
                          #{order.woo_order_id}
                          {isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{order.customer_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.customer_email ?? ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start min-w-0 max-w-full">
                          <Pill
                            status={order.status}
                            className="max-w-[50%] w-fit"
                          />
                          {order.woo_status && (
                            <span className="text-[11px] text-muted-foreground">
                              Woo: {order.woo_status}
                            </span>
                          )}
                          {controlStateLabel(order.control_state) && (
                            <span className="text-[11px] text-muted-foreground">
                              {controlStateLabel(order.control_state)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {duration ? (
                          <span
                            className={cn(
                              "font-medium",
                              isLiveDuration
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-foreground"
                            )}
                          >
                            {duration}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <FsLineSummary items={order.order_items ?? []} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Manage
                        </Button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/orders/${order.woo_order_id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
          <div className="flex flex-wrap items-center justify-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={effectivePage <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageButtons.map((p) => (
              <Button
                key={p}
                type="button"
                variant={p === effectivePage ? "secondary" : "outline"}
                size="sm"
                className="h-8 min-w-8 px-2"
                disabled={isFetching}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={effectivePage >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {actionError && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4 pb-4 text-xs text-red-600 dark:text-red-400">
            {actionError}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrder
                ? `Manage order #${selectedOrder.woo_order_id}`
                : "Manage order"}
            </DialogTitle>
            <DialogDescription>
              Pause or resume the active order. Stop marks remaining items as
              failed.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Current status:{" "}
                <span className="font-medium text-foreground">
                  {selectedOrder.status}
                </span>
                {controlStateLabel(selectedOrder.control_state) && (
                  <span>
                    {" "}
                    · {controlStateLabel(selectedOrder.control_state)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const isActiveSelected = selectedOrder.id === activeOrderId
                  const runtimePaused =
                    isActiveSelected &&
                    overview?.poller.processing.active &&
                    overview.poller.processing.orderId === selectedOrder.id &&
                    overview.poller.processing.controlState === "paused"
                  const orderPaused = selectedOrder.control_state === "paused"
                  const isPaused = Boolean(runtimePaused || orderPaused)
                  return (
                    <>
                      {!isPaused && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!isActiveSelected || actionPending !== null}
                          onClick={() =>
                            handleOrderAction("pause", selectedOrder)
                          }
                        >
                          {actionPending === "pause" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Pause className="h-3 w-3" />
                          )}
                          Pause
                        </Button>
                      )}
                      {isPaused && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!isActiveSelected || actionPending !== null}
                          onClick={() =>
                            handleOrderAction("resume", selectedOrder)
                          }
                        >
                          {actionPending === "resume" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Resume
                        </Button>
                      )}
                    </>
                  )
                })()}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-red-300 text-red-600 dark:text-red-400"
                  disabled={
                    actionPending !== null ||
                    selectedOrder.status === "placed" ||
                    selectedOrder.status === "failed"
                  }
                  onClick={() =>
                    openStopConfirm(
                      selectedOrder,
                      selectedOrder.id === activeOrderId
                    )
                  }
                >
                  {actionPending === "stop" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Square className="h-3 w-3 fill-current" />
                  )}
                  {selectedOrder.id === activeOrderId
                    ? "Stop"
                    : "Permanent stop"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedOrder && (
              <Link href={`/dashboard/orders/${selectedOrder.woo_order_id}`}>
                <Button variant="outline" size="sm">
                  Open order details
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!stopConfirm}
        onOpenChange={(open) => {
          if (!open) setStopConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {stopConfirm?.isActive
                ? "Stop active order?"
                : "Permanently stop order?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {stopConfirm?.isActive
                ? "This will stop the running order and mark it as failed. This cannot be undone."
                : "This will permanently stop this order and mark remaining items as failed. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
              disabled={actionPending !== null || !stopConfirm}
              onClick={(e) => {
                e.preventDefault()
                if (!stopConfirm) return
                void handleOrderAction("stop", stopConfirm.order)
              }}
            >
              {actionPending === "stop" ? "Stopping..." : "Confirm stop"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
