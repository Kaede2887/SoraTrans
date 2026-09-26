import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useExtractProgressTable } from "@/utils/useExtractProgress"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-blue-500 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

const CircleProgress = React.memo(function CircleProgress({
  value
}: { value: number }) {

  const pi2 = 3.14159 * 2;
  const isFirstScan = useExtractProgressTable((state)=> state.isFirstScan);

  return (
    <div className={`h-[100px] flex relative items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="z-10 absolute size-24 sm:size-36">
        <circle cx={50} cy={50} r={40} fill="none" stroke="#ccc" strokeWidth="6" />
        {
          value > 0 ? (
            <circle cx={50} cy={50} r={40} fill="none" stroke="#10b981" strokeWidth="6" transform={`rotate(-90 50 50)`}
              strokeDasharray={`${pi2 * 40 * (value || 0) / 100} ${pi2 * 40}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.1s linear" }} />
          ) : (
            isFirstScan && (
              <circle cx={50} cy={50} r={40} fill="none" stroke="#10b981" strokeWidth="6"
                strokeDasharray={`${pi2 * 40 * 25 / 100} ${pi2 * 40}`}
                strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate"
                  from="-90 50 50" to="270 50 50" dur="1s" repeatCount="indefinite" />
              </circle>
            )
          )
        }
      </svg>
      {value > 0 ? (
        <span className="text-2xl text-center font-bold z-20 select-none">
          {value}
          <span className="text-xs font-normal text-gray-500 select-none">%</span>
        </span>
      ) : (
        isFirstScan ? (
          <span className="text-sm sm:text-md text-center font-bold z-20 select-none">
            任务初始化
          </span>
        ) : (
          <span className="text-sm sm:text-md text-center font-bold z-20 select-none">
            无任务
          </span>
        )
      )}

    </div>
  )
})

export { Progress, CircleProgress }
