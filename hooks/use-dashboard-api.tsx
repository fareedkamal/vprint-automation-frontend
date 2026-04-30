"use client"

import { type UseQueryOptions, useQuery } from "@tanstack/react-query"
import axios from "axios"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { env } from "@/env"
import { buildRequestUrl } from "@/lib/utils"
import type { PipelineControlOverview } from "@/types/dashboard"

const JWT_STORAGE_KEY = "vprint_dashboard_jwt"
const USER_EMAIL_STORAGE_KEY = "vprint_dashboard_user_email"

let dashboard401Redirecting = false

/**
 * Clears stored JWT, then navigates to login so the user can sign in again.
 * Use when a dashboard `internal/dashboard/*` request returns 401 (expired/invalid token).
 * Idempotent: concurrent 401s only trigger one redirect.
 */
export function redirectToLoginAfterUnauthorized(): void {
  if (typeof window === "undefined") return
  if (dashboard401Redirecting) return
  const pathname = window.location.pathname
  if (
    pathname.startsWith("/dashboard/login") ||
    pathname.startsWith("/dashboard/signup")
  ) {
    return
  }
  dashboard401Redirecting = true
  try {
    localStorage.removeItem(JWT_STORAGE_KEY)
    localStorage.removeItem(USER_EMAIL_STORAGE_KEY)
  } catch {
    // ignore
  }
  const next = new URLSearchParams()
  next.set("expired", "1")
  window.location.replace(`/dashboard/login?${next.toString()}`)
}

export function isAxios401(e: unknown): boolean {
  return axios.isAxiosError(e) && e.response?.status === 401
}

// ── Auth context ──────────────────────────────────────────────────────────────

type DashboardAuthCtx = {
  jwt: string | null
  userEmail: string | null
  setJwt: (jwt: string) => void
  setSession: (jwt: string, userEmail?: string | null) => void
  clearJwt: () => void
}

const DashboardAuthContext = createContext<DashboardAuthCtx>({
  jwt: null,
  userEmail: null,
  setJwt: () => {},
  setSession: () => {},
  clearJwt: () => {},
})

export function DashboardAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [jwt, setJwtState] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(JWT_STORAGE_KEY)
    if (stored) setJwtState(stored)
    const storedEmail = localStorage.getItem(USER_EMAIL_STORAGE_KEY)
    if (storedEmail) setUserEmail(storedEmail)
  }, [])

  const setJwt = useCallback((token: string) => {
    localStorage.setItem(JWT_STORAGE_KEY, token)
    setJwtState(token)
  }, [])

  const setSession = useCallback((token: string, email?: string | null) => {
    localStorage.setItem(JWT_STORAGE_KEY, token)
    setJwtState(token)
    if (email) {
      localStorage.setItem(USER_EMAIL_STORAGE_KEY, email)
      setUserEmail(email)
    } else {
      localStorage.removeItem(USER_EMAIL_STORAGE_KEY)
      setUserEmail(null)
    }
  }, [])

  const clearJwt = useCallback(() => {
    localStorage.removeItem(JWT_STORAGE_KEY)
    localStorage.removeItem(USER_EMAIL_STORAGE_KEY)
    setJwtState(null)
    setUserEmail(null)
  }, [])

  return (
    <DashboardAuthContext.Provider
      value={{ jwt, userEmail, setJwt, setSession, clearJwt }}
    >
      {children}
    </DashboardAuthContext.Provider>
  )
}

export function useDashboardAuth() {
  return useContext(DashboardAuthContext)
}

// ── Typed query hook ──────────────────────────────────────────────────────────

type DashboardQueryOpts<T> = {
  searchParams?: Record<string, string | number | boolean>
  refetchInterval?: number
  enabled?: boolean
} & Omit<
  UseQueryOptions<T, Error>,
  "queryKey" | "queryFn" | "enabled" | "refetchInterval"
>

export function useDashboardQuery<T>(
  path: string,
  options?: DashboardQueryOpts<T>
) {
  const { jwt } = useDashboardAuth()
  const { searchParams, refetchInterval, enabled, ...rest } = options ?? {}

  let url = buildRequestUrl(env.NEXT_PUBLIC_APP_URL, path)
  if (searchParams) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null) params.append(k, String(v))
    }
    const qs = params.toString()
    if (qs) url = `${url}?${qs}`
  }

  return useQuery<T, Error>({
    queryKey: [path, searchParams ?? null],
    queryFn: async () => {
      try {
        const res = await axios.get<T>(url, {
          headers: { Authorization: `Bearer ${jwt}` },
        })
        return res.data
      } catch (e) {
        if (isAxios401(e)) {
          redirectToLoginAfterUnauthorized()
        }
        throw e
      }
    },
    enabled: !!jwt && enabled !== false,
    refetchInterval,
    ...rest,
  })
}

// ── Order control hook ────────────────────────────────────────────────────────

type ControlAction = "pause" | "resume" | "stop"

export function useOrderControl() {
  const { jwt } = useDashboardAuth()
  const [pending, setPending] = useState<ControlAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = useCallback(
    async (orderId: string, action: ControlAction): Promise<boolean> => {
      if (!jwt) return false
      setPending(action)
      setError(null)
      try {
        const url = buildRequestUrl(
          env.NEXT_PUBLIC_APP_URL,
          `internal/dashboard/orders/${orderId}/${action}`
        )
        await axios.post(url, null, {
          headers: { Authorization: `Bearer ${jwt}` },
        })
        return true
      } catch (e: unknown) {
        if (isAxios401(e)) {
          redirectToLoginAfterUnauthorized()
          return false
        }
        const msg = axios.isAxiosError(e)
          ? ((e.response?.data as { error?: string })?.error ?? e.message)
          : String(e)
        setError(msg)
        return false
      } finally {
        setPending(null)
      }
    },
    [jwt]
  )

  return { act, pending, error }
}

type FireSprintSyncResult = {
  ok: boolean
  scanned: number
  updated: number
  trackingFound: number
  notesPosted: number
  errors: number
  screenshots: string[]
}

export type PipelineSettingsResponse = {
  ok: boolean
  pipeline_control: PipelineControlOverview
}

export function usePipelineControl() {
  const { jwt } = useDashboardAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = useCallback(
    async (body: {
      manual_stop?: boolean
      business_hours_enforced?: boolean
    }): Promise<PipelineSettingsResponse | null> => {
      if (!jwt) return null
      setPending(true)
      setError(null)
      try {
        const url = buildRequestUrl(
          env.NEXT_PUBLIC_APP_URL,
          "internal/dashboard/pipeline/settings"
        )
        const res = await axios.post<PipelineSettingsResponse>(url, body, {
          headers: { Authorization: `Bearer ${jwt}` },
        })
        return res.data
      } catch (e: unknown) {
        if (isAxios401(e)) {
          redirectToLoginAfterUnauthorized()
          return null
        }
        const msg = axios.isAxiosError(e)
          ? ((e.response?.data as { error?: string })?.error ?? e.message)
          : String(e)
        setError(msg)
        return null
      } finally {
        setPending(false)
      }
    },
    [jwt]
  )

  return { patch, pending, error }
}

export function useFireSprintSync() {
  const { jwt } = useDashboardAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FireSprintSyncResult | null>(null)

  const run = useCallback(async (): Promise<boolean> => {
    if (!jwt) return false
    setPending(true)
    setError(null)
    try {
      const url = buildRequestUrl(
        env.NEXT_PUBLIC_APP_URL,
        "internal/dashboard/firesprint/sync-now"
      )
      const res = await axios.post<FireSprintSyncResult>(url, null, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      setResult(res.data)
      return true
    } catch (e: unknown) {
      if (isAxios401(e)) {
        redirectToLoginAfterUnauthorized()
        return false
      }
      const msg = axios.isAxiosError(e)
        ? ((e.response?.data as { error?: string })?.error ?? e.message)
        : String(e)
      setError(msg)
      return false
    } finally {
      setPending(false)
    }
  }, [jwt])

  return { run, pending, error, result }
}
