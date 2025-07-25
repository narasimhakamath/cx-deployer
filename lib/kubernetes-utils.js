import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const NAMESPACE = process.env.KUBERNETES_NAMESPACE || "default"
const GIT_REPO_PATH = process.env.GIT_REPO_PATH
const DEPLOYMENT_YAML = process.env.DEPLOYMENT_YAML
const CONFIG_MAP_YAML = process.env.CONFIG_MAP_YAML
const DEPLOYMENT_NAME = process.env.DEPLOYMENT_NAME;

export async function deployToKubernetes(imageTag, branch, commitHash, deploymentId) {
  try {
    const deploymentSteps = []

    // Step 1: Update the deployment YAML file with new image tag
    console.log(`Updating deployment YAML file: ${DEPLOYMENT_YAML}.yaml`)
    await updateDeploymentYaml(imageTag, deploymentId, commitHash, branch)
    deploymentSteps.push("Updated deployment YAML with new image tag")

    // Step 2: Update ConfigMap if it exists
    console.log(`Updating ConfigMap: ${CONFIG_MAP_YAML}.yaml`)
    await updateConfigMap(commitHash, branch, deploymentId)
    deploymentSteps.push("Updated ConfigMap with deployment info")

    // Step 3: Apply the updated deployment
    console.log(`Applying deployment: ${DEPLOYMENT_YAML}.yaml`)
    const applyCommand = `kubectl -n ${NAMESPACE} apply -f ${DEPLOYMENT_YAML}.yaml`

    const { stdout: applyOutput } = await execAsync(applyCommand, { cwd: GIT_REPO_PATH })
    deploymentSteps.push("Applied deployment configuration")

    // Step 4: Apply ConfigMap if it exists
    try {
      const configMapCommand = `kubectl -n ${NAMESPACE} apply -f ${CONFIG_MAP_YAML}.yaml`

      await execAsync(configMapCommand, { cwd: GIT_REPO_PATH })
      deploymentSteps.push("Applied ConfigMap configuration")
    } catch (configError) {
      console.log("ConfigMap update skipped:", configError.message)
      deploymentSteps.push("ConfigMap update skipped (file may not exist)")
    }

    // Step 5: Wait for rollout to complete
    console.log("Waiting for deployment rollout to complete...")
    const rolloutCommand = `kubectl -n ${NAMESPACE} rollout status deployment/${DEPLOYMENT_NAME} --timeout=300s`

    const { stdout: rolloutOutput } = await execAsync(rolloutCommand)
    deploymentSteps.push("Deployment rollout completed successfully")

    // Step 6: Get deployment status
    const statusInfo = await getDeploymentStatus()

    return {
      success: true,
      message: `Successfully deployed ${commitHash} to Kubernetes`,
      imageTag,
      deploymentId,
      deploymentSteps,
      rolloutOutput,
      statusInfo,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Kubernetes deployment error:", error)
    throw new Error(`Failed to deploy to Kubernetes: ${error.message}`)
  }
}

async function updateDeploymentYaml(imageTag, deploymentId, commitHash, branch) {
  try {
    const fs = require("fs").promises
    const path = require("path")

    const deploymentPath = path.join(GIT_REPO_PATH, `${DEPLOYMENT_YAML}.yaml`)

    // Read the current deployment YAML
    let deploymentContent = await fs.readFile(deploymentPath, "utf8")

    // Update the image tag in the YAML
    // This regex looks for image: fl-cx:* and replaces with new tag
    const imageRegex = /image:\s*fl-cx:[^\s]*/g
    deploymentContent = deploymentContent.replace(imageRegex, `image: ${imageTag}`)

    // Also update any image references without tag
    const imageRegexNoTag = /image:\s*fl-cx\s*$/gm
    deploymentContent = deploymentContent.replace(imageRegexNoTag, `image: ${imageTag}`)

    // Add deployment metadata as annotations
    const annotationRegex = /(annotations:\s*\n)/
    if (annotationRegex.test(deploymentContent)) {
      deploymentContent = deploymentContent.replace(
        annotationRegex,
        `$1        deployment.fl-cx/id: "${deploymentId}"\n        deployment.fl-cx/commit: "${commitHash}"\n        deployment.fl-cx/branch: "${branch}"\n        deployment.fl-cx/timestamp: "${new Date().toISOString()}"\n`,
      )
    } else {
      // Add annotations section if it doesn't exist
      const metadataRegex = /(metadata:\s*\n)/
      deploymentContent = deploymentContent.replace(
        metadataRegex,
        `$1  annotations:\n    deployment.fl-cx/id: "${deploymentId}"\n    deployment.fl-cx/commit: "${commitHash}"\n    deployment.fl-cx/branch: "${branch}"\n    deployment.fl-cx/timestamp: "${new Date().toISOString()}"\n`,
      )
    }

    // Write the updated YAML back
    await fs.writeFile(deploymentPath, deploymentContent, "utf8")

    console.log(`Updated deployment YAML with image: ${imageTag}`)
    return true
  } catch (error) {
    console.error("Error updating deployment YAML:", error)
    throw new Error(`Failed to update deployment YAML: ${error.message}`)
  }
}

async function updateConfigMap(commitHash, branch, deploymentId) {
  try {
    const fs = require("fs").promises
    const path = require("path")

    const configMapPath = path.join(GIT_REPO_PATH, `${CONFIG_MAP_YAML}.yaml`)

    // Check if ConfigMap file exists
    try {
      await fs.access(configMapPath)
    } catch (accessError) {
      console.log(`ConfigMap file ${CONFIG_MAP_YAML}.yaml not found, skipping update`)
      return false
    }

    // Read the current ConfigMap YAML
    let configMapContent = await fs.readFile(configMapPath, "utf8")

    // Update or add deployment information in ConfigMap data
    const deploymentInfo = `
  DEPLOYMENT_ID: "${deploymentId}"
  COMMIT_HASH: "${commitHash}"
  BRANCH: "${branch}"
  DEPLOYED_AT: "${new Date().toISOString()}"
  IMAGE_TAG: "fl-cx:${deploymentId}"`

    // Look for existing data section and update it
    const dataRegex = /(data:\s*\n)/
    if (dataRegex.test(configMapContent)) {
      configMapContent = configMapContent.replace(dataRegex, `$1${deploymentInfo}\n`)
    } else {
      // Add data section if it doesn't exist
      configMapContent += `\ndata:${deploymentInfo}\n`
    }

    // Write the updated ConfigMap back
    await fs.writeFile(configMapPath, configMapContent, "utf8")

    console.log("Updated ConfigMap with deployment information")
    return true
  } catch (error) {
    console.error("Error updating ConfigMap:", error)
    throw new Error(`Failed to update ConfigMap: ${error.message}`)
  }
}

export async function getDeploymentStatus() {
  try {
    const command = `kubectl -n ${NAMESPACE} get deployment fl-cx -o json`

    const { stdout } = await execAsync(command)
    const deployment = JSON.parse(stdout)

    return {
      replicas: deployment.status.replicas || 0,
      readyReplicas: deployment.status.readyReplicas || 0,
      updatedReplicas: deployment.status.updatedReplicas || 0,
      availableReplicas: deployment.status.availableReplicas || 0,
      conditions: deployment.status.conditions || [],
      image: deployment.spec.template.spec.containers[0].image,
      namespace: NAMESPACE,
      lastUpdateTime: deployment.status.conditions?.[0]?.lastUpdateTime,
      annotations: deployment.metadata.annotations || {},
    }
  } catch (error) {
    console.error("Error getting deployment status:", error)
    throw new Error("Failed to get Kubernetes deployment status")
  }
}

export async function getPodLogs(lines = 100) {
  try {
    const command = `kubectl -n ${NAMESPACE} logs deployment/fl-cx --tail=${lines}`

    const { stdout } = await execAsync(command)
    return stdout
  } catch (error) {
    console.error("Error getting pod logs:", error)
    throw new Error("Failed to get pod logs")
  }
}
