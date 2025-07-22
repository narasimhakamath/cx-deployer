import { NextResponse } from "next/server"
import { getDeploymentById } from "@/lib/deployment-model"
import { getAuthenticatedUser, createAuthResponse } from "@/lib/auth-middleware"

export async function GET(request, { params }) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthResponse("Authentication required")
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Deployment ID is required" }, { status: 400 })
    }

    const deployment = await getDeploymentById(id)

    if (!deployment) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 })
    }

    return NextResponse.json(deployment)
  } catch (error) {
    console.error("API Error - Deployment Status:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch deployment status" }, { status: 500 })
  }
}
