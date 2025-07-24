"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, GitCommit, Rocket, ChevronLeft, ChevronRight, Calendar, User, Search, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

export function CommitList({ selectedBranch, onDeploy, deployingCommit, onError }) {
  const [commits, setCommits] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    totalItems: 0,
  })
  const [searchInfo, setSearchInfo] = useState({
    hasSearch: false,
    totalMatches: 0,
    searchFields: [],
  })

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    if (selectedBranch) {
      setPagination((prev) => ({ ...prev, currentPage: 1 }))
      fetchCommits(selectedBranch, 1, debouncedSearchTerm)
    }
  }, [selectedBranch, debouncedSearchTerm])

  const fetchCommits = async (branch, page = 1, search = "") => {
    if (!branch) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        branch,
        page: page.toString(),
        limit: "10",
      })

      if (search.trim()) {
        params.append("search", search.trim())
      }

      const response = await fetch(`/api/commits?${params}`, {
        credentials: "include",
      })

      if (response.status === 401) {
        onError("Authentication required")
        return
      }

      const data = await response.json()
      setCommits(data.commits)
      setPagination(data.pagination)
      setSearchInfo(data.search)
    } catch (error) {
      onError("Failed to fetch commits")
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }))
    fetchCommits(selectedBranch, newPage, debouncedSearchTerm)
  }

  const clearSearch = () => {
    setSearchTerm("")
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!selectedBranch) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <GitCommit className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a branch to view commits</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCommit className="h-5 w-5" />
          Commits
          <Badge variant="outline">{selectedBranch}</Badge>
          {searchInfo.hasSearch ? (
            <Badge variant="secondary">{searchInfo.totalMatches} matches</Badge>
          ) : (
            pagination.totalItems > 0 && <Badge variant="secondary">{pagination.totalItems} commits</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {searchInfo.hasSearch
            ? `Showing commits matching "${searchInfo.term}" in ${selectedBranch}`
            : `Deploy any commit`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search commits by hash, message, or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results Info */}
        {searchInfo.hasSearch && (
          <div className="text-sm text-muted-foreground mb-4">
            Found {searchInfo.totalMatches} commits matching "{searchInfo.term}" in hash, message, and author
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading commits...</span>
          </div>
        ) : commits.length > 0 ? (
          <div className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {commits.map((commit) => (
                  <div key={commit.hash} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Commit Hash and Author */}
                        <div className="flex items-center gap-2 mb-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {commit.hash.substring(0, 7)}
                          </code>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{commit.author}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(commit.date)}</span>
                          </div>
                        </div>

                        {/* Commit Message */}
                        <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">{commit.message}</p>
                      </div>

                      {/* Deploy Button */}
                      <Button
                        onClick={() => onDeploy(commit)}
                        disabled={deployingCommit === commit.hash}
                        size="sm"
                        className="shrink-0"
                      >
                        {deployingCommit === commit.hash ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <Rocket className="h-4 w-4 mr-2" />
                            Deploy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <GitCommit className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              {searchInfo.hasSearch
                ? `No commits match "${searchInfo.term}" in this branch`
                : "No commits found for this branch"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
