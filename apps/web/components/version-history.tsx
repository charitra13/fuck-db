"use client"

import { useState, useEffect } from "react"
import { versionsApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, Check } from "lucide-react"

interface VersionHistoryProps {
  projectId: string
  currentVersion?: number | null
  onVersionSelect?: (version: number) => void
}

export function VersionHistory({ projectId, currentVersion, onVersionSelect }: VersionHistoryProps) {
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const versionList = await versionsApi.list(projectId)
        setVersions(versionList)
      } catch (error) {
        console.error('Failed to load versions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVersions()
  }, [projectId])

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading versions...</div>
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-3">Version History</h3>
      <ScrollArea className="h-48">
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.version}
              className={`p-2 rounded border cursor-pointer transition-colors ${
                version.version === currentVersion
                  ? 'bg-accent border-accent-foreground/20'
                  : 'hover:bg-muted'
              }`}
              onClick={() => onVersionSelect?.(version.version)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">v{version.version}</span>
                  {version.is_latest && (
                    <Badge variant="secondary" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Latest
                    </Badge>
                  )}
                </div>
                <Clock className="h-3 w-3 text-muted-foreground" />
              </div>
              {version.name && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {version.name}
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
