"use client"

import { motion } from "framer-motion"
import { Database, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-6 flex justify-center">
          <Database className="h-16 w-16 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-6xl font-bold font-mono">404</h1>
        <h2 className="mb-4 text-2xl font-semibold">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/dashboard">
          <Button size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
