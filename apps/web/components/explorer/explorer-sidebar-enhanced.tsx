"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, TableIcon, Database, Box, Layers, Package } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VersionSwitcher } from "./version-switcher"
import { SidebarToolbar } from "./sidebar-toolbar"
import { VersionHistory } from "../version-history"
import type { Project, Schema, Table } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ExplorerSidebarEnhancedProps {
  project: Project
  schemas: Record<string, Schema>
  onTableClick: (schemaName: string, tableName: string, table: Table) => void
  activeTableId: string | null
  currentVersion?: number | null
  versionRow?: { version: number; name?: string; description?: string } | null
  onCreateVersion: () => void
  onVersionChange: (version: number) => Promise<void>
  onCreateTable: () => void
  isRefreshing?: boolean
  hasUnsavedChanges?: boolean
}

// Table type icons
const TABLE_TYPE_ICONS = {
  fact: { icon: Database, color: "text-blue-500" },
  dimension: { icon: Box, color: "text-green-500" },
  bridge: { icon: Layers, color: "text-orange-500" },
  staging: { icon: Package, color: "text-gray-500" },
  default: { icon: TableIcon, color: "text-muted-foreground" }
}

export function ExplorerSidebarEnhanced({ 
  project, 
  schemas, 
  onTableClick, 
  activeTableId, 
  currentVersion, 
  versionRow, 
  onCreateVersion, 
  onVersionChange,
  onCreateTable,
  isRefreshing,
  hasUnsavedChanges = false
}: ExplorerSidebarEnhancedProps) {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(Object.keys(schemas)))
  const [activeView, setActiveView] = useState<"explorer" | "history" | "settings">("explorer")

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName)
    } else {
      newExpanded.add(schemaName)
    }
    setExpandedSchemas(newExpanded)
  }

  const getTableIcon = (type: string) => {
    const config = TABLE_TYPE_ICONS[type as keyof typeof TABLE_TYPE_ICONS] || TABLE_TYPE_ICONS.default
    const Icon = config.icon
    return <Icon className={cn("h-3 w-3", config.color)} />
  }

  const getTableTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (type) {
      case "fact": return "default"
      case "dimension": return "secondary"
      case "bridge": return "outline"
      default: return "outline"
    }
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Toolbar */}
      <SidebarToolbar
        activeView={activeView}
        onViewChange={setActiveView}
        onCreateTable={onCreateTable}
      />

      {/* Project Header with Version Switcher */}
      <div className="border-b border-sidebar-border p-4 space-y-3">
        <div className="space-y-1">
          <h2 className="font-semibold text-sidebar-foreground text-sm">{project.name}</h2>
          {project.description && (
            <p className="text-xs text-sidebar-foreground/60 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        
        <VersionSwitcher
          projectId={project.id}
          currentVersion={currentVersion || null}
          onVersionChange={onVersionChange}
          onCreateVersion={onCreateVersion}
          isModified={hasUnsavedChanges}
          className="w-full"
        />
      </div>

      {/* Content based on active view */}
      {activeView === "explorer" && (
        <ScrollArea className="flex-1">
          <div className="p-2">
            {Object.keys(schemas).length === 0 ? (
              <div className="p-4 text-center text-xs text-sidebar-foreground/60">
                <p>No schemas found</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  onClick={onCreateTable}
                >
                  Create your first table
                </Button>
              </div>
            ) : (
              Object.entries(schemas).map(([schemaKey, schema]) => {
                const isExpanded = expandedSchemas.has(schemaKey)

                return (
                  <div key={schemaKey} className="mb-2">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSchema(schemaKey)}
                      className="w-full justify-start gap-2 h-8 text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <span className="text-base">{schema.icon}</span>
                      <span className="text-xs font-medium">{schema.name}</span>
                      <span className="ml-auto text-xs text-sidebar-foreground/60">
                        {Object.keys(schema.tables).length}
                      </span>
                    </Button>

                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-0.5">
                        {Object.entries(schema.tables).map(([tableKey, table]) => {
                          const tableId = `${schemaKey}.${tableKey}`
                          const isActive = activeTableId === tableId

                          return (
                            <Button
                              key={tableKey}
                              variant="ghost"
                              onClick={() => onTableClick(schemaKey, tableKey, table)}
                              className={cn(
                                "w-full justify-start gap-2 h-7 pl-2 text-sidebar-foreground hover:bg-sidebar-accent",
                                isActive && "bg-sidebar-accent font-medium",
                              )}
                            >
                              {getTableIcon(table.type)}
                              <span className="flex-1 truncate text-left font-mono text-xs">
                                {table.name}
                              </span>
                              <Badge 
                                variant={getTableTypeBadgeVariant(table.type)} 
                                className="text-[9px] px-1 h-4"
                              >
                                {table.type.substring(0, 3).toUpperCase()}
                              </Badge>
                            </Button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      )}

      {activeView === "history" && (
        <ScrollArea className="flex-1">
          <VersionHistory
            projectId={project.id}
            currentVersion={currentVersion}
            onVersionSelect={onVersionChange}
          />
        </ScrollArea>
      )}

      {activeView === "settings" && (
        <ScrollArea className="flex-1">
          <div className="p-4 text-sm text-sidebar-foreground/60">
            <p>Settings panel coming soon...</p>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}