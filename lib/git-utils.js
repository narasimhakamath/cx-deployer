import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const GIT_REPO_PATH = process.env.GIT_REPO_PATH
const GIT_REMOTE_NAME = process.env.GIT_REMOTE_NAME || "origin"

if (!GIT_REPO_PATH) {
  throw new Error("GIT_REPO_PATH environment variable is required")
}

export async function getBranches() {
  try {
    const { stdout } = await execAsync(`git branch -r --format="%(refname:short)"`, { cwd: GIT_REPO_PATH })

    const branches = stdout
      .split("\n")
      .filter((branch) => branch.trim())
      .map((branch) => branch.replace(`${GIT_REMOTE_NAME}/`, "").trim())
      .filter((branch) => branch !== "HEAD")

    return branches
  } catch (error) {
    console.error("Error fetching branches:", error)
    throw new Error("Failed to fetch branches from git repository")
  }
}

export async function getCommits(branch, limit = 20) {
  try {
    const { stdout } = await execAsync(
      `git log ${GIT_REMOTE_NAME}/${branch} --format="%H|%s|%an|%ae|%ad" --date=iso -n ${limit}`,
      { cwd: GIT_REPO_PATH },
    )

    const commits = stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, message, author, email, date] = line.split("|")
        return {
          hash: hash.trim(),
          message: message.trim(),
          author: author.trim(),
          email: email.trim(),
          date: new Date(date.trim()).toISOString(),
        }
      })

    return commits
  } catch (error) {
    console.error("Error fetching commits:", error)
    throw new Error(`Failed to fetch commits for branch ${branch}`)
  }
}

export async function pullLatestCode() {
  try {
    const steps = []
    const startTime = new Date()

    console.log("Starting comprehensive code pull with cleanup...")

    // Step 1: Clean up any unstaged changes to avoid conflicts
    console.log("Cleaning up unstaged changes...")
    await cleanupUnstagedChanges()
    steps.push("Cleaned up unstaged changes")

    // Step 2: Fetch all remote branches and tags
    console.log("Fetching all remote branches and tags...")
    const { stdout: fetchOutput } = await execAsync(`git fetch --all --tags --prune`, {
      cwd: GIT_REPO_PATH,
      timeout: 300000, // 5 minutes timeout
    })
    steps.push("Fetched all remote branches and tags")
    console.log("Fetch output:", fetchOutput)

    // Step 3: Get current branch
    const { stdout: currentBranch } = await execAsync(`git rev-parse --abbrev-ref HEAD`, { cwd: GIT_REPO_PATH })
    const currentBranchName = currentBranch.trim()
    steps.push(`Current branch: ${currentBranchName}`)

    // Step 4: Update current branch if it has a remote tracking branch
    try {
      const { stdout: trackingBranch } = await execAsync(`git rev-parse --abbrev-ref ${currentBranchName}@{upstream}`, {
        cwd: GIT_REPO_PATH,
      })

      if (trackingBranch.trim()) {
        console.log(`Pulling latest changes for current branch: ${currentBranchName}`)
        const { stdout: pullOutput } = await execAsync(`git pull ${GIT_REMOTE_NAME} ${currentBranchName}`, {
          cwd: GIT_REPO_PATH,
        })
        steps.push(`Updated current branch: ${currentBranchName}`)
        console.log("Pull output:", pullOutput)
      }
    } catch (trackingError) {
      console.log(`No upstream branch for ${currentBranchName}, skipping pull`)
      steps.push(`No upstream branch for ${currentBranchName}`)
    }

    // Step 5: Update all remote tracking branches
    console.log("Updating remote tracking information...")
    await execAsync(`git remote update ${GIT_REMOTE_NAME} --prune`, { cwd: GIT_REPO_PATH })
    steps.push("Updated remote tracking information")

    // Step 6: Clean up any stale references
    console.log("Cleaning up stale references...")
    await execAsync(`git gc --prune=now`, { cwd: GIT_REPO_PATH })
    steps.push("Cleaned up stale references")

    // Step 7: Get updated branch and commit counts
    const { stdout: branchCount } = await execAsync(`git branch -r | wc -l`, { cwd: GIT_REPO_PATH })
    const { stdout: commitCount } = await execAsync(`git rev-list --all --count`, { cwd: GIT_REPO_PATH })

    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    return {
      success: true,
      message: `Successfully updated repository with latest code`,
      steps,
      statistics: {
        totalBranches: Number.parseInt(branchCount.trim()),
        totalCommits: Number.parseInt(commitCount.trim()),
        duration: `${duration} seconds`,
        updatedAt: endTime.toISOString(),
      },
      timestamp: endTime.toISOString(),
    }
  } catch (error) {
    console.error("Error pulling code:", error)
    throw new Error(`Failed to pull latest code: ${error.message}`)
  }
}

export async function cleanupUnstagedChanges() {
  try {
    const steps = []

    // Check if there are any unstaged changes
    const { stdout: statusOutput } = await execAsync(`git status --porcelain`, { cwd: GIT_REPO_PATH })

    if (statusOutput.trim()) {
      console.log("Found unstaged changes, cleaning up...")

      // Checkout all modified files (discard changes)
      await execAsync(`git checkout -- .`, { cwd: GIT_REPO_PATH })
      steps.push("Discarded unstaged changes")

      // Remove untracked files and directories
      await execAsync(`git clean -fd`, { cwd: GIT_REPO_PATH })
      steps.push("Removed untracked files")

      // Reset any staged changes
      await execAsync(`git reset --hard HEAD`, { cwd: GIT_REPO_PATH })
      steps.push("Reset staged changes")

      console.log("Cleanup completed:", steps)
    } else {
      console.log("No unstaged changes found")
      steps.push("No unstaged changes to clean")
    }

    return {
      success: true,
      steps,
      hadChanges: statusOutput.trim().length > 0,
    }
  } catch (error) {
    console.error("Error cleaning up unstaged changes:", error)
    throw new Error(`Failed to cleanup unstaged changes: ${error.message}`)
  }
}

// Add function to get repository status including unstaged changes
export async function getRepositoryStatus() {
  try {
    const { stdout: status } = await execAsync(`git status --porcelain`, { cwd: GIT_REPO_PATH })
    const { stdout: lastFetch } = await execAsync(`stat -c %Y .git/FETCH_HEAD 2>/dev/null || echo 0`, {
      cwd: GIT_REPO_PATH,
    })

    // Get more detailed status
    const { stdout: branchInfo } = await execAsync(`git branch -vv`, { cwd: GIT_REPO_PATH })
    const { stdout: lastCommit } = await execAsync(`git log -1 --format="%H %s %an %ad" --date=short`, {
      cwd: GIT_REPO_PATH,
    })

    const unstagedFiles = status
      .trim()
      .split("\n")
      .filter((line) => line.trim())

    return {
      hasUncommittedChanges: status.trim().length > 0,
      uncommittedFiles: unstagedFiles,
      lastFetchTime: new Date(Number.parseInt(lastFetch.trim()) * 1000).toISOString(),
      branchInfo: branchInfo.trim(),
      lastCommit: lastCommit.trim(),
      isClean: status.trim().length === 0,
    }
  } catch (error) {
    console.error("Error getting repository status:", error)
    return {
      hasUncommittedChanges: false,
      uncommittedFiles: [],
      lastFetchTime: null,
      branchInfo: "Unknown",
      lastCommit: "Unknown",
      isClean: true,
    }
  }
}
export async function checkoutCommit(commitHash) {
  try {
    await execAsync(`git checkout ${commitHash}`, { cwd: GIT_REPO_PATH })
    return {
      success: true,
      message: `Successfully checked out commit ${commitHash}`,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error checking out commit:", error)
    throw new Error(`Failed to checkout commit ${commitHash}`)
  }
}

export async function getCurrentCommit() {
  try {
    const { stdout } = await execAsync(`git log -1 --format="%H|%s|%an|%ae|%ad" --date=iso`, { cwd: GIT_REPO_PATH })

    const [hash, message, author, email, date] = stdout.trim().split("|")

    return {
      hash: hash.trim(),
      message: message.trim(),
      author: author.trim(),
      email: email.trim(),
      date: new Date(date.trim()).toISOString(),
    }
  } catch (error) {
    console.error("Error getting current commit:", error)
    throw new Error("Failed to get current commit information")
  }
}

export async function getCurrentBranch() {
  try {
    const { stdout } = await execAsync(`git rev-parse --abbrev-ref HEAD`, { cwd: GIT_REPO_PATH })

    return stdout.trim()
  } catch (error) {
    console.error("Error getting current branch:", error)
    throw new Error("Failed to get current branch")
  }
}
