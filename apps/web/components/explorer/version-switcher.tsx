"use client"

import { useState, useEffect } from "react"
import { 
  Check, 
  Clock, 
  GitBranch, 
  Plus, 
  AlertTriangle,
  ChevronDown,
  Loader2,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { versionsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface Version {
  version: number
  name?: string
  description?: string
  is_latest?: boolean
  created_at: string
  metadata?: {
    table_count?: number
    author?: string
  }
}

interface VersionSwitcherProps {
  projectId: string
  currentVersion: number | null
  onVersionChange: (version: number) => Promise<void>
  onCreateVersion: () => void
  isModified?: boolean
  className?: string
}

export function VersionSwitcher({
  projectId,
  currentVersion,
  onVersionChange,
  onCreateVersion,
  isModified = false,
  className
}: VersionSwitcherProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const currentVersionData = versions.find(v => v.version === currentVersion)
  const latestVersion = versions.find(v => v.is_latest)
  const isLatest = currentVersionData?.is_latest ?? false
  const versionsBehind = latestVersion ? latestVersion.version - (currentVersion || 0) : 0

  useEffect(() => {
    if (isOpen) {
      loadVersions()
    }
  }, [projectId, isOpen])

  const loadVersions = async () => {
    try {
      setLoading(true)
      setError(null)
      const versionList = await versionsApi.list(projectId)
      // Sort versions by version number descending
      const sorted = (versionList || []).sort((a, b) => b.version - a.version)
      setVersions(sorted)
    } catch (err) {
      console.error('Failed to load versions:', err)
      setError('Failed to load versions')
    } finally {
      setLoading(false)
    }
  }

  const handleVersionSwitch = async (version: number) => {
    if (version === currentVersion) return
    
    try {
      setSwitching(true)
      await onVersionChange(version)
      setIsOpen(false)
    } catch (err) {
      console.error('Failed to switch version:', err)
    } finally {
      setSwitching(false)
    }
  }

  const getVersionLabel = () => {
    if (!currentVersion) return "No version"
    
    const label = `v${currentVersion}`
    const name = currentVersionData?.name ? ` - ${currentVersionData.name}` : ""
    return label + name
  }

  const getVersionStatus = () => {
    if (!currentVersion) return null
    
    if (!isLatest && versionsBehind > 0) {
      return (
        <AlertTriangle className="h-3 w-3 text-yellow-500" />
      )
    }
    
    if (isModified) {
      return <span className="h-2 w-2 rounded-full bg-blue-500" />
    }
    
    if (isLatest) {
      return <Check className="h-3 w-3 text-green-500" />
    }
    
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 justify-between gap-2 text-xs font-medium",
            className,
            !isLatest && "border-yellow-500/50"
          )}
          disabled={switching}
        >
          <div className="flex items-center gap-2">
            <GitBranch className="h-3 w-3" />
            <span className="truncate max-w-[150px]">
              {getVersionLabel()}
            </span>
            {getVersionStatus()}
          </div>
          {switching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ChevronDown className="h-3 w-3 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[320px]" align="start">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Version History</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.preventDefault()
              loadVersions()
            }}
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {loading && versions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
            Loading versions...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-destructive">
            {error}
          </div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No versions found
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="p-1">
              {versions.map((version) => {
                const isActive = version.version === currentVersion
                const timeAgo = formatDistanceToNow(new Date(version.created_at), { addSuffix: true })
                
                return (
                  <DropdownMenuItem
                    key={version.version}
                    onClick={() => handleVersionSwitch(version.version)}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 cursor-pointer",
                      isActive && "bg-accent"
                    )}
                    disabled={switching}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {isActive && <Check className="h-3 w-3 text-primary" />}
                        <span className="font-mono text-sm font-medium">
                          v{version.version}
                        </span>
                        {version.is_latest && (
                          <Badge variant="default" className="h-5 text-[10px] px-1">
                            LATEST
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{timeAgo}</span>
                      </div>
                    </div>
                    
                    {version.name && (
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {version.name}
                      </span>
                    )}
                    
                    {version.description && (
                      <span className="text-xs text-muted-foreground/70 truncate w-full">
                        {version.description}
                      </span>
                    )}
                    
                    {version.metadata?.table_count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {version.metadata.table_count} tables
                      </span>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        
        <div className="p-1">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              setIsOpen(false)
              onCreateVersion()
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Version</span>
          </DropdownMenuItem>
        </div>
        
        {!isLatest && versionsBehind > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                <span>You are {versionsBehind} version{versionsBehind > 1 ? 's' : ''} behind</span>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}