import { NextResponse } from "next/server"
import { createUser } from "@/lib/user-model"
import { validateEmail, validatePassword } from "@/lib/auth-utils"

export async function POST(request) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.message }, { status: 400 })
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 })
    }

    // Create user
    const user = await createUser({ name, email, password })

    return NextResponse.json({
      message: "Account created successfully. Please wait for administrator approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAuthenticated: user.isAuthenticated,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 500 })
  }
}
