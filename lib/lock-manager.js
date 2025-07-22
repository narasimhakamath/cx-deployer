import clientPromise from "./mongodb.js"

const LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

export async function acquireLock(lockType, userId, userEmail) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("operation_locks")

    // Check if lock already exists and is not expired
    const existingLock = await collection.findOne({ lockType })

    if (existingLock) {
      const now = new Date()
      const lockAge = now.getTime() - existingLock.createdAt.getTime()

      // If lock is not expired, return false
      if (lockAge < LOCK_TIMEOUT) {
        return {
          success: false,
          message: `Operation already in progress by ${existingLock.userEmail}. Please wait.`,
          lockedBy: existingLock.userEmail,
          lockedAt: existingLock.createdAt,
        }
      } else {
        // Lock is expired, remove it
        await collection.deleteOne({ _id: existingLock._id })
      }
    }

    // Create new lock
    const lockData = {
      lockType,
      userId,
      userEmail,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + LOCK_TIMEOUT),
    }

    const result = await collection.insertOne(lockData)

    return {
      success: true,
      lockId: result.insertedId,
      message: `Lock acquired for ${lockType}`,
    }
  } catch (error) {
    console.error("Error acquiring lock:", error)
    throw new Error("Failed to acquire operation lock")
  }
}

export async function releaseLock(lockType, userId) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("operation_locks")

    const result = await collection.deleteOne({
      lockType,
      userId,
    })

    return result.deletedCount > 0
  } catch (error) {
    console.error("Error releasing lock:", error)
    throw new Error("Failed to release operation lock")
  }
}

export async function checkLockStatus(lockType) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("operation_locks")

    const lock = await collection.findOne({ lockType })

    if (!lock) {
      return { locked: false }
    }

    const now = new Date()
    const lockAge = now.getTime() - lock.createdAt.getTime()

    // If lock is expired, remove it
    if (lockAge >= LOCK_TIMEOUT) {
      await collection.deleteOne({ _id: lock._id })
      return { locked: false }
    }

    return {
      locked: true,
      lockedBy: lock.userEmail,
      lockedAt: lock.createdAt,
      expiresAt: lock.expiresAt,
    }
  } catch (error) {
    console.error("Error checking lock status:", error)
    return { locked: false }
  }
}

export async function cleanupExpiredLocks() {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("operation_locks")

    const expiredTime = new Date(Date.now() - LOCK_TIMEOUT)
    const result = await collection.deleteMany({
      createdAt: { $lt: expiredTime },
    })

    console.log(`Cleaned up ${result.deletedCount} expired locks`)
    return result.deletedCount
  } catch (error) {
    console.error("Error cleaning up expired locks:", error)
    return 0
  }
}
