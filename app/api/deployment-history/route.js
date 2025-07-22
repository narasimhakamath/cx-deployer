import { NextResponse } from "next/server"
import { getDeploymentHistory } from "@/lib/deployment-model"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit")) || 50

    const deployments = await getDeploymentHistory(limit)

    return NextResponse.json({
      deployments,
      count: deployments.length,
    })
  } catch (error) {
    console.error("API Error - Deployment History:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch deployment history" }, { status: 500 })
  }
}
