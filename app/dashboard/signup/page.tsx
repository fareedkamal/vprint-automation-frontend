"use client"

import { DashboardAuthForm } from "@/components/dashboard/auth-form"

export default function DashboardSignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <DashboardAuthForm mode="signup" redirectTo="/dashboard" />
    </div>
  )
}
