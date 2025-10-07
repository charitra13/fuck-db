"use client"

import { motion } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Key, LinkIcon } from "lucide-react"
import type { Table as TableType, Column } from "@/lib/api"

interface SchemaTableProps {
  table: TableType
  onColumnClick: (column: Column, tableName: string) => void
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
}

const row = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

const MotionTableBody = motion(TableBody)

export function SchemaTable({ table, onColumnClick }: SchemaTableProps) {
  return (
    <div className="flex h-full flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-b border-border p-4"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-xl font-bold">{table.name}</h2>
            <Badge variant="secondary">{table.type}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Consumers can overlay real actions with absolute positioned elements if needed */}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{table.description}</p>
      </motion.div>

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Column Name</TableHead>
              <TableHead>Data Type</TableHead>
              <TableHead>Constraints</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <MotionTableBody variants={container} initial="hidden" animate="show">
            {table.columns.map((column, index) => (
              <motion.tr
                key={index}
                variants={row}
                onClick={() => onColumnClick(column, table.name)}
                className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
              >
                <TableCell>
                  {column.isPK && <Key className="h-4 w-4 text-foreground" />}
                  {column.isFK && <LinkIcon className="h-4 w-4 text-muted-foreground" />}
                </TableCell>
                <TableCell className="font-mono font-medium">{column.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{column.type}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {column.isPK && (
                      <Badge variant="outline" className="text-xs">
                        PK
                      </Badge>
                    )}
                    {column.isFK && (
                      <Badge variant="outline" className="text-xs">
                        FK
                      </Badge>
                    )}
                    {column.isNullable && (
                      <Badge variant="outline" className="text-xs">
                        NULL
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{column.description || "-"}</TableCell>
              </motion.tr>
            ))}
          </MotionTableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
