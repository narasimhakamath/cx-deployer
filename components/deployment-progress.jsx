"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, Clock, AlertCircle, RefreshCw, X, User, GitCommit } from "lucide-react"

export function DeploymentProgress({ deploymentId, onClose }) {
  const [deployment, setDeployment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (deploymentId) {
      fetchDeploymentStatus()
      const interval = setInterval(fetchDeploymentStatus, 2000) // Poll every 2 seconds
      return () => clearInterval(interval)
    }
  }, [deploymentId])

  const fetchDeploymentStatus = async () => {
    try {
      const response = await fetch(`/api/deployment-status/${deploymentId}`)
      if (response.ok) {
        const data = await response.json()
        setDeployment(data)

        // Stop polling if deployment is complete or failed
        if (data.status === "deployed" || data.status === "failed") {
          setLoading(false)
        }
      }
    } catch (error) {
      console.error("Error fetching deployment status:", error)
    }
  }

  const getStepStatus = (step) => {
    if (!deployment?.steps?.[step]) return "pending"
    return deployment.steps[step].status
  }

  const getStepIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getProgressValue = () => {
    if (!deployment) return 0

    const steps = ["checkout", "build", "deploy"]
    const completedSteps = steps.filter((step) => getStepStatus(step) === "completed").length
    const runningSteps = steps.filter((step) => getStepStatus(step) === "running").length

    return ((completedSteps + runningSteps * 0.5) / steps.length) * 100
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "deployed":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "deploying":
      case "building":
      case "updating-code":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!deployment) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading deployment status...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Deployment Progress
          </CardTitle>
          <CardDescription>
            Deploying commit {deployment.commit?.substring(0, 7)} from {deployment.branch}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deployment Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm">
              Deployed by <strong>{deployment.deployedBy?.name}</strong>
            </span>
          </div>
          <Badge className={getStatusColor(deployment.status)}>{deployment.status.toUpperCase()}</Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(getProgressValue())}%</span>
          </div>
          <Progress value={getProgressValue()} className="w-full" />
        </div>

        {/* Deployment Steps */}
        <div className="space-y-3">
          <h4 className="font-medium">Deployment Steps</h4>

          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
              {getStepIcon(getStepStatus("checkout"))}
              <span className="flex-1">Code Checkout & Update</span>
              <Badge variant="outline" className="text-xs">
                {getStepStatus("checkout")}
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
              {getStepIcon(getStepStatus("build"))}
              <span className="flex-1">Docker Image Build</span>
              <Badge variant="outline" className="text-xs">
                {getStepStatus("build")}
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
              {getStepIcon(getStepStatus("deploy"))}
              <span className="flex-1">Kubernetes Deployment</span>
              <Badge variant="outline" className="text-xs">
                {getStepStatus("deploy")}
              </Badge>
            </div>
          </div>
        </div>

        {/* Deployment Logs */}
        <div className="space-y-2">
          <h4 className="font-medium">Deployment Logs</h4>
          <ScrollArea className="h-32 w-full rounded-md border p-3">
            <div className="space-y-1">
              {deployment.logs?.map((log, index) => (
                <div key={index} className="text-xs font-mono text-gray-600">
                  {log}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Docker & Kubernetes Info */}
        {deployment.dockerInfo && (
          <div className="text-xs text-gray-500">
            <strong>Docker Image:</strong> {deployment.dockerInfo.imageTag}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
