import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const GIT_REPO_PATH = process.env.GIT_REPO_PATH
const IMAGE_REGISTRY = process.env.IMAGE_REGISTRY
const DOCKERFILE_PATH = process.env.DOCKERFILE_PATH || "Dockerfile"

export async function buildDockerImage(commitHash, branch, deploymentId) {
  try {
    // Use deployment ID as the image tag for uniqueness
    const imageTag = `fl-cx:${deploymentId}`
    const latestTag = `fl-cx:latest`

    console.log(`Building Docker image with deployment ID: ${imageTag}`)

    // Build Docker image with deployment ID as tag
    const buildCommand = `docker build -t ${imageTag} -t ${latestTag} -f ${DOCKERFILE_PATH} .`
    const { stdout: buildOutput } = await execAsync(buildCommand, {
      cwd: GIT_REPO_PATH,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large build outputs
    })

    console.log("Docker build output:", buildOutput)

    // Get image size and info
    const { stdout: imageInfo } = await execAsync(`docker images ${imageTag} --format "table {{.Size}}"`, {
      cwd: GIT_REPO_PATH,
    })

    const imageSize = imageInfo.split("\n")[1]?.trim() || "Unknown"

    return {
      success: true,
      imageTag,
      latestTag,
      deploymentId,
      imageSize,
      buildOutput: buildOutput.slice(-1000), // Keep last 1000 chars
      timestamp: new Date().toISOString(),
      isLocal: true, // Indicate this is a local image
    }
  } catch (error) {
    console.error("Docker build error:", error)
    throw new Error(`Failed to build Docker image: ${error.message}`)
  }
}

// Remove the registry push functionality and add local image management
export async function getLocalImageInfo(imageTag) {
  try {
    const { stdout } = await execAsync(`docker inspect ${imageTag}`)
    const imageInfo = JSON.parse(stdout)[0]

    return {
      id: imageInfo.Id,
      created: imageInfo.Created,
      size: imageInfo.Size,
      architecture: imageInfo.Architecture,
      os: imageInfo.Os,
      isLocal: true,
    }
  } catch (error) {
    console.error("Error getting local image info:", error)
    throw new Error(`Failed to get local image information: ${error.message}`)
  }
}

export async function cleanupOldImages(keepCount = 5) {
  try {
    console.log(`Cleaning up old fl-cx images, keeping latest ${keepCount}`)

    // Get all fl-cx images sorted by creation date
    const { stdout } = await execAsync(
      `docker images fl-cx --format "{{.Tag}} {{.CreatedAt}}" | grep -v latest | sort -k2 -r`,
    )

    const images = stdout
      .trim()
      .split("\n")
      .filter((line) => line.trim())

    if (images.length > keepCount) {
      const imagesToDelete = images.slice(keepCount)

      for (const imageInfo of imagesToDelete) {
        const tag = imageInfo.split(" ")[0]
        if (tag && tag !== "latest") {
          try {
            await execAsync(`docker rmi fl-cx:${tag}`)
            console.log(`Deleted old image: fl-cx:${tag}`)
          } catch (deleteError) {
            console.log(`Could not delete image fl-cx:${tag}:`, deleteError.message)
          }
        }
      }
    }

    return {
      success: true,
      cleanedImages: Math.max(0, images.length - keepCount),
      remainingImages: Math.min(images.length, keepCount),
    }
  } catch (error) {
    console.error("Error cleaning up old images:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}
