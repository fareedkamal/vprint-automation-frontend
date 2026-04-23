"use client"

import { DashboardAuthForm } from "@/components/dashboard/auth-form"

export default function DashboardLoginPage() {
  return <DashboardAuthForm mode="login" redirectTo="/dashboard" />
}
