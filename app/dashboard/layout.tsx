"use client"

import {
  Eye,
  EyeOff,
  LayoutDashboard,
  List,
  Lock,
  LogOut,
  Radio,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DashboardAuthProvider,
  useDashboardAuth,
} from "@/hooks/use-dashboard-api"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders", label: "Orders", icon: List, exact: false },
  { href: "/dashboard/events", label: "Events", icon: Radio, exact: false },
] as const

// ── JWT gate: shown when no token is stored ───────────────────────────────────

function normalizePastedJwt(raw: string): string {
  let t = raw.trim()
  if (t.toLowerCase().startsWith("bearer ")) t = t.slice(7).trim()
  return t
}

function JwtGate({ children }: { children: React.ReactNode }) {
  const { jwt, setJwt } = useDashboardAuth()
  const [input, setInput] = useState("")
  const [show, setShow] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function readTokenFromField(): string {
    return normalizePastedJwt(inputRef.current?.value ?? input)
  }

  function trySubmit() {
    const token = readTokenFromField()
    if (!token) {
      setHint(
        "Paste your JWT above, then try again (password managers sometimes fill the field without enabling the button — click again after typing)."
      )
      return
    }
    setHint(null)
    setJwt(token)
  }

  if (!jwt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>VPrint Automation Dashboard</CardTitle>
            </div>
            <CardDescription>
              Paste an <strong>access JWT</strong> (HS256) signed with the same
              value as the automation service env{" "}
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                INTERNAL_API_JWT_SECRET
              </code>
              . That variable is the signing <em>secret</em> on the server; do
              not confuse it with the token string you paste here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input
                ref={inputRef}
                type={show ? "text" : "password"}
                placeholder="Paste JWT token…"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setHint(null)
                }}
                onInput={(e) => {
                  setInput(e.currentTarget.value)
                  setHint(null)
                }}
                onBlur={(e) => {
                  setInput(e.currentTarget.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") trySubmit()
                }}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {hint && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {hint}
              </p>
            )}
            <Button className="w-full" onClick={trySubmit}>
              Access Dashboard
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Token is stored in <code>localStorage</code> for this browser
              session.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function DashboardSidebar() {
  const pathname = usePathname()
  const { clearJwt } = useDashboardAuth()

  return (
    <aside className="w-56 min-h-screen border-r bg-white dark:bg-gray-950 flex flex-col shrink-0">
      <div className="px-4 py-5 border-b">
        <p className="font-semibold text-sm leading-tight">VPrint Automation</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Internal Dashboard
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t">
        <button
          type="button"
          onClick={clearJwt}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors px-3 py-2 w-full rounded-md hover:bg-red-50 dark:hover:bg-red-950"
        >
          <LogOut className="h-4 w-4" />
          Clear Token
        </button>
      </div>
    </aside>
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
      <JwtGate>
        <div className="flex min-h-screen">
          <DashboardSidebar />
          <main className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-auto">
            {children}
          </main>
        </div>
      </JwtGate>
    </DashboardAuthProvider>
  )
}
