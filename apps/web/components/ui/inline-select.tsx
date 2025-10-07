"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"

interface InlineSelectProps {
  value: string
  options: Array<{ label: string; value: string }>
  onSave: (value: string) => void | Promise<void>
  className?: string
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
}

export function InlineSelect({
  value,
  options,
  onSave,
  className,
  placeholder = "Select...",
  disabled = false,
  searchable = true
}: InlineSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  
  const currentOption = options.find(opt => opt.value === value)
  const displayValue = currentOption?.label || value || placeholder

  const handleSelect = async (newValue: string) => {
    if (newValue !== value) {
      await onSave(newValue)
    }
    setOpen(false)
    setSearchValue("")
  }

  const filteredOptions = searchable
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchValue.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchValue.toLowerCase())
      )
    : options

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          className={cn(
            "inline-flex items-center justify-between cursor-pointer",
            "hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1",
            "transition-colors duration-150 min-w-[100px]",
            disabled && "cursor-not-allowed opacity-60",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="text-sm truncate">{displayValue}</span>
          <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          {searchable && (
            <CommandInput 
              placeholder="Search..." 
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-8 text-sm"
            />
          )}
          <CommandEmpty>No option found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => handleSelect(option.value)}
                className="text-sm"
              >
                <Check
                  className={cn(
                    "mr-2 h-3 w-3",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Common data types for SQL databases
export const DATA_TYPES = [
  { label: "BIGINT", value: "bigint" },
  { label: "INT", value: "int" },
  { label: "SMALLINT", value: "smallint" },
  { label: "DECIMAL", value: "decimal" },
  { label: "NUMERIC", value: "numeric" },
  { label: "REAL", value: "real" },
  { label: "DOUBLE", value: "double" },
  { label: "VARCHAR", value: "varchar" },
  { label: "CHAR", value: "char" },
  { label: "TEXT", value: "text" },
  { label: "DATE", value: "date" },
  { label: "TIME", value: "time" },
  { label: "TIMESTAMP", value: "timestamp" },
  { label: "BOOLEAN", value: "boolean" },
  { label: "UUID", value: "uuid" },
  { label: "JSON", value: "json" },
  { label: "JSONB", value: "jsonb" },
  { label: "ARRAY", value: "array" },
  { label: "BYTEA", value: "bytea" },
]

// Common constraints
export const CONSTRAINTS = [
  { label: "None", value: "" },
  { label: "Primary Key", value: "PK" },
  { label: "Foreign Key", value: "FK" },
  { label: "Unique", value: "UNIQUE" },
  { label: "Not Null", value: "NOT_NULL" },
  { label: "Check", value: "CHECK" },
  { label: "Default", value: "DEFAULT" },
]