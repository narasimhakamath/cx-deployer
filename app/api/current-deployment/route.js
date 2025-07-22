import { NextResponse } from "next/server"
import { getCurrentDeployment } from "@/lib/deployment-model"
import { getAuthenticatedUser, createAuthResponse } from "@/lib/auth-middleware"

export async function GET(request) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthResponse("Authentication required")
    }

    // Get current deployment from database only
    const currentDeployment = await getCurrentDeployment()

    if (!currentDeployment) {
      return NextResponse.json({
        hasDeployment: false,
        message: "No deployments have been made yet",
      })
    }

    return NextResponse.json({
      hasDeployment: true,
      ...currentDeployment,
    })
  } catch (error) {
    console.error("API Error - Current Deployment:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch current deployment" }, { status: 500 })
  }
}
