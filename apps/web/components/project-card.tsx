"use client"

import { motion } from "framer-motion"
import { Database, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import type { Project } from "@/lib/api"

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const updated = project.updatedAt || project.createdAt
  return (
    <Link href={`/explorer/${project.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card className="group h-full border-border transition-all hover:border-foreground/20 hover:shadow-md">
          <CardHeader>
            <div className="mb-2 flex items-start justify-between">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary"
                whileHover={{ rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Database className="h-5 w-5" />
              </motion.div>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>
            <CardTitle className="text-balance group-hover:text-foreground">{project.name}</CardTitle>
            <CardDescription className="line-clamp-2 text-pretty leading-relaxed">
              {project.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Updated {new Date(updated || new Date().toISOString()).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}
