"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { Table, Column } from "@/lib/api"
import { tablesApi } from "@/lib/api"

interface ColumnDraft {
  name: string
  type: string
  isPK?: boolean
  isFK?: boolean
  isNullable?: boolean
  description?: string
}

function toDraftColumns(cols: Column[]): ColumnDraft[] {
  return cols.map((c) => ({
    name: c.name,
    type: c.type,
    isPK: c.isPK,
    isFK: c.isFK,
    isNullable: c.isNullable,
    description: c.description,
  }))
}

interface EditTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  version: number
  schemaName: string
  table: Table | null
  onUpdated?: () => void
}

export function EditTableDialog({ open, onOpenChange, projectId, version, schemaName: _schemaName, table, onUpdated }: EditTableDialogProps) {
  const [name, setName] = useState("")
  const [tableType, setTableType] = useState("dimension")
  const [description, setDescription] = useState("")
  const [columns, setColumns] = useState<ColumnDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(table?.name ?? "")
    setTableType((table?.type as string) ?? "dimension")
    setDescription(table?.description ?? "")
    setColumns(table ? toDraftColumns(table.columns) : [])
  }, [table])

  const updateColumn = (idx: number, patch: Partial<ColumnDraft>) => setColumns((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  const addColumn = () => setColumns((prev) => [...prev, { name: "", type: "text", isNullable: true }])
  const removeColumn = (idx: number) => setColumns((prev) => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!table) return
    try {
      setSubmitting(true)
      setError(null)
      const payload = {
        name: name.trim(),
        table_type: tableType,
        description: description.trim() || undefined,
        columns: columns.map((c) => ({
          name: c.name.trim(),
          data_type: c.type.trim(),
          key: c.isPK ? "PRIMARY" : c.isFK ? "FOREIGN" : undefined,
          nullable: c.isNullable !== false,
          description: c.description?.trim() || undefined,
        })),
      }
      await tablesApi.patch(projectId, version, table.name, payload)
      onOpenChange(false)
      onUpdated?.()
    } catch (e) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to update table'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Edit Table</DialogTitle>
          <DialogDescription>Update the table and its columns</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Table name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={tableType} onChange={(e) => setTableType(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Columns</Label>
              <Button size="sm" variant="outline" onClick={addColumn}>
                Add Column
              </Button>
            </div>
            <div className="space-y-3">
              {columns.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <Input value={c.name} onChange={(e) => updateColumn(i, { name: e.target.value })} placeholder="name" />
                  </div>
                  <div className="col-span-3">
                    <Input value={c.type} onChange={(e) => updateColumn(i, { type: e.target.value })} placeholder="varchar(255)" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Checkbox checked={!!c.isPK} onCheckedChange={(v) => updateColumn(i, { isPK: v === true, isFK: v === true ? false : c.isFK })} />
                    <span className="text-xs">PK</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Checkbox checked={!!c.isFK} onCheckedChange={(v) => updateColumn(i, { isFK: v === true, isPK: v === true ? false : c.isPK })} />
                    <span className="text-xs">FK</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Checkbox checked={c.isNullable !== false} onCheckedChange={(v) => updateColumn(i, { isNullable: v === true })} />
                    <span className="text-xs">Nullable</span>
                  </div>
                  <div className="col-span-9">
                    <Textarea value={c.description || ""} onChange={(e) => updateColumn(i, { description: e.target.value })} placeholder="Description" rows={2} />
                  </div>
                  <div className="col-span-3 flex items-end justify-end">
                    <Button size="sm" variant="destructive" onClick={() => removeColumn(i)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex-1 text-left">{error && <p className="text-sm text-destructive-foreground">{error}</p>}</div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}