"use client"

import { useMemo, useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { Schema } from "@/lib/api"
import { tablesApi } from "@/lib/api"

interface ColumnDraft {
  name: string
  type: string
  isPK?: boolean
  isFK?: boolean
  isNullable?: boolean
  description?: string
}

interface CreateTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  version: number
  schemas: Record<string, Schema>
  onCreated?: () => void
}

export function CreateTableDialog({ open, onOpenChange, projectId, version, schemas, onCreated }: CreateTableDialogProps) {
  const schemaNames = useMemo(() => Object.keys(schemas), [schemas])
  const [schemaName, setSchemaName] = useState(schemaNames[0] || "public")
  const [tableName, setTableName] = useState("")
  const [tableType, setTableType] = useState("dimension")
  const [description, setDescription] = useState("")
  const [columns, setColumns] = useState<ColumnDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addColumn = () => setColumns((prev) => [...prev, { name: "", type: "text", isNullable: true }])
  const updateColumn = (idx: number, patch: Partial<ColumnDraft>) =>
    setColumns((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  const removeColumn = (idx: number) => setColumns((prev) => prev.filter((_, i) => i !== idx))

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      setError(null)
      const payload = {
        name: tableName.trim(),
        schema_name: schemaName,
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
      await tablesApi.create(projectId, version, payload)
      onOpenChange(false)
      onCreated?.()
      setTableName("")
      setDescription("")
      setColumns([])
    } catch (e) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to create table'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create Table</DialogTitle>
          <DialogDescription>Add a new table to the selected schema</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Schema</Label>
              <Select value={schemaName} onValueChange={setSchemaName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select schema" />
                </SelectTrigger>
                <SelectContent>
                  {schemaNames.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Table name</Label>
              <Input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="Dim_Customer" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={tableType} onValueChange={setTableType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fact">fact</SelectItem>
                  <SelectItem value="dimension">dimension</SelectItem>
                  <SelectItem value="bridge">bridge</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
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
          <Button onClick={handleCreate} disabled={!schemaName || !tableName.trim() || submitting}>
            {submitting ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}