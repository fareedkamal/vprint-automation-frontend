"use client"

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  TrendingUp,
  Webhook,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardQuery } from "@/hooks/use-dashboard-api"
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

// ── Poller status card ────────────────────────────────────────────────────────

function PollerCard({ data }: { data: OverviewData }) {
  const { poller } = data
  const busy = poller.isBusy
  const proc = poller.processing

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4" />
          Poller Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              busy ? "bg-yellow-400 animate-pulse" : "bg-green-400"
            )}
          />
          <span className="text-xl font-bold">{busy ? "Busy" : "Idle"}</span>
        </div>
        {proc.active && (
          <div className="space-y-1.5 text-sm">
            <div className="text-muted-foreground">
              Woo{" "}
              <span className="font-mono font-semibold text-foreground">
                #{proc.wooOrderId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="font-mono text-xs">{proc.step}</span>
            </div>
          </div>
        )}
        {!proc.active && !busy && (
          <p className="text-xs text-muted-foreground">
            Waiting for pending FireSprint orders.
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Updated {new Date(data.generated_at).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardQuery<OverviewData>(
    "internal/dashboard/overview",
    { refetchInterval: 8_000 }
  )

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
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
      <div className="p-6">
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
      color: "text-yellow-500",
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
      color: "text-red-500",
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
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live automation status — auto-refreshes every 8 s
        </p>
      </div>

      {/* Top: Poller · Queue · Completion · Webhooks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PollerCard data={data} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Queue (FireSprint)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {q.pending_plus_processing}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {q.pending} pending · {q.processing} processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completionPct != null ? `${completionPct}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {comp.placed} placed · {comp.failed} failed · {comp.terminal}{" "}
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Webhook className="h-4 w-4" />
              Webhooks (24 h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{webhooks}</div>
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
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <Icon
                  className={cn("h-5 w-5 mb-2", color, spin && "animate-spin")}
                />
                <div className="text-2xl font-bold">{value}</div>
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
            <Card key={status}>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold">{count}</div>
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
