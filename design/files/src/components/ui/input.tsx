import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// Input styling ported from sibling project ScrapeGlobal verbatim:
//   rounded-lg border border-slate-300 px-4 py-2 text-sm transition-colors
//   duration-200 focus:border-transparent focus:outline-none focus:ring-2
//   focus:ring-[var(--primary)]
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-700 aria-invalid:border-red-300 aria-invalid:ring-2 aria-invalid:ring-red-200",
        className
      )}
      {...props}
    />
  )
}

export { Input }
