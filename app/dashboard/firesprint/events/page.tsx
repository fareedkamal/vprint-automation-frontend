"use client"

import { ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { env } from "@/env"
import { useDashboardQuery, useFireSprintSync } from "@/hooks/use-dashboard-api"
import { buildRequestUrl, cn } from "@/lib/utils"
import type {
  FireSprintSyncFeedEntry,
  FireSprintSyncFeedResponse,
} from "@/types/dashboard"

function fullShotUrl(relative: string | null | undefined) {
  if (!relative) return null
  return buildRequestUrl(env.NEXT_PUBLIC_APP_URL, relative.replace(/^\/+/, ""))
}

/**
 * API stores a short `result` from the poller (e.g. `ok` = run finished without a thrown error, `failed` = run crashed).
 * We show clear English labels in the UI.
 */
function syncRunResultLabel(result: string | null | undefined): string {
  if (result == null || result === "") return "—"
  const r = result.toLowerCase().trim()
  if (r === "ok") return "Successful"
  if (r === "failed") return "Failed"
  return result
}

function isSyncRunSuccessful(result: string | null | undefined): boolean {
  return result?.toLowerCase().trim() === "ok"
}

function isSyncRunFailed(result: string | null | undefined): boolean {
  return result?.toLowerCase().trim() === "failed"
}

function SyncRunCard({
  entry,
  defaultOpen,
}: {
  entry: FireSprintSyncFeedEntry
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border bg-card text-card-foreground">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/40 rounded-t-lg"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                isSyncRunSuccessful(entry.result)
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : isSyncRunFailed(entry.result)
                    ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {syncRunResultLabel(entry.result)}
            </span>
            <span className="text-muted-foreground">
              {entry.trigger ?? "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(entry.created_at).toLocaleString()}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Scanned {entry.scanned} · Updated {entry.updated} · Tracking found{" "}
            {entry.trackingFound} · Customer notes {entry.notesPosted}
            {entry.errors > 0 && (
              <span className="text-amber-700 dark:text-amber-400">
                {" "}
                · Issues {entry.errors}
              </span>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t px-3 py-2 space-y-2 text-sm">
          {isSyncRunFailed(entry.result) && entry.error && (
            <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-2 py-1.5 text-xs text-red-900 dark:text-red-200 break-words">
              <span className="font-semibold">What went wrong: </span>
              {entry.error}
            </div>
          )}
          {entry.syncStartedAt && (
            <p className="text-xs text-muted-foreground">
              Started: {new Date(entry.syncStartedAt).toLocaleString()}
            </p>
          )}
          {entry.sessionId && (
            <p className="text-xs break-all">
              Session:{" "}
              <a
                className="text-blue-600 dark:text-blue-400 underline"
                href={`https://www.browserbase.com/sessions/${encodeURIComponent(entry.sessionId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                open in Browserbase
              </a>
            </p>
          )}
          {entry.liveUrl && (
            <p className="text-xs break-all">
              <a
                className="text-blue-600 dark:text-blue-400 underline"
                href={entry.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Live view
              </a>
            </p>
          )}
          {entry.debugUrl && (
            <p className="text-xs break-all">
              <a
                className="text-blue-600 dark:text-blue-400 underline"
                href={entry.debugUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Debug / inspector
              </a>
            </p>
          )}
          {entry.ordersSeen.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Orders on shipped list (this run)
              </p>
              <ul className="list-disc pl-4 text-xs space-y-0.5">
                {entry.ordersSeen.map((o) => (
                  <li key={`${o.orderNo}-${o.status}`}>
                    #{o.orderNo} — {o.status ?? "—"}
                    {o.screenshotUrl && (
                      <>
                        {" "}
                        <a
                          className="text-blue-600 dark:text-blue-400 underline"
                          href={fullShotUrl(o.screenshotUrl) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          screenshot
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FireSprintEventsPage() {
  const {
    run,
    pending,
    error: syncErr,
    result: syncResult,
  } = useFireSprintSync()
  const { data, isLoading, error, refetch, isFetching } =
    useDashboardQuery<FireSprintSyncFeedResponse>(
      "internal/dashboard/firesprint/sync-feed",
      {
        searchParams: { limit: 50 },
        refetchInterval: 20_000,
      }
    )

  const entries = data?.entries ?? []

  return (
    <div className="w-full min-w-0 p-6 lg:px-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">FireSprint log</h1>
          <p className="text-sm text-muted-foreground">
            Recent shipment sync runs — summary only, no raw step log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="font-semibold"
            onClick={() => run().then(() => refetch())}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Run sync now"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("h-4 w-4", isFetching && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {syncErr && (
        <p className="text-sm text-red-600 dark:text-red-400">{syncErr}</p>
      )}
      {syncResult && (
        <p className="text-sm text-muted-foreground rounded-md border p-3 bg-muted/30">
          Last run: scanned {syncResult.scanned}, updated {syncResult.updated},
          tracking {syncResult.trackingFound}, notes {syncResult.notesPosted}
          {syncResult.errors > 0 && `, issues ${syncResult.errors}`}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent syncs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && !data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : "Failed to load feed"}
            </p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sync runs recorded yet.
            </p>
          ) : (
            entries.map((e, i) => (
              <SyncRunCard key={e.id} entry={e} defaultOpen={i === 0} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
