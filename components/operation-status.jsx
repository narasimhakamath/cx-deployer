"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle } from "lucide-react"

export function OperationStatus() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    checkOperationStatus()
    const interval = setInterval(checkOperationStatus, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const checkOperationStatus = async () => {
    try {
      const response = await fetch("/api/operation-status", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error checking operation status:", error)
    }
  }

  if (!status) return null

  const hasActiveOperations = status.pullCode.locked || status.deployment.locked

  if (!hasActiveOperations) return null

  return (
    <div className="space-y-2">
      {status.pullCode.locked && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Code Pull in Progress</strong> - {status.pullCode.lockedBy} is updating the repository
            </span>
            <Badge variant="secondary">Started {new Date(status.pullCode.lockedAt).toLocaleTimeString()}</Badge>
          </AlertDescription>
        </Alert>
      )}

      {status.deployment.locked && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Deployment in Progress</strong> - {status.deployment.lockedBy} is deploying changes
            </span>
            <Badge variant="secondary">Started {new Date(status.deployment.lockedAt).toLocaleTimeString()}</Badge>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
