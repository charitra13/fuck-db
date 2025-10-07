"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { projectsApi, type Project } from "@/lib/api"
import { Database, Clock, FolderOpen } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await projectsApi.list(3, 0)
        if (mounted) setProjects(list)
      } catch {
        // ignore for dashboard preview
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName="User" />

      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="mb-2 text-3xl font-bold text-balance">Welcome back</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your database projects</p>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2">
          <motion.div variants={item}>
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Your Projects</CardTitle>
                  </div>
                  <Link href="/projects">
                    <Button variant="ghost" size="sm">
                      View all
                    </Button>
                  </Link>
                </div>
                <CardDescription>Active database schema projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {projects.length === 0 && !loading && (
                  <div className="text-sm text-muted-foreground">No projects yet</div>
                )}
                {projects.map((project) => (
                  <Link key={project.id} href={`/explorer/${project.id}`}>
                    <div className="group flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3 transition-colors hover:bg-muted">
                      <Database className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none group-hover:text-foreground">{project.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Recent Activity</CardTitle>
                </div>
                <CardDescription>Latest changes across your projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">No activity to display</div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
