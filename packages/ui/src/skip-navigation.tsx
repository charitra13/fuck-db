import * as React from "react"
import { cn } from "./utils"

export interface SkipNavigationProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href?: string
}

const SkipNavigation = React.forwardRef<HTMLAnchorElement, SkipNavigationProps>(
  ({ className, href = "#main-content", children = "Skip to main content", ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
          "bg-background text-foreground px-4 py-2 rounded-md border shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </a>
    )
  }
)
SkipNavigation.displayName = "SkipNavigation"

export { SkipNavigation }