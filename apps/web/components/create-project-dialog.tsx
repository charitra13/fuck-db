"use client"

import { useState } from "react"
import { motion } from "framer-motion"
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

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (project: Project) => void
}

export function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameLimit = 100
  const descriptionLimit = 500

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      setError(null)
      const created = await projectsApi.create({ name: name.trim(), description: description.trim() || undefined })
      setName("")
      setDescription("")
      onOpenChange(false)
      onCreated?.(created)
    } catch (e: unknown) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to create project'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
        >
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Add a new database schema project to your workspace</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Data Warehouse"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, nameLimit))}
              />
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {name.length}/{nameLimit}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your database project..."
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, descriptionLimit))}
                rows={4}
              />
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {description.length}/{descriptionLimit}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex-1 text-left">
              {error && <p className="text-sm text-destructive-foreground">{error}</p>}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || submitting}>
              {submitting ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
