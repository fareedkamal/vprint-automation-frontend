"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  AlertCircle,
  BarChart2,
  Bug,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Power,
  Shield,
  Square,
  TrendingUp,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  useDashboardQuery,
  useFireSprintSync,
  useOrderControl,
  usePipelineControl,
} from "@/hooks/use-dashboard-api"
import { cn } from "@/lib/utils"
import type {
  AiUsageDashboardPayload,
  OverviewData,
  PipelineControlOverview,
} from "@/types/dashboard"

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

// ── Global pipeline gate (business hours + manual stop) ───────────────────────

function PipelineControlCard({
  pipeline,
  onUpdated,
}: {
  pipeline: PipelineControlOverview
  onUpdated: () => void
}) {
  const { patch, pending, error } = usePipelineControl()
  const pc = pipeline

  async function setManualStop(next: boolean) {
    if (next) {
      const ok = window.confirm(
        "Turn ON global pipeline stop? No new FireSprint automation runs will start until you turn this off."
      )
      if (!ok) return
    }
    const r = await patch({ manual_stop: next })
    if (r?.ok) onUpdated()
  }

  async function setBusinessHours(next: boolean) {
    const r = await patch({ business_hours_enforced: next })
    if (r?.ok) onUpdated()
  }

  return (
    <Card className="shadow-sm border-amber-200/60 dark:border-amber-900/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          Pipeline schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0",
              pc.poll_allowed ? "bg-green-500" : "bg-amber-500"
            )}
          />
          <span className="text-sm font-semibold">
            {pc.poll_allowed ? "New runs allowed" : "New runs blocked"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          {pc.central_time_display}
          {!pc.within_business_hours_central && pc.business_hours_enforced && (
            <span className="text-amber-700 dark:text-amber-300">
              · Outside Mon–Fri window
            </span>
          )}
        </p>
        {!pc.poll_allowed && pc.next_open_hint && (
          <p className="text-xs rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2 py-1.5 leading-snug">
            {pc.next_open_hint}
          </p>
        )}

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Power className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Automation pipeline
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide",
                  pc.manual_stop
                    ? "bg-muted text-muted-foreground"
                    : "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                )}
              >
                {pc.manual_stop ? "OFF" : "ON"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              {pc.manual_stop
                ? "Paused — the server will not start new FireSprint poll cycles. Use the poller card below for the current order."
                : "Running — the server may start new work when the schedule above allows it."}
            </p>
          </div>
          <Switch
            className="shrink-0"
            checked={!pc.manual_stop}
            disabled={pending}
            onCheckedChange={(on) => {
              void setManualStop(!on)
            }}
            aria-label={
              pc.manual_stop
                ? "Turn automation pipeline on"
                : "Turn automation pipeline off"
            }
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="pipeline-business-hours"
            checked={pc.business_hours_enforced}
            disabled={pending}
            onCheckedChange={(v) => {
              void setBusinessHours(v === true)
            }}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="pipeline-business-hours"
              className="text-sm font-medium cursor-pointer"
            >
              Business hours only (Central)
            </Label>
            <p className="text-xs text-muted-foreground font-normal">
              Mon–Fri, 9:00 AM–5:59 PM America/Chicago. Orders outside that
              window stay pending until the next open (e.g. weekend → Monday 9
              AM CT).
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </CardContent>
    </Card>
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

// ── AI usage (Anthropic vision tokens) ───────────────────────────────────────

function AiUsageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload: AiUsageDashboardPayload["series"][0] }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-xs shadow-md">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      <div className="text-muted-foreground">
        Input:{" "}
        <span className="font-mono text-foreground">
          {p.input_tokens.toLocaleString()}
        </span>
      </div>
      <div className="text-muted-foreground">
        Output:{" "}
        <span className="font-mono text-foreground">
          {p.output_tokens.toLocaleString()}
        </span>
      </div>
      <div className="text-muted-foreground mt-0.5">
        Est. ~${p.estimated_usd.toFixed(4)} · {p.orders_count} order(s)
      </div>
    </div>
  )
}

function AiUsageSection() {
  const { data, isLoading, error } = useDashboardQuery<AiUsageDashboardPayload>(
    "internal/dashboard/ai-usage",
    { searchParams: { days: 30 }, refetchInterval: 60_000 }
  )

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        <BarChart2 className="h-3.5 w-3.5" />
        AI usage (Anthropic vision)
      </h3>
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tokens per day</CardTitle>
          <p className="text-xs text-muted-foreground leading-relaxed">
            FireSprint line items + checkout vision calls. Dollar estimate uses
            server pricing (default Opus-style{" "}
            <span className="font-mono">$5/$25</span> per million in/out unless
            overridden).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error.message}
            </p>
          )}
          {isLoading && !data && (
            <Skeleton className="h-[260px] w-full rounded-lg" />
          )}
          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">
                    Window total
                  </div>
                  <div className="text-lg font-semibold font-mono">
                    {data.summary.total_tokens.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    tokens
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">
                    Est. cost (~)
                  </div>
                  <div className="text-lg font-semibold">
                    ${data.summary.estimated_usd.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {data.days} days · avg $
                    {data.summary.avg_daily_estimated_usd.toFixed(2)}/day
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3 col-span-2 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">
                    Budget hint (optional)
                  </div>
                  {data.budget.credit_balance_usd != null ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="font-mono text-sm">
                        Balance ${data.budget.credit_balance_usd.toFixed(2)} →
                        est. remaining{" "}
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          $
                          {data.budget.estimated_remaining_usd?.toFixed(2) ??
                            "—"}
                        </span>
                        {data.budget.estimated_equiv_total_tokens_remaining !=
                          null && (
                          <span className="text-muted-foreground">
                            {" "}
                            (~
                            {data.budget.estimated_equiv_total_tokens_remaining.toLocaleString()}{" "}
                            tok @ window avg)
                          </span>
                        )}
                      </div>
                      {data.budget.note && (
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {data.budget.note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {data.budget.note}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.series}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(d: string) => d.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${Number(v) / 1000}k`}
                    />
                    <Tooltip content={<AiUsageTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="input_tokens"
                      name="Input tokens"
                      stackId="a"
                      fill="hsl(217 91% 60%)"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="output_tokens"
                      name="Output tokens"
                      stackId="a"
                      fill="hsl(142 76% 36%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Model:{" "}
                <span className="font-mono">{data.pricing.model_hint}</span> ·{" "}
                {data.attribution}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </section>
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
        <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
          {data.pipeline_control ? (
            <PipelineControlCard
              pipeline={data.pipeline_control}
              onUpdated={invalidateOverview}
            />
          ) : (
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pipeline control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <p>
                  The overview response did not include{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    pipeline_control
                  </code>
                  . That usually means the automation API you are calling is an
                  older build.
                </p>
                <p>
                  Deploy current{" "}
                  <span className="font-mono text-foreground">
                    vprint-automation
                  </span>{" "}
                  (it adds this field to{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    GET /internal/dashboard/overview
                  </code>
                  ) so this page can show the pipeline ON/OFF switch and
                  schedule toggles.
                </p>
              </CardContent>
            </Card>
          )}
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

      <AiUsageSection />

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
