"use client"

import { useState } from "react"
import { 
  ChevronRight, 
  Save, 
  Undo, 
  Redo, 
  PlayCircle, 
  User, 
  LogOut,
  Settings,
  GitBranch,
  AlertCircle
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { authApi } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ExplorerNavbarProps {
  projectName: string
  currentVersion?: number | null
  versionName?: string | null
  isLatestVersion?: boolean
  hasUnsavedChanges?: boolean
  userName?: string
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export function ExplorerNavbar({
  projectName,
  currentVersion,
  versionName,
  isLatestVersion = true,
  hasUnsavedChanges = false,
  userName = "User",
  breadcrumbs = [],
  onSave,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ExplorerNavbarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const onLogout = async () => {
    try {
      await authApi.logout()
    } catch {}
    window.location.assign("/login")
  }

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left Section: Project Info & Breadcrumbs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{projectName}</span>
            
            {/* Version Badge */}
            {currentVersion && (
              <Badge 
                variant={isLatestVersion ? "default" : "secondary"}
                className="text-xs h-5"
              >
                <GitBranch className="h-3 w-3 mr-1" />
                v{currentVersion}
                {!isLatestVersion && (
                  <AlertCircle className="h-3 w-3 ml-1 text-yellow-500" />
                )}
              </Badge>
            )}
            
            {/* Unsaved Changes Indicator */}
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground">●</span>
            )}
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-1">
                    {index > 0 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    {crumb.onClick ? (
                      <button
                        onClick={crumb.onClick}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="text-sm text-foreground">
                        {crumb.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center Section: Quick Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={!hasUnsavedChanges}
            className="h-8"
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          
          <div className="flex items-center gap-0 mx-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-8 w-8"
              title="Undo (Cmd+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-8 w-8"
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            title="Run Query (Coming Soon)"
            disabled
          >
            <PlayCircle className="h-4 w-4 mr-1" />
            Run
          </Button>
        </div>

        {/* Right Section: User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary text-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  user@example.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive-foreground" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}