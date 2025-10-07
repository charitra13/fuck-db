"use client"

import { 
  Database, 
  Plus, 
  History, 
  Settings,
  FolderTree,
  Search,
  GitCompare,
  FilePlus,
  TableIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SidebarToolbarProps {
  activeView: "explorer" | "history" | "settings"
  onViewChange: (view: "explorer" | "history" | "settings") => void
  onCreateTable: () => void
  className?: string
}

export function SidebarToolbar({
  activeView,
  onViewChange,
  onCreateTable,
  className
}: SidebarToolbarProps) {
  const tools = [
    {
      id: "explorer" as const,
      icon: FolderTree,
      label: "Explorer",
      shortcut: "⌘1"
    },
    {
      id: "history" as const,
      icon: History,
      label: "Version History",
      shortcut: "⌘2"
    },
    {
      id: "settings" as const,
      icon: Settings,
      label: "Settings",
      shortcut: "⌘3"
    }
  ]

  return (
    <div className={cn("border-b border-sidebar-border bg-sidebar", className)}>
      <div className="flex items-center justify-between p-1">
        <div className="flex items-center">
          <TooltipProvider>
            {/* New Table Button - Now on the left */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={onCreateTable}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div>
                  Create Table
                  <span className="ml-2 opacity-60">⌘N</span>
                </div>
              </TooltipContent>
            </Tooltip>
            
            {/* Divider */}
            <div className="mx-1 h-4 w-px bg-sidebar-border" />
            
            {/* View buttons */}
            {tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7",
                      activeView === tool.id 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    onClick={() => onViewChange(tool.id)}
                  >
                    <tool.icon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div>
                    {tool.label}
                    {tool.shortcut && (
                      <span className="ml-2 opacity-60">{tool.shortcut}</span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}