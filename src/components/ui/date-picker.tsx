"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { zhCN, enUS } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: string // yyyy-MM-dd format
  onChange?: (value: string) => void
  placeholder?: string
  locale?: "zh" | "en"
  className?: string
}

function DatePicker({ value, onChange, placeholder, locale = "zh", className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const dateLocale = locale === "zh" ? zhCN : enUS
  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const validSelected = selected && isValid(selected) ? selected : undefined

  const displayText = validSelected
    ? format(validSelected, locale === "zh" ? "yyyy年MM月dd日" : "MMM dd, yyyy", { locale: dateLocale })
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "hover:border-ring/60",
          !displayText && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">
          {displayText || placeholder || (locale === "zh" ? "选择日期" : "Pick a date")}
        </span>
        <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={validSelected}
          onSelect={(date) => {
            if (date) {
              onChange?.(format(date, "yyyy-MM-dd"))
            }
            setOpen(false)
          }}
          locale={dateLocale}
          defaultMonth={validSelected}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2035, 11)}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
