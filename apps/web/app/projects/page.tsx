"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { ProjectCard } from "@/components/project-card"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { EditProjectDialog } from "@/components/edit-project-dialog"
import { DeleteProjectDialog } from "@/components/delete-project-dialog"
import { projectsApi, type Project } from "@/lib/api"
import { Search, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const list = await projectsApi.list(200, 0)
        if (mounted) setProjects(list)
      } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to load projects'
        if (mounted) setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        (project.description || "").toLowerCase().includes(q),
    )
  }, [projects, searchQuery])

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName="John Doe" />

      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="mb-2 text-3xl font-bold text-balance">Projects</h1>
          <p className="text-muted-foreground">Manage your database schema projects</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredProjects.map((project) => (
            <motion.div key={project.id} variants={item}>
              <div className="relative">
                <div className="absolute right-3 top-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => setEditing(project)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive-foreground" onClick={() => setDeleting(project)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ProjectCard project={project} />
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">Loading projects...</div>
          )}
          {error && !loading && (
            <div className="col-span-full py-12 text-center text-sm text-destructive-foreground">{error}</div>
          )}
        </motion.div>

        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-[400px] items-center justify-center"
          >
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">No projects found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search query</p>
            </div>
          </motion.div>
        )}
      </main>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(p) => setProjects((prev) => [p, ...prev])}
      />

      <EditProjectDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        project={editing}
        onUpdated={(p) => setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)))}
      />

      <DeleteProjectDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        project={deleting}
        onDeleted={(id) => setProjects((prev) => prev.filter((x) => x.id !== id))}
      />
    </div>
  )
}
