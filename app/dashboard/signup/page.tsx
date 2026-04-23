"use client"

import { DashboardAuthForm } from "@/components/dashboard/auth-form"

export default function DashboardSignupPage() {
  return <DashboardAuthForm mode="signup" redirectTo="/dashboard" />
}
