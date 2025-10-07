"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Check, X, Edit2 } from "lucide-react"

interface InlineEditProps {
  value: string
  onSave: (value: string) => void | Promise<void>
  className?: string
  placeholder?: string
  disabled?: boolean
  showEditIcon?: boolean
  multiline?: boolean
}

export function InlineEdit({
  value,
  onSave,
  className,
  placeholder = "Click to edit",
  disabled = false,
  showEditIcon = false,
  multiline = false
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  
  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }
    
    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to save:", error)
      setEditValue(value) // Revert on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    } else if (e.key === "Enter" && multiline && e.metaKey) {
      e.preventDefault()
      handleSave()
    }
  }

  if (disabled && !value) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {placeholder}
      </span>
    )
  }

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input"
    // Calculate width based on content or placeholder
    const textToMeasure = editValue || placeholder
    const charWidth = 0.6 // Approximate character width in ch units
    const calculatedWidth = Math.max(textToMeasure.length * charWidth, placeholder.length * charWidth) + 3
    
    return (
      <div className="inline-flex items-center gap-1">
        <InputComponent
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!isSaving) {
              handleSave()
            }
          }}
          disabled={isSaving}
          className={cn(
            "bg-background border border-input px-2 py-1 text-sm rounded-md",
            "focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent",
            "disabled:opacity-50",
            multiline && "min-h-[60px] resize-y",
            className
          )}
          placeholder={placeholder}
          style={{
            width: multiline ? '100%' : `${calculatedWidth}ch`,
            minWidth: multiline ? 'auto' : `${placeholder.length * 0.6}ch`
          }}
        />
        <div className="flex gap-0.5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 hover:bg-accent rounded-sm disabled:opacity-50"
            title="Save (Enter)"
          >
            <Check className="h-3 w-3 text-green-600" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 hover:bg-accent rounded-sm disabled:opacity-50"
            title="Cancel (Esc)"
          >
            <X className="h-3 w-3 text-red-600" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <span
      onClick={() => !disabled && setIsEditing(true)}
      className={cn(
        "inline-block cursor-pointer",
        "transition-colors duration-150",
        disabled && "cursor-not-allowed opacity-60",
        !value && "text-muted-foreground italic",
        className
      )}
    >
      {value || placeholder}
      {showEditIcon && !disabled && (
        <Edit2 className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </span>
  )
}