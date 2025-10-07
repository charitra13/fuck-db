"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Column } from "@/lib/api"
import { Database, Type, Key, LinkIcon, AlertCircle } from "lucide-react"

interface ColumnPropertiesProps {
  selectedColumn: { column: Column; tableName: string } | null
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const item = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
}

export function ColumnProperties({ selectedColumn }: ColumnPropertiesProps) {
  if (!selectedColumn) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full items-center justify-center p-6"
      >
        <div className="text-center">
          <Database className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a column to view properties</p>
        </div>
      </motion.div>
    )
  }

  const { column, tableName } = selectedColumn

  return (
    <div className="flex h-full flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border p-4"
      >
        <h2 className="font-semibold">Column Properties</h2>
      </motion.div>

      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={column.name}
            variants={container}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="space-y-4 p-4"
          >
            <motion.div variants={item}>
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Column Name</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-lg font-semibold">{column.name}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium text-muted-foreground">Data Type</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="font-mono">
                    {column.type}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Constraints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Primary Key</span>
                    </div>
                    <Badge variant={column.isPK ? "default" : "outline"}>{column.isPK ? "Yes" : "No"}</Badge>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Foreign Key</span>
                    </div>
                    <Badge variant={column.isFK ? "default" : "outline"}>{column.isFK ? "Yes" : "No"}</Badge>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Nullable</span>
                    </div>
                    <Badge variant={column.isNullable ? "default" : "outline"}>
                      {column.isNullable ? "Yes" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {column.description && (
              <motion.div variants={item}>
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-pretty">{column.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div variants={item}>
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-sm">{tableName}</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  )
}
