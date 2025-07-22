import clientPromise from "./mongodb.js"

export async function saveDeployment(deploymentData) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("deployments")

    const deployment = {
      ...deploymentData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(deployment)
    return { ...deployment, _id: result.insertedId }
  } catch (error) {
    console.error("Error saving deployment:", error)
    throw new Error("Failed to save deployment to database")
  }
}

export async function updateDeployment(id, updateData) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("deployments")

    const result = await collection.updateOne(
      { _id: id },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    )

    return result
  } catch (error) {
    console.error("Error updating deployment:", error)
    throw new Error("Failed to update deployment in database")
  }
}

export async function getCurrentDeployment() {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("deployments")

    const deployment = await collection.findOne({ status: "deployed" }, { sort: { deployedAt: -1 } })

    return deployment
  } catch (error) {
    console.error("Error getting current deployment:", error)
    throw new Error("Failed to get current deployment from database")
  }
}

export async function getDeploymentHistory(limit = 50) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("deployments")

    const deployments = await collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray()

    return deployments
  } catch (error) {
    console.error("Error getting deployment history:", error)
    throw new Error("Failed to get deployment history from database")
  }
}

export async function getDeploymentHistoryWithFilters({ page = 1, limit = 20, status = "", branch = "", search = "" }) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("deployments")

    // Build filter query
    const filter = {}

    if (status && status !== "all") {
      filter.status = status
    }

    if (branch) {
      filter.branch = { $regex: branch, $options: "i" }
    }

    if (search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" }
      filter.$or = [
        { commit: searchRegex },
        { message: searchRegex },
        { branch: searchRegex },
        { "deployedBy.name": searchRegex },
        { "deployedBy.email": searchRegex },
      ]
    }

    // Get total count for pagination
    const totalItems = await collection.countDocuments(filter)
    const totalPages = Math.ceil(totalItems / limit)
    const skip = (page - 1) * limit

    // Get deployments with pagination
    const deployments = await collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()

    // Get deployment statistics
    const stats = await collection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray()

    const statusStats = {
      total: totalItems,
      deployed: 0,
      failed: 0,
      deploying: 0,
      building: 0,
      "updating-code": 0,
    }

    stats.forEach((stat) => {
      statusStats[stat._id] = stat.count
    })

    return {
      deployments,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        status,
        branch,
        search,
      },
      statistics: statusStats,
    }
  } catch (error) {
    console.error("Error getting deployment history with filters:", error)
    throw new Error("Failed to get deployment history from database")
  }
}

export async function getDeploymentById(id) {
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = db.collection("deployments")

    const deployment = await collection.findOne({ _id: id })
    return deployment
  } catch (error) {
    console.error("Error getting deployment by ID:", error)
    throw new Error("Failed to get deployment from database")
  }
}
