import { verifyToken } from "./auth-utils.js"
import { getUserById } from "./user-model.js"

export async function getAuthenticatedUser(request) {
  try {
    // Get token from cookies
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      console.log("No auth token found in cookies")
      return null
    }

    // Verify JWT token
    const decoded = verifyToken(token)
    if (!decoded || !decoded.userId) {
      console.log("Invalid or expired token")
      return null
    }

    console.log("Decoded token userId:", decoded.userId)

    // Get user from database
    const user = await getUserById(decoded.userId)
    if (!user) {
      console.log("User not found in database")
      return null
    }

    if (!user.isAuthenticated) {
      console.log("User not authenticated:", user.email)
      return null
    }

    console.log("User authenticated successfully:", user.email)
    return user
  } catch (error) {
    console.error("Auth middleware error:", error)
    return null
  }
}

export function createAuthResponse(message, status = 401) {
  return Response.json({ error: message, requiresAuth: true }, { status })
}
