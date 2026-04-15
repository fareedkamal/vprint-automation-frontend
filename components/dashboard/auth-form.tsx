"use client"

import axios from "axios"
import { Lock } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { env } from "@/env"
import { useDashboardAuth } from "@/hooks/use-dashboard-api"
import { buildRequestUrl } from "@/lib/utils"

type AuthMode = "login" | "signup"

export function DashboardAuthForm({
  mode,
  redirectTo = "/dashboard",
}: {
  mode: AuthMode
  redirectTo?: string
}) {
  const { setSession } = useDashboardAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [show, setShow] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submitLogin() {
    if (!email.trim() || !password) {
      setHint("Enter your email and password.")
      return
    }
    setIsSubmitting(true)
    setHint(null)
    try {
      const url = buildRequestUrl(
        env.NEXT_PUBLIC_APP_URL,
        "internal/dashboard/auth/login"
      )
      const res = await axios.post<{
        token: string
        user?: { email?: string | null; name?: string | null }
      }>(url, {
        email: email.trim(),
        password,
      })
      const token = res.data?.token
      if (!token) {
        setHint("Login succeeded but no token was returned.")
        return
      }
      setSession(token, res.data?.user?.email ?? email.trim())
      window.location.assign(redirectTo)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? ((e.response?.data as { error?: string } | undefined)?.error ??
          e.message)
        : String(e)
      setHint(msg || "Login failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitSignup() {
    if (!email.trim() || !password) {
      setHint("Enter name, email and password.")
      return
    }
    if (password.length < 8) {
      setHint("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setHint("Passwords do not match.")
      return
    }
    setIsSubmitting(true)
    setHint(null)
    try {
      const url = buildRequestUrl(
        env.NEXT_PUBLIC_APP_URL,
        "internal/dashboard/auth/signup"
      )
      const res = await axios.post<{
        token: string
        user?: { email?: string | null; name?: string | null }
      }>(url, {
        name: name.trim() || undefined,
        email: email.trim(),
        password,
      })
      const token = res.data?.token
      if (!token) {
        setHint("Signup succeeded but no token was returned.")
        return
      }
      setSession(token, res.data?.user?.email ?? email.trim())
      window.location.assign(redirectTo)
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? ((e.response?.data as { error?: string } | undefined)?.error ??
          e.message)
        : String(e)
      setHint(msg || "Signup failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit() {
    if (mode === "signup") {
      await submitSignup()
      return
    }
    await submitLogin()
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>VPrint Automation Dashboard</CardTitle>
        </div>
        <CardDescription>
          {mode === "login"
            ? "Sign in with your dashboard user email and password."
            : "Create a dashboard account with email and password."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mode === "signup" && (
          <div className="space-y-1">
            <label
              className="text-xs text-muted-foreground block"
              htmlFor="dashboard-signup-name"
            >
              Name (optional)
            </label>
            <Input
              id="dashboard-signup-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setHint(null)
              }}
            />
          </div>
        )}
        <div className="space-y-1">
          <label
            className="text-xs text-muted-foreground block"
            htmlFor="dashboard-email"
          >
            Email
          </label>
          <Input
            id="dashboard-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setHint(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit()
            }}
          />
        </div>
        <div className="relative">
          <label
            className="text-xs text-muted-foreground mb-1 block"
            htmlFor="dashboard-password"
          >
            Password
          </label>
          <Input
            id="dashboard-password"
            type={show ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setHint(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit()
            }}
            className="pr-16"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-8 text-xs text-muted-foreground hover:text-foreground"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {mode === "signup" && (
          <div className="space-y-1">
            <label
              className="text-xs text-muted-foreground mb-1 block"
              htmlFor="dashboard-password-confirm"
            >
              Confirm password
            </label>
            <Input
              id="dashboard-password-confirm"
              type={show ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setHint(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit()
              }}
            />
          </div>
        )}
        {hint && (
          <p className="text-xs text-amber-700 dark:text-amber-400">{hint}</p>
        )}
        <Button
          className="w-full"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </Button>
        {mode === "signup" && (
          <p className="text-xs text-muted-foreground text-center">
            Already have an account?{" "}
            <a href="/dashboard/login" className="underline underline-offset-2">
              Sign in
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
