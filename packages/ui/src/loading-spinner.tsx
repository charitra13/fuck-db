import * as React from "react"
import { cn } from "./utils"

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg"
  /** Text to display next to the spinner */
  label?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8"
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        {...props}
      >
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-current border-t-transparent",
            sizeClasses[size]
          )}
          role="status"
          aria-label={label || "Loading"}
        >
          <span className="sr-only">{label || "Loading..."}</span>
        </div>
        {label && <span className="text-sm">{label}</span>}
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner }