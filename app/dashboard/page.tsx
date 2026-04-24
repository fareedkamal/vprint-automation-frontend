"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Square,
  TrendingUp,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDashboardQuery,
  useFireSprintSync,
  useOrderControl,
} from "@/hooks/use-dashboard-api"
import { cn } from "@/lib/utils"
import type { OverviewData } from "@/types/dashboard"

const OVERVIEW_CARD_SKELETON_KEYS = ["oc1", "oc2", "oc3", "oc4"] as const
const OVERVIEW_STAT_SKELETON_KEYS = [
  "os1",
  "os2",
  "os3",
  "os4",
  "os5",
  "os6",
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
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  total: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status] ?? STATUS_COLORS.other
      )}
    >
      {status}
    </span>
  )
}

// ── Step bar ──────────────────────────────────────────────────────────────────

const STEPS = [
  { key: "session", label: "Session", icon: Zap },
  { key: "artwork", label: "Artwork", icon: Activity },
  { key: "cart", label: "Cart", icon: CheckCircle2 },
  { key: "checkout", label: "Checkout", icon: CheckCircle2 },
]

function stepIndex(step?: string): number {
  if (!step) return -1
  if (step === "starting" || step === "session") return 0
  if (step === "session_failed") return -2
  if (step.startsWith("artwork:")) return 1
  if (step.startsWith("cart:")) return 2
  if (step === "checkout") return 3
  return -1
}

function StepBar({ step }: { step?: string }) {
  const idx = stepIndex(step)
  const isErr = idx === -2
  const skuMatch = step?.match(/^(?:artwork|cart):(.+)$/)
  const sku = skuMatch?.[1]

  return (
    <div>
      <div className="flex items-center gap-0 min-w-0 overflow-hidden">
        {STEPS.map((s, i) => {
          let state: "done" | "active" | "error" | "pending" = "pending"
          if (isErr && i === 0) state = "error"
          else if (i < idx) state = "done"
          else if (i === idx) state = "active"

          return (
            <div key={s.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                    state === "done" &&
                      "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-600",
                    state === "active" &&
                      "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.4)]",
                    state === "error" &&
                      "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600",
                    state === "pending" &&
                      "border-border bg-background text-muted-foreground"
                  )}
                >
                  {state === "done" ? "✓" : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] whitespace-nowrap",
                    state === "done" && "text-green-600 dark:text-green-400",
                    state === "active" &&
                      "text-blue-600 dark:text-blue-400 font-semibold",
                    state === "error" && "text-red-600 dark:text-red-400",
                    state === "pending" && "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 min-w-3 mb-3.5 mx-1",
                    i < idx
                      ? "bg-green-500"
                      : i === idx - 1
                        ? "bg-blue-500"
                        : "bg-border"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
      {sku && (
        <p className="text-[11px] text-muted-foreground mt-1">
          SKU:{" "}
          <span className="font-mono font-semibold text-foreground">{sku}</span>
        </p>
      )}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  pct,
  label,
  color = "blue",
}: {
  pct: number
  label?: string
  color?: "blue" | "green" | "red" | "yellow"
}) {
  const trackColor = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-[#dfe568]",
  }[color]

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label ?? "Progress"}</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            trackColor
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Poller status card ────────────────────────────────────────────────────────

function PollerCard({
  data,
  onAction,
}: {
  data: OverviewData
  onAction: () => void
}) {
  const { poller } = data
  const busy = poller.isBusy
  const proc = poller.processing
  const { act, pending: actionPending, error: actionError } = useOrderControl()
  const {
    run: runFireSprintSync,
    pending: syncPending,
    error: syncError,
    result: syncResult,
  } = useFireSprintSync()

  async function handleAction(action: "pause" | "resume" | "stop") {
    if (!proc.active || !proc.orderId) return
    if (action === "stop") {
      if (
        !window.confirm(
          "Stop this order and mark it as FAILED? This cannot be undone."
        )
      )
        return
    }
    const ok = await act(proc.orderId, action)
    if (ok) onAction()
  }

  async function handleSyncNow() {
    const ok = await runFireSprintSync()
    if (ok) onAction()
  }

  const pct = proc.active ? (proc.progressPct ?? 0) : 0
  const isPaused = proc.active && proc.controlState === "paused"
  const itemCount =
    proc.active && (proc.totalItems ?? 0) > 1
      ? `Item ${(proc.currentItemIndex ?? 0) + 1} / ${proc.totalItems}`
      : null

  return (
    <Card
      className={cn(
        "h-full shadow-sm transition-shadow hover:shadow-md",
        busy && "border-blue-200 dark:border-blue-800"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4" />
          Poller Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0",
              busy ? "bg-blue-400 animate-pulse" : "bg-green-400"
            )}
          />
          <span className="text-2xl font-bold tracking-tight">
            {busy ? "Processing" : "Idle"}
          </span>
          {proc.active && proc.wooOrderId && (
            <span className="text-sm font-mono font-semibold text-muted-foreground">
              Woo #{proc.wooOrderId}
            </span>
          )}
          {itemCount && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5 font-medium">
              {itemCount}
            </span>
          )}
          {proc.active && proc.controlState === "paused" && (
            <span className="text-xs bg-[#dfe568]/35 text-[hsl(262_42%_18%)] dark:bg-[#dfe568]/25 dark:text-[#dfe568] rounded-full px-2 py-0.5 font-medium">
              Paused
            </span>
          )}
          {proc.active && proc.controlState === "stop_requested" && (
            <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full px-2 py-0.5 font-medium">
              Stop requested
            </span>
          )}
        </div>

        {/* Step bar */}
        {proc.active && <StepBar step={proc.step} />}

        {/* Progress bar */}
        {proc.active && (
          <ProgressBar pct={pct} color={pct >= 80 ? "green" : "blue"} />
        )}

        {/* Session URLs */}
        {proc.active && (proc.streamingUrl || proc.debugUrl) && (
          <div className="flex flex-wrap gap-2">
            {proc.streamingUrl && (
              <a
                href={proc.streamingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Live session
              </a>
            )}
            {proc.debugUrl && (
              <a
                href={proc.debugUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 text-xs font-medium hover:bg-purple-100 dark:hover:bg-purple-950/60 transition-colors"
              >
                <Bug className="h-3 w-3" />
                Debug inspector
              </a>
            )}
          </div>
        )}

        {/* Control buttons */}
        {proc.active && proc.orderId && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
            {!isPaused && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-[#dfe568] text-[hsl(262_35%_28%)] dark:text-[#dfe568] hover:bg-[#dfe568]/15 dark:hover:bg-[#dfe568]/10"
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
            )}
            {isPaused && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
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
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
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
        )}

        {/* Action error */}
        {actionError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {actionError}
          </p>
        )}

        {/* Session failed */}
        {proc.active && proc.step === "session_failed" && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Session creation failed — check Browserbase credentials &amp;
            connectivity.
          </p>
        )}

        {!proc.active && !busy && (
          <p className="text-xs text-muted-foreground">
            Waiting for pending FireSprint orders.
          </p>
        )}

        <div className="pt-2 border-t border-border space-y-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs gap-1.5 font-medium"
            disabled={syncPending}
            onClick={handleSyncNow}
          >
            {syncPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            Sync FireSprint Orders
          </Button>
          {syncError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {syncError}
            </p>
          )}
          {syncResult && (
            <p className="text-xs text-muted-foreground">
              Sync result: scanned {syncResult.scanned}, updated{" "}
              {syncResult.updated}, tracking {syncResult.trackingFound}, notes{" "}
              {syncResult.notesPosted}, errors {syncResult.errors}.
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          Updated {new Date(data.generated_at).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useDashboardQuery<OverviewData>(
    "internal/dashboard/overview",
    { refetchInterval: 8_000 }
  )

  function invalidateOverview() {
    queryClient.invalidateQueries({ queryKey: ["internal/dashboard/overview"] })
  }

  if (isLoading) {
    return (
      <div className="w-full min-w-0 p-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {OVERVIEW_CARD_SKELETON_KEYS.map((rowKey) => (
            <Skeleton key={rowKey} className="h-36 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {OVERVIEW_STAT_SKELETON_KEYS.map((rowKey) => (
            <Skeleton key={rowKey} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-full min-w-0 p-6 lg:px-8">
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-red-600 dark:text-red-400">
            {error?.message ?? "Failed to load overview. Check your JWT token."}
          </CardContent>
        </Card>
      </div>
    )
  }

  const {
    firesprint_lines_by_status: ls,
    firesprint_queue: q,
    firesprint_line_completion: comp,
    order_status_counts: osc,
    webhooks_logged_last_24h: webhooks,
  } = data

  const completionPct =
    comp.completion_rate != null ? Math.round(comp.completion_rate * 100) : null

  const lineCards = [
    {
      label: "Pending",
      value: ls.pending ?? 0,
      icon: Clock,
      color: "text-[#dfe568]",
    },
    {
      label: "Processing",
      value: ls.processing ?? 0,
      icon: Loader2,
      color: "text-blue-500",
      spin: true,
    },
    {
      label: "Placed",
      value: ls.placed ?? 0,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      label: "Failed",
      value: ls.failed ?? 0,
      icon: XCircle,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Awaiting Approval",
      value: ls.awaiting_approval ?? 0,
      icon: AlertCircle,
      color: "text-orange-500",
    },
    {
      label: "On Hold",
      value: ls.on_hold ?? 0,
      icon: Pause,
      color: "text-gray-400",
    },
  ]

  return (
    <div className="w-full min-w-0 p-6 lg:px-8 space-y-7">
      <p className="text-sm text-muted-foreground">
        Live automation status — auto-refreshes every 8 s
      </p>

      {/* Top: Poller · Queue · Completion · Webhooks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <PollerCard data={data} onAction={invalidateOverview} />
        </div>

        <Card className="h-full shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Queue (FireSprint)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">
              {q.pending_plus_processing}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {q.pending} pending · {q.processing} processing
            </p>
          </CardContent>
        </Card>

        <Card className="h-full shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">
              {completionPct != null ? `${completionPct}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {comp.placed} placed · {comp.failed} failed · {comp.terminal}{" "}
              total
            </p>
          </CardContent>
        </Card>

        <Card className="h-full shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Webhook className="h-4 w-4" />
              Webhooks (24 h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">{webhooks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              WooCommerce webhook calls
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FireSprint lines by status */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          FireSprint Lines by Status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {lineCards.map(({ label, value, icon: Icon, color, spin }) => (
            <Card
              key={label}
              className="shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="pt-4 pb-3">
                <Icon
                  className={cn("h-5 w-5 mb-2", color, spin && "animate-spin")}
                />
                <div className="text-3xl font-bold tracking-tight">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  {label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Orders by status */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          All Orders by Status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(osc).map(([status, count]) => (
            <Card
              key={status}
              className="shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="pt-4 pb-3">
                <div className="text-3xl font-bold tracking-tight">{count}</div>
                <div className="mt-1.5">
                  <StatusPill status={status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
