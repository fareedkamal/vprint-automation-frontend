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

const JWT_STORAGE_KEY = "vprint_dashboard_jwt"

// ── Auth context ──────────────────────────────────────────────────────────────

type DashboardAuthCtx = {
  jwt: string | null
  setJwt: (jwt: string) => void
  clearJwt: () => void
}

const DashboardAuthContext = createContext<DashboardAuthCtx>({
  jwt: null,
  setJwt: () => {},
  clearJwt: () => {},
})

export function DashboardAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [jwt, setJwtState] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(JWT_STORAGE_KEY)
    if (stored) setJwtState(stored)
  }, [])

  const setJwt = useCallback((token: string) => {
    localStorage.setItem(JWT_STORAGE_KEY, token)
    setJwtState(token)
  }, [])

  const clearJwt = useCallback(() => {
    localStorage.removeItem(JWT_STORAGE_KEY)
    setJwtState(null)
  }, [])

  return (
    <DashboardAuthContext.Provider value={{ jwt, setJwt, clearJwt }}>
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
      const res = await axios.get<T>(url, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      return res.data
    },
    enabled: !!jwt && enabled !== false,
    refetchInterval,
    ...rest,
  })
}
