"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { tablesApi } from "@/lib/api"
import { useState } from "react"

interface DeleteTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  version: number
  schemaName: string
  tableName: string | null
  onDeleted?: () => void
}

export function DeleteTableDialog({ open, onOpenChange, projectId, version, schemaName, tableName, onDeleted }: DeleteTableDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!tableName) return
    try {
      setSubmitting(true)
      setError(null)
      await tablesApi.remove(projectId, version, tableName, schemaName)
      onOpenChange(false)
      onDeleted?.()
    } catch (e) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to delete table'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Table</DialogTitle>
          <DialogDescription>
            This will permanently delete the table &quot;{tableName}&quot;.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex-1 text-left">{error && <p className="text-sm text-destructive-foreground">{error}</p>}</div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
            {submitting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}