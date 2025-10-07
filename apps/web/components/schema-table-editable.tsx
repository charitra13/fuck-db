"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Key, LinkIcon, Plus, Trash2 } from "lucide-react"
import { InlineEdit } from "@/components/ui/inline-edit"
import { InlineSelect, DATA_TYPES, CONSTRAINTS } from "@/components/ui/inline-select"
import { Checkbox } from "@/components/ui/checkbox"
import type { Table as TableType, Column } from "@/lib/api"
import { tablesApi } from "@/lib/api"
import { cn } from "@/lib/utils"

interface SchemaTableEditableProps {
  table: TableType
  projectId: string
  version: number
  schemaName: string
  onColumnClick?: (column: Column, tableName: string) => void
  onUpdate: () => void
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
}

const row = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

const MotionTableBody = motion(TableBody)

export function SchemaTableEditable({ 
  table, 
  projectId,
  version,
  schemaName,
  onColumnClick,
  onUpdate 
}: SchemaTableEditableProps) {
  const [localTable, setLocalTable] = useState(table)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  const handleTableNameChange = async (newName: string) => {
    setIsSaving("table-name")
    try {
      // TODO: Call API to update table name
      console.log("Update table name:", newName)
      setLocalTable({ ...localTable, name: newName })
      onUpdate()
    } catch (error) {
      console.error("Failed to update table name:", error)
    } finally {
      setIsSaving(null)
    }
  }

  const handleTableDescriptionChange = async (newDescription: string) => {
    setIsSaving("table-desc")
    try {
      // TODO: Call API to update table description
      console.log("Update table description:", newDescription)
      setLocalTable({ ...localTable, description: newDescription })
      onUpdate()
    } catch (error) {
      console.error("Failed to update table description:", error)
    } finally {
      setIsSaving(null)
    }
  }

  const handleTableTypeChange = async (newType: string) => {
    setIsSaving("table-type")
    try {
      // TODO: Call API to update table type
      console.log("Update table type:", newType)
      setLocalTable({ ...localTable, type: newType })
      onUpdate()
    } catch (error) {
      console.error("Failed to update table type:", error)
    } finally {
      setIsSaving(null)
    }
  }

  const handleColumnChange = async (
    columnIndex: number, 
    field: keyof Column, 
    value: any
  ) => {
    const fieldId = `col-${columnIndex}-${field}`
    setIsSaving(fieldId)
    try {
      // TODO: Call API to update column
      console.log(`Update column ${columnIndex} ${field}:`, value)
      const updatedColumns = [...localTable.columns]
      updatedColumns[columnIndex] = {
        ...updatedColumns[columnIndex],
        [field]: value
      }
      setLocalTable({ ...localTable, columns: updatedColumns })
      onUpdate()
    } catch (error) {
      console.error("Failed to update column:", error)
    } finally {
      setIsSaving(null)
    }
  }

  const handleAddColumn = () => {
    const newColumn: Column = {
      name: `column_${localTable.columns.length + 1}`,
      type: "varchar",
      isPK: false,
      isFK: false,
      isNullable: true,
      description: ""
    }
    setLocalTable({ 
      ...localTable, 
      columns: [...localTable.columns, newColumn] 
    })
  }

  const handleDeleteColumn = async (index: number) => {
    const column = localTable.columns[index]
    if (window.confirm(`Delete column "${column.name}"?`)) {
      setIsSaving(`col-${index}-delete`)
      try {
        // Call API to delete column
        await tablesApi.deleteColumn(
          projectId,
          version,
          localTable.name,
          column.name,
          schemaName
        )
        
        // Update local state
        const updatedColumns = localTable.columns.filter((_, i) => i !== index)
        setLocalTable({ ...localTable, columns: updatedColumns })
        onUpdate()
      } catch (error) {
        console.error("Failed to delete column:", error)
        alert("Failed to delete column. Please try again.")
      } finally {
        setIsSaving(null)
      }
    }
  }

  const getConstraintValue = (column: Column): string => {
    if (column.isPK) return "PK"
    if (column.isFK) return "FK"
    if (!column.isNullable) return "NOT_NULL"
    return ""
  }

  const handleConstraintChange = async (columnIndex: number, constraint: string) => {
    const column = localTable.columns[columnIndex]
    const updates: Partial<Column> = {
      isPK: constraint === "PK",
      isFK: constraint === "FK",
      isNullable: constraint !== "NOT_NULL" && constraint !== "PK"
    }
    
    await handleColumnChange(columnIndex, "isPK", updates.isPK)
    await handleColumnChange(columnIndex, "isFK", updates.isFK)
    await handleColumnChange(columnIndex, "isNullable", updates.isNullable)
  }

  const TABLE_TYPES = [
    { label: "Dimension", value: "dimension" },
    { label: "Fact", value: "fact" },
    { label: "Bridge", value: "bridge" },
    { label: "Staging", value: "staging" },
  ]

  return (
    <div className="flex h-full flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-b border-border p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-mono text-xl font-bold">
            <InlineEdit
              value={localTable.name}
              onSave={handleTableNameChange}
              placeholder="Table name"
              disabled={isSaving === "table-name"}
            />
          </h2>
          <InlineSelect
            value={localTable.type}
            options={TABLE_TYPES}
            onSave={handleTableTypeChange}
            placeholder="Type"
            disabled={isSaving === "table-type"}
            searchable={false}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          <InlineEdit
            value={localTable.description || ""}
            onSave={handleTableDescriptionChange}
            placeholder="Add table description..."
            disabled={isSaving === "table-desc"}
          />
        </div>
      </motion.div>

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Column Name</TableHead>
              <TableHead>Data Type</TableHead>
              <TableHead>Constraints</TableHead>
              <TableHead>Nullable</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <MotionTableBody variants={container} initial="hidden" animate="show">
            {localTable.columns.map((column, index) => (
              <motion.tr
                key={index}
                variants={row}
                onClick={(e) => {
                  // Only trigger column click if not clicking on an editable element
                  const target = e.target as HTMLElement
                  if (!target.closest('[data-editable]') && onColumnClick) {
                    onColumnClick(column, localTable.name)
                  }
                }}
                className="group border-b border-border transition-colors hover:bg-muted/50"
              >
                <TableCell>
                  {column.isPK && <Key className="h-4 w-4 text-foreground" />}
                  {column.isFK && <LinkIcon className="h-4 w-4 text-muted-foreground" />}
                </TableCell>
                <TableCell className="font-mono font-medium">
                  <div data-editable>
                    <InlineEdit
                      value={column.name}
                      onSave={(value) => handleColumnChange(index, "name", value)}
                      placeholder="column_name"
                      disabled={isSaving === `col-${index}-name`}
                    />
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  <div data-editable>
                    <InlineSelect
                      value={column.type}
                      options={DATA_TYPES}
                      onSave={(value) => handleColumnChange(index, "type", value)}
                      placeholder="Select type"
                      disabled={isSaving === `col-${index}-type`}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div data-editable>
                    <InlineSelect
                      value={getConstraintValue(column)}
                      options={CONSTRAINTS}
                      onSave={(value) => handleConstraintChange(index, value)}
                      placeholder="None"
                      disabled={isSaving?.startsWith(`col-${index}-`)}
                      searchable={false}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div data-editable className="flex items-center">
                    <Checkbox
                      checked={column.isNullable}
                      onCheckedChange={(checked) => 
                        handleColumnChange(index, "isNullable", checked)
                      }
                      disabled={column.isPK || isSaving === `col-${index}-isNullable`}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div data-editable>
                    <InlineEdit
                      value={column.description || ""}
                      onSave={(value) => handleColumnChange(index, "description", value)}
                      placeholder="Add description..."
                      disabled={isSaving === `col-${index}-description`}
                      className="text-muted-foreground"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div data-editable>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-50 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteColumn(index)
                      }}
                      title="Delete column"
                      disabled={isSaving === `col-${index}-delete` || localTable.columns.length === 1}
                    >
                      {isSaving === `col-${index}-delete` ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
            {/* Add Column Row */}
            <motion.tr
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-b border-border hover:bg-muted/30 transition-colors"
            >
              <TableCell colSpan={7} className="text-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddColumn}
                  className="w-full h-8 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </TableCell>
            </motion.tr>
          </MotionTableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
