"use client"

import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { useDashboardQuery } from "@/hooks/use-dashboard-api"
import {
  AUTOMATION_EVENT_PILL,
  AUTOMATION_EVENT_PILL_FALLBACK,
} from "@/lib/automationEventStyles"
import { cn } from "@/lib/utils"
import type { EventsResponse, EventTypesResponse } from "@/types/dashboard"

const EVENT_TABLE_SKELETON_KEYS = [
  "et1",
  "et2",
  "et3",
  "et4",
  "et5",
  "et6",
  "et7",
  "et8",
  "et9",
  "et10",
  "et11",
  "et12",
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function EventTypePill({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono font-medium",
        AUTOMATION_EVENT_PILL[type] ?? AUTOMATION_EVENT_PILL_FALLBACK
      )}
    >
      {type}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [wooIdInput, setWooIdInput] = useState("")
  const [applied, setApplied] = useState<{ wooId?: string; type?: string }>({})
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50
  const offset = (page - 1) * PAGE_SIZE

  const { data: typesData } = useDashboardQuery<EventTypesResponse>(
    "internal/dashboard/events/event-types",
    { staleTime: 60_000 }
  )

  const sp: Record<string, string | number | boolean> = {
    limit: PAGE_SIZE,
    offset,
  }
  if (applied.wooId) sp.woo_order_id = applied.wooId
  if (applied.type) sp.event_type = applied.type

  const { data, isLoading, error, refetch, isFetching } =
    useDashboardQuery<EventsResponse>("internal/dashboard/events", {
      searchParams: sp,
      refetchInterval: 15_000,
    })

  function applyFilter() {
    setApplied((prev) => ({
      ...prev,
      wooId: wooIdInput.trim() || undefined,
    }))
    setPage(1)
  }

  function clearFilter() {
    setWooIdInput("")
    setApplied({})
    setPage(1)
  }

  const hasFilter = !!(applied.wooId || applied.type)

  return (
    <div className="w-full min-w-0 p-6 lg:px-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {data
              ? `Page ${page} · showing ${data.events.length} event${data.events.length === 1 ? "" : "s"}`
              : "Loading..."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-36">
              <label
                className="text-xs text-muted-foreground mb-1 block"
                htmlFor="dashboard-events-woo-id"
              >
                Woo Order ID
              </label>
              <Input
                id="dashboard-events-woo-id"
                placeholder="e.g. 22305"
                value={wooIdInput}
                onChange={(e) => setWooIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilter()}
              />
            </div>
            <div className="flex-1 min-w-52">
              <label
                className="text-xs text-muted-foreground mb-1 block"
                htmlFor="event-type-select"
              >
                Event Type
              </label>
              <Select
                value={applied.type ?? "__all__"}
                onValueChange={(v) => {
                  setApplied((prev) => ({
                    ...prev,
                    type: v === "__all__" ? undefined : v,
                  }))
                  setPage(1)
                }}
              >
                <SelectTrigger id="event-type-select" className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All types</SelectItem>
                  {(typesData?.event_types ?? []).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={applyFilter}
            >
              <Search className="h-4 w-4 mr-1.5" />
              Filter
            </Button>
            {hasFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilter}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          {hasFilter && (
            <p className="text-xs text-muted-foreground mt-2">
              Filtering by
              {applied.wooId && <> Woo #{applied.wooId}</>}
              {applied.wooId && applied.type && " ·"}
              {applied.type && (
                <>
                  {" "}
                  type = <code>{applied.type}</code>
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
          {EVENT_TABLE_SKELETON_KEYS.map((rowKey) => (
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
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead className="w-52">Event Type</TableHead>
                  <TableHead className="w-28">Woo #</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-20">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-14 text-sm"
                    >
                      No events found.
                    </TableCell>
                  </TableRow>
                )}
                {data.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(event.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <EventTypePill type={event.event_type} />
                    </TableCell>
                    <TableCell>
                      {event.woo_order_id ? (
                        <Link
                          href={`/dashboard/orders/${event.woo_order_id}`}
                          className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          #{event.woo_order_id}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-md">
                      <span className="line-clamp-2">
                        {event.message ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {event.payload &&
                      Object.keys(event.payload).length > 0 ? (
                        <details>
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                            View ›
                          </summary>
                          <pre className="text-xs mt-1.5 bg-gray-50 dark:bg-gray-900 rounded p-2 max-h-48 overflow-auto min-w-48">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </details>
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

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-14 text-center">
            {page}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={data.events.length < PAGE_SIZE || isFetching}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
