import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ value, disabled,className, type, ...props }: React.ComponentProps<"input">) {
  
  return (
    <input
      type={type}
      data-slot="input"
      disabled={disabled}
      value={value}
      autoComplete="off"
      className={cn(
        ` text-xs flex h-6 px-2 rounded-sm text-ellipsis whitespace-nowrap overflow-hidden outline-none border border-gray-400 focus:border-blue-400 focus:bg-white ${disabled ? "bg-[#F5F5F5] text-[#77787a]" : "bg-white"}`,
        className
      )}
      {...props}
    />
  )
}

export { Input }
