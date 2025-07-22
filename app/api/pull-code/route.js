import { NextResponse } from "next/server"
import { pullLatestCode } from "@/lib/git-utils"
import { getAuthenticatedUser, createAuthResponse } from "@/lib/auth-middleware"
import { acquireLock, releaseLock } from "@/lib/lock-manager"

export async function POST(request) {
  let lockAcquired = false
  let user = null

  try {
    // Check authentication
    user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthResponse("Authentication required")
    }

    console.log(`Pull code request from user: ${user.email}`)

    // Try to acquire lock
    const lockResult = await acquireLock("pull-code", user.id, user.email)

    if (!lockResult.success) {
      return NextResponse.json(
        {
          error: lockResult.message,
          lockedBy: lockResult.lockedBy,
          lockedAt: lockResult.lockedAt,
        },
        { status: 423 }, // 423 Locked
      )
    }

    lockAcquired = true
    console.log("Lock acquired for pull-code operation")

    // Perform the pull operation
    const result = await pullLatestCode()

    console.log("Pull code completed successfully:", result.statistics)

    return NextResponse.json({
      success: true,
      message: result.message,
      steps: result.steps,
      statistics: result.statistics,
      timestamp: result.timestamp,
    })
  } catch (error) {
    console.error("API Error - Pull Code:", error)
    return NextResponse.json({ error: error.message || "Failed to pull latest code" }, { status: 500 })
  } finally {
    // Always release the lock
    if (lockAcquired && user) {
      try {
        await releaseLock("pull-code", user.id)
        console.log("Lock released for pull-code operation")
      } catch (lockError) {
        console.error("Error releasing pull-code lock:", lockError)
      }
    }
  }
}
