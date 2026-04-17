"use client"

import axios from "axios"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import Link from "next/link"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { env } from "@/env"
import { useDashboardAuth } from "@/hooks/use-dashboard-api"
import { buildRequestUrl } from "@/lib/utils"

const SHEET_GID = 70385341
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1L0S04ApdUTbz3FDH3jGa9pBs5w5YNeiBJnjt7UfC_O0/edit?gid=70385341#gid=70385341"

type SyncResponse = {
  spreadsheet_id: string
  sheet_gid: number
  sheet_title: string | null
  rows_in_sheet: number
  products_parsed: number
  upserted: number
}

export default function VendorCatalogPage() {
  const { jwt } = useDashboardAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SyncResponse | null>(null)

  const sync = useCallback(async () => {
    if (!jwt) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const url = buildRequestUrl(
        env.NEXT_PUBLIC_APP_URL,
        "internal/dashboard/products/sync-from-sheet"
      )
      const res = await axios.post<SyncResponse>(url, null, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
      setResult(res.data)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? ((e.response?.data as { error?: string })?.error ?? e.message)
        : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [jwt])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Vendor catalog
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sync product rows from the vendor Google Sheet into Supabase (same
          mapping as the n8n sheet flow).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheet
          </CardTitle>
          <CardDescription>
            Source tab gid{" "}
            <code className="text-xs bg-muted px-1 rounded">{SHEET_GID}</code>.
            Open the sheet to edit SKUs and pricing; then run sync here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href={SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline break-all"
          >
            {SHEET_URL}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void sync()}
              disabled={!jwt || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Syncing…
                </>
              ) : (
                "Sync from Google Sheet"
              )}
            </Button>
            {!jwt ? (
              <span className="text-sm text-muted-foreground">
                Sign in to run sync.
              </span>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-destructive whitespace-pre-wrap">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Sheet:</span>{" "}
                {result.sheet_title ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">
                  Data rows (excl. header):
                </span>{" "}
                {result.rows_in_sheet}
              </p>
              <p>
                <span className="text-muted-foreground">
                  Products (unique SKU):
                </span>{" "}
                {result.products_parsed}
              </p>
              <p>
                <span className="text-muted-foreground">Upserted:</span>{" "}
                {result.upserted}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
