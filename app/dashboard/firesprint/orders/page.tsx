"use client"

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { env } from "@/env"
import { useDashboardQuery } from "@/hooks/use-dashboard-api"
import { buildRequestUrl, cn } from "@/lib/utils"
import type { FireSprintOrdersResponse } from "@/types/dashboard"

const PAGE_SIZE = 50

function shotHref(path: string | null | undefined): string | null {
  if (!path) return null
  const p = path.replace(/^\/+/, "")
  return buildRequestUrl(env.NEXT_PUBLIC_APP_URL, p)
}

export default function FireSprintOrdersPage() {
  const [page, setPage] = useState(1)
  const offset = (page - 1) * PAGE_SIZE

  const { data, isLoading, error, refetch, isFetching } =
    useDashboardQuery<FireSprintOrdersResponse>(
      "internal/dashboard/firesprint/orders",
      {
        searchParams: { limit: PAGE_SIZE, offset },
        refetchInterval: 30_000,
      }
    )

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)
  const rows = data?.rows ?? []

  return (
    <div className="w-full min-w-0 p-6 lg:px-8 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">FireSprint orders</h1>
          <p className="text-sm text-muted-foreground">
            Line items with FireSprint shipment fields — tracking, last sync,
            and links.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Shipments
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {total} total
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load"}
            </p>
          )}
          {isLoading && !data ? (
            <div className="space-y-2">
              {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Woo</TableHead>
                    <TableHead>FS order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Last sync</TableHead>
                    <TableHead className="text-right">Links</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground text-center py-8"
                      >
                        No FireSprint line items in range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const shot = shotHref(r.firesprint_last_screenshot_url)
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm">
                            {r.woo_order_id != null ? (
                              <Link
                                href={`/dashboard/orders/${r.woo_order_id}`}
                                className="text-blue-600 dark:text-blue-400 underline"
                              >
                                #{r.woo_order_id}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {r.firesprint_order_url ? (
                              <a
                                href={r.firesprint_order_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 underline"
                              >
                                {r.firesprint_order_id ?? "Open"}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              (r.firesprint_order_id ?? "—")
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[140px] truncate">
                            {r.firesprint_last_status ?? r.vendor_status ?? "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px]">
                            {r.firesprint_tracking_number ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {r.last_firesprint_sync_at
                              ? new Date(
                                  r.last_firesprint_sync_at
                                ).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right space-y-1">
                            {shot && (
                              <a
                                href={shot}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-blue-600 dark:text-blue-400 underline"
                              >
                                Screenshot
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
