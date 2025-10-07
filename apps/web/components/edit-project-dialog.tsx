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
import { projectsApi, type Project } from "@/lib/api"

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onUpdated?: (project: Project) => void
}

export function EditProjectDialog({ open, onOpenChange, project, onUpdated }: EditProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(project?.name ?? "")
    setDescription(project?.description ?? "")
  }, [project])

  const handleSave = async () => {
    if (!project) return
    try {
      setSubmitting(true)
      setError(null)
      const updated = await projectsApi.update(project.id, { name: name.trim(), description: description.trim() })
      onUpdated?.(updated)
      onOpenChange(false)
    } catch (e) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to update project'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>Update the project name and description</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
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