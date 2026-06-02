import * as React from "react"
import { cn } from "../../lib/utils"

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export { Card }
