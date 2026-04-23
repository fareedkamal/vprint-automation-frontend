"use client"

import {
  Bell,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  List,
  LogOut,
  Package,
  Radio,
  UserCircle2,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { DashboardAuthForm } from "@/components/dashboard/auth-form"
import { UnleashLogo } from "@/components/dashboard/unleash-logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DashboardAuthProvider,
  useDashboardAuth,
  useDashboardQuery,
} from "@/hooks/use-dashboard-api"
import { cn } from "@/lib/utils"
import type { OrdersResponse } from "@/types/dashboard"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: List, exact: false },
  { href: "/dashboard/events", label: "Events", icon: Radio, exact: false },
  {
    href: "/dashboard/vendor-catalog",
    label: "Vendor catalog",
    icon: FileSpreadsheet,
    exact: false,
  },
] as const

const FS_NAV = [
  {
    href: "/dashboard/firesprint/orders",
    label: "FireSprint orders",
    icon: Package,
  },
  {
    href: "/dashboard/firesprint/events",
    label: "FireSprint log",
    icon: ClipboardList,
  },
] as const

// ── Login gate: shown when no dashboard session ───────────────────────────────

function JwtGate({ children }: { children: React.ReactNode }) {
  const { jwt } = useDashboardAuth()

  if (!jwt) {
    return <DashboardAuthForm mode="login" />
  }

  return <>{children}</>
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute =
    pathname === "/dashboard/login" || pathname === "/dashboard/signup"

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <JwtGate>
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <main className="flex-1 min-w-0 overflow-auto bg-gradient-to-br from-muted/50 via-background to-primary/5 dark:from-background dark:via-background dark:to-primary/10">
          <DashboardTopbar />
          {children}
        </main>
      </div>
    </JwtGate>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function DashboardSidebar() {
  const pathname = usePathname()
  const { clearJwt } = useDashboardAuth()

  return (
    <aside
      className="w-56 min-h-screen border-r border-zinc-800/90 bg-zinc-950 text-zinc-200 flex flex-col shrink-0
      bg-[radial-gradient(120%_80%_at_0%_0%,hsl(328_40%_14%/0.4),transparent_50%)]
    "
    >
      <div className="px-3 pt-4 pb-4 border-b border-zinc-800/90">
        <div className="mb-1">
          <UnleashLogo
            className="w-full h-auto object-contain object-left max-h-[4.25rem] opacity-[0.98]"
            width={200}
            height={62}
            priority
          />
        </div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mt-1.5 pl-0.5">
          VPrint · internal
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href as Route}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-secondary font-semibold text-secondary-foreground shadow-sm ring-1 ring-secondary/50 border-l-2 border-l-primary"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
        <div className="pt-3 mt-2 border-t border-zinc-800/90">
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
            <span
              className="inline-block size-1.5 rounded-full bg-[#dfe568] shadow-[0_0_10px_#dfe568/0.55]"
              aria-hidden
            />
            FireSprint
          </p>
          {FS_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href as Route}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-secondary font-semibold text-secondary-foreground shadow-sm ring-1 ring-secondary/50 border-l-2 border-l-primary"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-zinc-800/90">
        <button
          type="button"
          onClick={clearJwt}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-400 transition-colors px-3 py-2 w-full rounded-md hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}

function DashboardTopbar() {
  const pathname = usePathname()
  const { jwt, userEmail, clearJwt } = useDashboardAuth()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<
    {
      id: string
      title: string
      subtitle: string
      createdAt: string
      wooOrderId: number | null
      read: boolean
    }[]
  >([])
  const seenOrderIdsRef = useRef<Set<string>>(new Set())
  const orderStatusRef = useRef<Map<string, string>>(new Map())
  const hydratedOrdersRef = useRef(false)

  const { data: ordersData } = useDashboardQuery<OrdersResponse>(
    "internal/dashboard/orders",
    {
      searchParams: { limit: 30, offset: 0, firesprint_only: 0 },
      refetchInterval: 10_000,
    }
  )
  const profileLabel = userEmail
    ? userEmail
    : jwt
      ? `JWT ${jwt.slice(0, 8)}...${jwt.slice(-6)}`
      : "No profile"

  const pageTitle =
    pathname === "/dashboard"
      ? "Overview"
      : pathname.startsWith("/dashboard/firesprint/events")
        ? "FireSprint log"
        : pathname.startsWith("/dashboard/firesprint/orders")
          ? "FireSprint orders"
          : pathname.startsWith("/dashboard/all-orders")
            ? "All Orders"
            : pathname.startsWith("/dashboard/orders")
              ? "Orders"
              : pathname.startsWith("/dashboard/events")
                ? "Events"
                : "Dashboard"

  useEffect(() => {
    if (!ordersData) return
    const orders = ordersData.orders ?? []

    const nextStatusMap = new Map<string, string>()
    const nextIds = new Set<string>()
    for (const order of orders) {
      nextStatusMap.set(order.id, order.status)
      nextIds.add(order.id)
    }

    if (!hydratedOrdersRef.current) {
      hydratedOrdersRef.current = true
      seenOrderIdsRef.current = nextIds
      orderStatusRef.current = nextStatusMap
      return
    }

    const mapped: {
      id: string
      title: string
      subtitle: string
      createdAt: string
      wooOrderId: number | null
      read: boolean
    }[] = []

    for (const order of orders) {
      const prevSeen = seenOrderIdsRef.current.has(order.id)
      const prevStatus = orderStatusRef.current.get(order.id)
      const currentStatus = order.status

      if (!prevSeen) {
        mapped.push({
          id: `new:${order.id}:${Date.now()}`,
          title: `New order received #${order.woo_order_id}`,
          subtitle: order.customer_name
            ? `${order.customer_name} • ${currentStatus}`
            : `Status: ${currentStatus}`,
          createdAt: new Date().toISOString(),
          wooOrderId: order.woo_order_id ?? null,
          read: false,
        })
        continue
      }

      if (prevStatus && prevStatus !== currentStatus) {
        const title =
          currentStatus === "placed"
            ? `Order #${order.woo_order_id} completed`
            : currentStatus === "failed"
              ? `Order #${order.woo_order_id} failed`
              : `Order #${order.woo_order_id} updated`
        mapped.push({
          id: `status:${order.id}:${currentStatus}:${Date.now()}`,
          title,
          subtitle: `${prevStatus} → ${currentStatus}`,
          createdAt: new Date().toISOString(),
          wooOrderId: order.woo_order_id ?? null,
          read: false,
        })
      }
    }

    if (mapped.length > 0) {
      setNotifications((prev) => [...mapped, ...prev].slice(0, 100))
    }

    seenOrderIdsRef.current = nextIds
    orderStatusRef.current = nextStatusMap
  }, [ordersData])

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [notifications]
  )

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold">{pageTitle}</p>
        <p className="text-[11px] text-muted-foreground">VPrint Automation</p>
      </div>

      <div className="flex items-center gap-2">
        <Popover
          open={notifOpen}
          onOpenChange={(open) => {
            setNotifOpen(open)
            if (open) markAllRead()
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-secondary text-secondary-foreground text-[10px] leading-4 text-center font-semibold shadow-sm ring-1 ring-secondary-foreground/15">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="border-b px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Live order updates
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={markAllRead}
                disabled={unreadCount === 0}
              >
                Mark read
              </Button>
            </div>
            <div className="max-h-96 overflow-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                  No notifications yet.
                </p>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={
                        n.wooOrderId
                          ? `/dashboard/orders/${n.wooOrderId}`
                          : "/dashboard/events"
                      }
                      className="block px-3 py-2.5 hover:bg-muted/40 transition-colors"
                      onClick={() => setNotifOpen(false)}
                    >
                      <p className={cn("text-sm", !n.read && "font-semibold")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.subtitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <UserCircle2 className="h-4 w-4" />
              Profile
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Profile</DropdownMenuLabel>
            <DropdownMenuItem className="text-xs text-muted-foreground">
              {profileLabel}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={clearJwt}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

// ── Root layout ───────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </DashboardAuthProvider>
  )
}
