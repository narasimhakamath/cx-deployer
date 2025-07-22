import { NextResponse } from "next/server"
import { authenticateUser } from "@/lib/user-model"
import { generateToken } from "@/lib/auth-utils"

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    console.log("Login attempt for email:", email)

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Authenticate user
    const user = await authenticateUser(email, password)
    console.log("User authenticated:", { id: user._id, email: user.email })

    // Generate JWT token with string version of user ID
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    })

    console.log("Generated token for user:", user._id.toString())

    // Create response
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isAuthenticated: user.isAuthenticated,
      },
    })

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/", // Make sure cookie is available for all paths
    })

    console.log("Login successful, cookie set")

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 401 })
  }
}
