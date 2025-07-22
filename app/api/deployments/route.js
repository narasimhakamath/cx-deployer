import { NextResponse } from "next/server"
import { getAuthenticatedUser, createAuthResponse } from "@/lib/auth-middleware"
import { getDeploymentHistoryWithFilters } from "@/lib/deployment-model" // Declared the missing variable

export async function GET(request) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthResponse("Authentication required")
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page")) || 1
    const limit = Number.parseInt(searchParams.get("limit")) || 20
    const status = searchParams.get("status") || ""
    const branch = searchParams.get("branch") || ""
    const search = searchParams.get("search") || ""

    const deployments = await getDeploymentHistoryWithFilters({
      page,
      limit,
      status,
      branch,
      search,
    })

    return NextResponse.json(deployments)
  } catch (error) {
    console.error("API Error - Deployments:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch deployments" }, { status: 500 })
  }
}
