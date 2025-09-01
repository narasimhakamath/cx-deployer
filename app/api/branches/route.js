import { NextResponse } from "next/server";
import { getBranches } from "@/lib/git-utils";
import {
  getAuthenticatedUser,
  createAuthResponse,
} from "@/lib/auth-middleware";

export async function GET(request) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return createAuthResponse("Authentication required");
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page")) || 1;
    const limit = Number.parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    const allBranches = await getBranches();

    // Server-side search filtering
    let filteredBranches = allBranches;
    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filteredBranches = allBranches.filter((branch) =>
        branch.name.toLowerCase().includes(searchTerm)
      );
    }

    // Calculate pagination on filtered results
    const totalBranches = filteredBranches.length;
    const totalPages = Math.ceil(totalBranches / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBranches = filteredBranches.slice(startIndex, endIndex);

    return NextResponse.json({
      branches: paginatedBranches,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalBranches,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      search: {
        term: search,
        hasSearch: search.trim().length > 0,
        totalMatches: totalBranches,
        totalBranches: allBranches.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch branches" },
      { status: 500 }
    );
  }
}
