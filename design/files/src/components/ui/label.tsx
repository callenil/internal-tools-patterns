"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Label styling aligned with ScrapeGlobal: font-medium text-slate-700 on a
// block-level row above the input.
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "mb-1 block text-sm font-medium leading-none text-slate-700 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
