import { ObjectId } from "mongodb"
import clientPromise from "./mongodb.js"
import { hashPassword, verifyPassword } from "./auth-utils.js"

export async function createUser(userData) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("users")

    // Check if user already exists
    const existingUser = await collection.findOne({ email: userData.email })
    if (existingUser) {
      throw new Error("User with this email already exists")
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password)

    const user = {
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      isAuthenticated: false, // Default to false, admin needs to approve
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
    }

    const result = await collection.insertOne(user)

    // Return user without password
    const { password, ...userWithoutPassword } = user
    return { ...userWithoutPassword, _id: result.insertedId }
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export async function authenticateUser(email, password) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("users")

    const user = await collection.findOne({ email })
    if (!user) {
      throw new Error("Invalid email or password")
    }

    console.log("Found user:", { email: user.email, isAuthenticated: user.isAuthenticated })

    if (!user.isAuthenticated) {
      throw new Error("Account not yet approved. Please contact administrator.")
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      throw new Error("Invalid email or password")
    }

    // Update last login
    await collection.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date(),
        },
      },
    )

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error("Error authenticating user:", error)
    throw error
  }
}

export async function getUserById(userId) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("users")

    // Convert string to ObjectId if necessary
    const objectId = typeof userId === "string" ? new ObjectId(userId) : userId

    console.log("Looking for user with ID:", objectId)

    const user = await collection.findOne({ _id: objectId })
    if (!user) {
      console.log("User not found with ID:", objectId)
      return null
    }

    console.log("Found user:", { email: user.email, isAuthenticated: user.isAuthenticated })

    // Return user without password
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error("Error getting user by ID:", error)
    throw error
  }
}

export async function getAllUsers() {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("users")

    const users = await collection
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray()
    return users
  } catch (error) {
    console.error("Error getting all users:", error)
    throw error
  }
}

export async function updateUserAuthentication(userId, isAuthenticated) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("users")

    // Convert string to ObjectId if necessary
    const objectId = typeof userId === "string" ? new ObjectId(userId) : userId

    const result = await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          isAuthenticated,
          updatedAt: new Date(),
        },
      },
    )

    return result
  } catch (error) {
    console.error("Error updating user authentication:", error)
    throw error
  }
}
