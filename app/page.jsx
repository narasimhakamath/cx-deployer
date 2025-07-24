"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  RefreshCw,
  GitBranch,
  GitCommit,
  Rocket,
  CheckCircle,
  Clock,
  AlertCircle,
  LogOut,
  User,
  Info,
  History,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DeploymentProgress } from "@/components/deployment-progress"
import { BranchSelector } from "@/components/branch-selector"
import { CommitList } from "@/components/commit-list"
import { OperationStatus } from "@/components/operation-status"
import Link from "next/link"

export default function DeploymentManager() {
  const [user, setUser] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState("")
  const [currentDeployment, setCurrentDeployment] = useState(null)
  const [hasDeployment, setHasDeployment] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deployingCommit, setDeployingCommit] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showDeploymentProgress, setShowDeploymentProgress] = useState(false)
  const [currentDeploymentId, setCurrentDeploymentId] = useState(null)

  const { toast } = useToast()
  const router = useRouter()

  // Check authentication on component mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Fetch data when authenticated
  useEffect(() => {
    if (user) {
      fetchCurrentDeployment()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      console.log("Checking authentication...")
      const response = await fetch("/cx-deployer/api/auth/me", {
        credentials: "include",
      })

      console.log("Auth response status:", response.status)

      if (response.ok) {
        const userData = await response.json()
        console.log("User data received:", userData)
        setUser(userData)
      } else {
        console.log("Auth failed, redirecting to login")
        router.push("/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/cx-deployer/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const fetchCurrentDeployment = async () => {
    try {
      const response = await fetch("/cx-deployer/api/current-deployment", {
        credentials: "include",
      })
      if (response.status === 401) {
        router.push("/login")
        return
      }
      const data = await response.json()
      setHasDeployment(data.hasDeployment)
      setCurrentDeployment(data.hasDeployment ? data : null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch current deployment status",
        variant: "destructive",
      })
    }
  }

  const pullLatestCode = async () => {
    setLoading(true)
    try {
      const response = await fetch("/cx-deployer/api/pull-code", {
        method: "POST",
        credentials: "include",
      })

      if (response.status === 401) {
        router.push("/login")
        return
      }

      if (response.status === 423) {
        // Operation locked
        const data = await response.json()
        toast({
          title: "Operation in Progress",
          description: data.error,
          variant: "destructive",
        })
        return
      }

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `${data.message}. Updated ${data.statistics.totalBranches} branches in ${data.statistics.duration}.`,
        })
        // Refresh the page to get updated branches and commits
        window.location.reload()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pull latest code",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deployCommit = async (commit) => {
    setDeployingCommit(commit.hash)
    try {
      const response = await fetch("/cx-deployer/api/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          branch: selectedBranch,
          commit: commit.hash,
          message: commit.message,
          author: commit.author,
        }),
      })

      if (response.status === 401) {
        router.push("/login")
        return
      }

      if (response.status === 423) {
        // Operation locked
        const data = await response.json()
        toast({
          title: "Operation in Progress",
          description: data.error,
          variant: "destructive",
        })
        return
      }

      const data = await response.json()

      if (response.ok) {
        setCurrentDeploymentId(data.deploymentId)
        setShowDeploymentProgress(true)
        toast({
          title: "Deployment Started",
          description: `Deploying commit ${commit.hash.substring(0, 7)} from ${selectedBranch}`,
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Deployment Failed",
        description: "Failed to start deployment",
        variant: "destructive",
      })
    } finally {
      setDeployingCommit(null)
    }
  }

  const handleError = (message) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    })
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
      {/* Deployment Progress Modal */}
      {showDeploymentProgress && currentDeploymentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <DeploymentProgress
            deploymentId={currentDeploymentId}
            onClose={() => {
              setShowDeploymentProgress(false)
              setCurrentDeploymentId(null)
              fetchCurrentDeployment() // Refresh current deployment status
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployment Manager</h1>
          <p className="text-muted-foreground">Manage your Angular frontend deployments</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">{user.name}</span>
            <Badge variant="secondary">{user.email}</Badge>
          </div>
          <Link href="/deployments">
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          </Link>
          <Button onClick={pullLatestCode} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Pull Latest Code
          </Button>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Operation Status */}
      <OperationStatus />

      {/* Current Deployment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Current Deployment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasDeployment && currentDeployment ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-medium">Branch:</span>
                  <Badge variant="secondary">{currentDeployment.branch}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <GitCommit className="h-4 w-4" />
                  <span className="font-medium">Commit:</span>
                  <code className="bg-muted px-2 py-1 rounded text-sm">{currentDeployment.commit}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Message:</span>
                  <span className="text-sm text-muted-foreground">{currentDeployment.message}</span>
                </div>
                {currentDeployment.deployedBy && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Deployed by:</span>
                    <span className="text-sm text-muted-foreground">
                      {currentDeployment.deployedBy.name} ({currentDeployment.deployedBy.email})
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Deployed:</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(currentDeployment.deployedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(currentDeployment.status)}
                <Badge className={getStatusColor(currentDeployment.status)}>
                  {currentDeployment.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No deployments have been made yet. Select a branch and commit below to create your first deployment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Branch Selection and Commits */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <BranchSelector selectedBranch={selectedBranch} onBranchSelect={setSelectedBranch} onError={handleError} />
        </div>

        <div className="lg:col-span-3">
          <CommitList
            selectedBranch={selectedBranch}
            onDeploy={deployCommit}
            deployingCommit={deployingCommit}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  )
}
