"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RefreshCw,
  GitBranch,
  GitCommit,
  Rocket,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Filter,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import Link from "next/link"

export default function DeploymentsPage() {
  const [user, setUser] = useState(null)
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("")
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    totalItems: 0,
  })
  const [statistics, setStatistics] = useState({
    total: 0,
    deployed: 0,
    failed: 0,
    deploying: 0,
    building: 0,
    "updating-code": 0,
  })

  const { toast } = useToast()
  const router = useRouter()

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Check authentication on component mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Fetch deployments when filters change
  useEffect(() => {
    if (user) {
      fetchDeployments(1)
    }
  }, [user, debouncedSearchTerm, statusFilter, branchFilter])

  const checkAuth = async () => {
    try {
      const response = await fetch("/cxdeployer/api/auth/me", {
        credentials: "include",
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        router.push("/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchDeployments = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })

      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      if (branchFilter.trim()) {
        params.append("branch", branchFilter.trim())
      }

      if (debouncedSearchTerm.trim()) {
        params.append("search", debouncedSearchTerm.trim())
      }

      const response = await fetch(`/cxdeployer/api/deployments?${params}`, {
        credentials: "include",
      })

      if (response.status === 401) {
        router.push("/login")
        return
      }

      const data = await response.json()
      setDeployments(data.deployments)
      setPagination(data.pagination)
      setStatistics(data.statistics)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch deployments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage) => {
    fetchDeployments(newPage)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setBranchFilter("")
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "deployed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "deploying":
      case "building":
      case "updating-code":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <GitCommit className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "deployed":
        return "bg-green-100 text-green-800"
      case "deploying":
      case "building":
      case "updating-code":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {/* Back to Dashboard */}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Deployment History</h1>
            <p className="text-muted-foreground">View and manage all deployment records</p>
          </div>
        </div>
        <Button onClick={() => fetchDeployments(pagination.currentPage)} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{statistics.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{statistics.deployed}</div>
            <p className="text-xs text-muted-foreground">Deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{statistics.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{statistics.deploying}</div>
            <p className="text-xs text-muted-foreground">Deploying</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{statistics.building}</div>
            <p className="text-xs text-muted-foreground">Building</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{statistics["updating-code"]}</div>
            <p className="text-xs text-muted-foreground">Updating</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search commits, messages, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="deployed">Deployed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="deploying">Deploying</SelectItem>
                <SelectItem value="building">Building</SelectItem>
                <SelectItem value="updating-code">Updating Code</SelectItem>
              </SelectContent>
            </Select>

            {/* Branch Filter */}
            <Input
              placeholder="Filter by branch..."
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            />

            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deployments List */}
      <Card>
        <CardHeader>
          <CardTitle>Deployments</CardTitle>
          <CardDescription>
            {pagination.totalItems > 0
              ? `Showing ${deployments.length} of ${pagination.totalItems} deployments`
              : "No deployments found"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading deployments...</span>
            </div>
          ) : deployments.length > 0 ? (
            <div className="space-y-4">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {deployments.map((deployment) => (
                    <div key={deployment._id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Status and Branch */}
                          <div className="flex items-center gap-2">
                            {getStatusIcon(deployment.status)}
                            <Badge className={getStatusColor(deployment.status)}>
                              {deployment.status.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              <Badge variant="outline">{deployment.branch}</Badge>
                            </div>
                          </div>

                          {/* Commit and Message */}
                          <div className="flex items-center gap-2">
                            <GitCommit className="h-4 w-4" />
                            <code className="bg-muted px-2 py-1 rounded text-sm">
                              {deployment.commit?.substring(0, 7)}
                            </code>
                            <span className="text-sm text-muted-foreground truncate">{deployment.message}</span>
                          </div>

                          {/* User and Date */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{deployment.deployedBy?.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(deployment.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {deployment.status === "deployed" && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
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
              <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deployments found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
