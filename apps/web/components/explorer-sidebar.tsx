"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, TableIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Project, Schema, Table } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ExplorerSidebarProps {
  project: Project
  schemas: Record<string, Schema>
  onTableClick: (schemaName: string, tableName: string, table: Table) => void
  activeTableId: string | null
  version?: number | null
  versionRow?: { version: number; name?: string; description?: string } | null
  onCreateVersion?: () => void
  isRefreshing?: boolean
}

export function ExplorerSidebar({ 
  project, 
  schemas, 
  onTableClick, 
  activeTableId, 
  version, 
  versionRow, 
  onCreateVersion, 
  isRefreshing 
}: ExplorerSidebarProps) {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(Object.keys(schemas)))

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName)
    } else {
      newExpanded.add(schemaName)
    }
    setExpandedSchemas(newExpanded)
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-sidebar-border p-4 space-y-2">
        <h2 className="font-semibold text-sidebar-foreground text-balance">{project.name}</h2>
        <p className="text-xs text-sidebar-foreground/60 line-clamp-2 text-pretty leading-relaxed">
          {project.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-sidebar-foreground/60">
              Version: {version ?? "—"}
            </span>
            {versionRow?.name && (
              <span className="text-[9px] text-sidebar-foreground/40 truncate max-w-[120px]">
                {versionRow.name}
              </span>
            )}
          </div>
          {onCreateVersion && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 px-2 text-[10px]" 
              onClick={onCreateVersion}
              disabled={isRefreshing}
            >
              New Version
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(schemas).map(([schemaKey, schema]) => {
            const isExpanded = expandedSchemas.has(schemaKey)

            return (
              <div key={schemaKey} className="mb-2">
                <Button
                  variant="ghost"
                  onClick={() => toggleSchema(schemaKey)}
                  className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-lg">{schema.icon}</span>
                  <span className="font-medium">{schema.name}</span>
                </Button>

                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {Object.entries(schema.tables).map(([tableKey, table]) => {
                      const tableId = `${schemaKey}.${tableKey}`
                      const isActive = activeTableId === tableId

                      return (
                        <Button
                          key={tableKey}
                          variant="ghost"
                          onClick={() => onTableClick(schemaKey, tableKey, table)}
                          className={cn(
                            "w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent",
                            isActive && "bg-sidebar-accent",
                          )}
                        >
                          <TableIcon className="h-3 w-3" />
                          <span className="flex-1 truncate text-left font-mono text-xs">{table.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {table.type}
                          </Badge>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
