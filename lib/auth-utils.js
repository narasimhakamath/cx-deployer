import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const JWT_SECRET = process.env.JWT_SECRET
const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "datanimbus.com"

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required")
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, message: "Invalid email format" }
  }

  if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    return { valid: false, message: `Email must end with @${ALLOWED_EMAIL_DOMAIN}` }
  }

  return { valid: true }
}

export function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" }
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    }
  }

  return { valid: true }
}

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload) {
  console.log("Generating token with payload:", payload)
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token) {
  try {
    console.log("Verifying token...")
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log("Token verified successfully:", { userId: decoded.userId, email: decoded.email })
    return decoded
  } catch (error) {
    console.error("Token verification failed:", error.message)
    return null
  }
}
