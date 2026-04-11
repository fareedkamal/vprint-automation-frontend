"use client"

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDashboardQuery } from "@/hooks/use-dashboard-api"
import { cn } from "@/lib/utils"
import type { Order, OrdersResponse } from "@/types/dashboard"

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
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] ??
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      )}
    >
      {status}
    </span>
  )
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

const PAGE_SIZE = 10
/** Max numbered page buttons shown at once (10, 10). */
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

export default function OrdersPage() {
  const [firesprintOnly, setFiresprintOnly] = useState(true)
  const [page, setPage] = useState(1)

  const offset = (page - 1) * PAGE_SIZE

  const { data, isLoading, error, refetch, isFetching } =
    useDashboardQuery<OrdersResponse>("internal/dashboard/orders", {
      searchParams: {
        limit: PAGE_SIZE,
        offset,
        firesprint_only: firesprintOnly ? 1 : 0,
      },
      refetchInterval: 30_000,
    })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)
  const effectivePage = Math.min(page, totalPages)
  const [btnStart, btnEnd] = pageButtonWindow(effectivePage, totalPages)
  const pageButtons = Array.from(
    { length: btnEnd - btnStart + 1 },
    (_, i) => btnStart + i
  )

  useEffect(() => {
    if (!data) return
    const tp = Math.max(1, Math.ceil(data.total / PAGE_SIZE) || 1)
    if (page > tp) setPage(tp)
  }, [data, page])

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Orders</h2>
          <p className="text-sm text-muted-foreground">
            {data
              ? `Page ${effectivePage} of ${totalPages} · ${total} order${total === 1 ? "" : "s"}`
              : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={firesprintOnly ? "default" : "outline"}
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
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WC Status</TableHead>
                  <TableHead>FS Lines</TableHead>
                  <TableHead className="w-36">Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-14 text-sm"
                    >
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
                {data.orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-mono font-semibold text-sm">
                      #{order.woo_order_id}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.customer_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.customer_email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Pill status={order.status} />
                    </TableCell>
                    <TableCell>
                      {order.woo_status ? (
                        <Pill status={order.woo_status} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <FsLineSummary items={order.order_items ?? []} />
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination: 10 per page, up to 10 page buttons */}
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
                variant={p === effectivePage ? "default" : "outline"}
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
    </div>
  )
}
