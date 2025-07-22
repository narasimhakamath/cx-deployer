import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-middleware"

export async function GET(request) {
  try {
    console.log("Auth check request received")

    // Log all cookies for debugging
    const cookies = request.cookies.getAll()
    console.log(
      "All cookies:",
      cookies.map((c) => ({ name: c.name, value: c.value?.substring(0, 20) + "..." })),
    )

    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.log("User not authenticated")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("User authenticated successfully:", user.email)

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isAuthenticated: user.isAuthenticated,
      lastLogin: user.lastLogin,
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }
}
