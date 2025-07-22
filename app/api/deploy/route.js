import { NextResponse } from "next/server"
import { saveDeployment, updateDeployment } from "@/lib/deployment-model"
import { checkoutCommit, pullLatestCode } from "@/lib/git-utils"
import { buildDockerImage } from "@/lib/docker-utils"
import { deployToKubernetes } from "@/lib/kubernetes-utils"
import { getAuthenticatedUser, createAuthResponse } from "@/lib/auth-middleware"
import { acquireLock, releaseLock } from "@/lib/lock-manager"
import { cleanupOldImages } from "@/lib/docker-utils"

export async function POST(request) {
  let lockAcquired = false
  let user = null

  try {
    // Check authentication
    user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthResponse("Authentication required")
    }

    const { branch, commit, message, author } = await request.json()

    if (!branch || !commit) {
      return NextResponse.json({ error: "Branch and commit are required" }, { status: 400 })
    }

    console.log(`Deploy request from user: ${user.email} for commit: ${commit}`)

    // Try to acquire deployment lock
    const lockResult = await acquireLock("deployment", user.id, user.email)

    if (!lockResult.success) {
      return NextResponse.json(
        {
          error: lockResult.message,
          lockedBy: lockResult.lockedBy,
          lockedAt: lockResult.lockedAt,
        },
        { status: 423 }, // 423 Locked
      )
    }

    lockAcquired = true
    console.log("Lock acquired for deployment operation")

    // Save initial deployment record
    const deploymentData = {
      branch,
      commit,
      message: message || "No commit message",
      author: author || "Unknown",
      deployedBy: {
        userId: user.id,
        name: user.name,
        email: user.email,
      },
      status: "initializing",
      deployedAt: new Date(),
      logs: [`Deployment initiated by ${user.name} (${user.email})`],
      steps: {
        checkout: { status: "pending", startTime: null, endTime: null },
        build: { status: "pending", startTime: null, endTime: null },
        deploy: { status: "pending", startTime: null, endTime: null },
      },
    }

    const deployment = await saveDeployment(deploymentData)

    // Start deployment process asynchronously
    deployCommitAsync(deployment._id, commit, branch, user)

    return NextResponse.json({
      message: "Deployment started successfully",
      deploymentId: deployment._id,
      deployment: deployment,
    })
  } catch (error) {
    console.error("API Error - Deploy:", error)
    return NextResponse.json({ error: error.message || "Failed to start deployment" }, { status: 500 })
  } finally {
    // Note: We don't release the lock here because the deployment is async
    // The lock will be released in deployCommitAsync
  }
}

async function deployCommitAsync(deploymentId, commit, branch, user) {
  const logs = [`Deployment initiated by ${user.name} (${user.email})`]

  try {
    // Step 1: Update code and checkout commit
    await updateDeployment(deploymentId, {
      status: "updating-code",
      logs: [...logs, "Pulling latest code and cleaning up unstaged changes..."],
      "steps.checkout.status": "running",
      "steps.checkout.startTime": new Date(),
    })

    // Pull latest code with cleanup
    const pullResult = await pullLatestCode()
    logs.push("Latest code pulled successfully with cleanup")
    logs.push(`Updated ${pullResult.statistics.totalBranches} branches`)

    // Add cleanup information to logs
    pullResult.steps.forEach((step) => {
      logs.push(`✓ ${step}`)
    })

    // Checkout the specific commit
    await checkoutCommit(commit)
    logs.push(`Checked out commit ${commit.substring(0, 7)} successfully`)

    await updateDeployment(deploymentId, {
      logs: [...logs],
      "steps.checkout.status": "completed",
      "steps.checkout.endTime": new Date(),
    })

    // Step 2: Build Docker image with deployment ID as tag
    await updateDeployment(deploymentId, {
      status: "building",
      logs: [...logs, `Building Docker image with tag: fl-cx:${deploymentId}...`],
      "steps.build.status": "running",
      "steps.build.startTime": new Date(),
    })

    // Pass deployment ID to build function
    const buildResult = await buildDockerImage(commit, branch, deploymentId)
    logs.push(`Docker image built successfully: ${buildResult.imageTag}`)
    logs.push(`Image size: ${buildResult.imageSize}`)

    if (buildResult.buildOutput) {
      logs.push(`Build output: ${buildResult.buildOutput}`)
    }

    await updateDeployment(deploymentId, {
      logs: [...logs],
      dockerInfo: buildResult,
      "steps.build.status": "completed",
      "steps.build.endTime": new Date(),
    })

    // Step 3: Deploy to Kubernetes with updated YAML files
    await updateDeployment(deploymentId, {
      status: "deploying",
      logs: [...logs, "Updating deployment YAML and deploying to Kubernetes..."],
      "steps.deploy.status": "running",
      "steps.deploy.startTime": new Date(),
    })

    // Pass deployment ID to Kubernetes deployment
    const kubernetesResult = await deployToKubernetes(buildResult.imageTag, branch, commit, deploymentId)
    logs.push("Deployed to Kubernetes successfully")

    // Add deployment steps to logs
    kubernetesResult.deploymentSteps.forEach((step) => {
      logs.push(`✓ ${step}`)
    })

    // Step 4: Clean up old Docker images (keep last 5)
    try {
      const cleanupResult = await cleanupOldImages(5)
      if (cleanupResult.success && cleanupResult.cleanedImages > 0) {
        logs.push(`Cleaned up ${cleanupResult.cleanedImages} old Docker images`)
      }
    } catch (cleanupError) {
      console.log("Image cleanup warning:", cleanupError.message)
      logs.push("Image cleanup skipped (non-critical)")
    }

    // Step 5: Final success update
    await updateDeployment(deploymentId, {
      status: "deployed",
      deployedAt: new Date(),
      kubernetesInfo: kubernetesResult,
      logs: [...logs, "🎉 Deployment completed successfully!"],
      "steps.deploy.status": "completed",
      "steps.deploy.endTime": new Date(),
    })
  } catch (error) {
    console.error("Deployment process error:", error)
    logs.push(`❌ Deployment failed: ${error.message}`)

    // Update deployment status to failed
    await updateDeployment(deploymentId, {
      status: "failed",
      error: error.message,
      logs: [...logs],
      failedAt: new Date(),
    })
  } finally {
    // Always release the deployment lock
    try {
      await releaseLock("deployment", user.id)
      console.log("Deployment lock released")
    } catch (lockError) {
      console.error("Error releasing deployment lock:", lockError)
    }
  }
}
