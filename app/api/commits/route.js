import { NextResponse } from "next/server"
import { getCommits } from "@/lib/git-utils"
import { getAuthenticatedUser, createAuthResponse } from "@/lib/auth-middleware"

export async function GET(request) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return createAuthResponse("Authentication required")
    }

    const { searchParams } = new URL(request.url)
    const branch = searchParams.get("branch")
    const page = Number.parseInt(searchParams.get("page")) || 1
    const limit = Number.parseInt(searchParams.get("limit")) || 20
    const search = searchParams.get("search") || ""

    if (!branch) {
      return NextResponse.json({ error: "Branch parameter is required" }, { status: 400 })
    }

    // Get more commits for searching if search term is provided
    const fetchLimit = search.trim() ? 500 : page * limit + limit
    const allCommits = await getCommits(branch, fetchLimit)

    // Server-side search filtering
    let filteredCommits = allCommits
    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim()
      filteredCommits = allCommits.filter((commit) => {
        return (
          commit.hash.toLowerCase().includes(searchTerm) ||
          commit.message.toLowerCase().includes(searchTerm) ||
          commit.author.toLowerCase().includes(searchTerm)
        )
      })
    }

    // Calculate pagination on filtered results
    const totalCommits = filteredCommits.length
    const totalPages = Math.ceil(totalCommits / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedCommits = filteredCommits.slice(startIndex, endIndex)

    return NextResponse.json({
      branch,
      commits: paginatedCommits,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCommits,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      search: {
        term: search,
        hasSearch: search.trim().length > 0,
        totalMatches: totalCommits,
        searchFields: ["hash", "message", "author"],
      },
    })
  } catch (error) {
    console.error("API Error - Commits:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch commits" }, { status: 500 })
  }
}
