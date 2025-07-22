import { NextResponse } from "next/server"
import { checkLockStatus, cleanupExpiredLocks } from "@/lib/lock-manager"
import { getAuthenticatedUser, createAuthResponse } from "@/lib/auth-middleware"

export async function GET(request) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthResponse("Authentication required")
    }

    // Clean up expired locks first
    await cleanupExpiredLocks()

    // Check status of both operations
    const pullCodeStatus = await checkLockStatus("pull-code")
    const deploymentStatus = await checkLockStatus("deployment")

    return NextResponse.json({
      pullCode: pullCodeStatus,
      deployment: deploymentStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("API Error - Operation Status:", error)
    return NextResponse.json({ error: error.message || "Failed to check operation status" }, { status: 500 })
  }
}
