import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Diamond, ChevronDown } from "lucide-react";

import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "../ui/popover";

export function DateRangeFilter({ className, date, setDate }) {
  const [activePresetLabel, setActivePresetLabel] = React.useState("Last 30 days");

  const presets = [
    { label: "Yesterday", getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }), premium: false },
    { label: "Last week", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }), premium: false },
    { label: "Current month", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }), premium: false },
    { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }), premium: false },
    { label: "Previous month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }), premium: true },
    { label: "Last 3 months", getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }), premium: true },
    { label: "Last 6 months", getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }), premium: true },
    { label: "Last 12 months", getValue: () => ({ from: subMonths(new Date(), 12), to: new Date() }), premium: true },
  ];

  const handlePresetClick = (preset) => {
    setActivePresetLabel(preset.label);
    setDate(preset.getValue());
  };

  const isActivePreset = (preset) => {
    if (activePresetLabel) {
      return activePresetLabel === preset.label;
    }
    const value = preset.getValue();
    return isSameDay(date?.from, value.from) && isSameDay(date?.to, value.to);
  };

  const handleSelect = (range, selectedDay) => {
    setActivePresetLabel(null);
    if (!range) {
      setDate({ from: selectedDay, to: selectedDay });
      return;
    }
    setDate(range);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "h-9 justify-start text-left font-medium bg-gray-50 border-gray-200 rounded-lg px-3 hover:bg-gray-100 transition-all shadow-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
            <span className="text-[11px] font-bold text-gray-700">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </span>
            <div className="ml-3 w-4 h-4 rounded-full bg-[#D9F99D] flex items-center justify-center shadow-sm">
                 <Diamond size={10} className="text-[#0A0A0A] fill-[#0A0A0A]" />
            </div>
            <ChevronDown className="ml-1 h-3 w-3 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex shadow-2xl border-gray-100 rounded-xl overflow-hidden bg-white" align="end" sideOffset={8}>
          <div className="flex flex-col sm:flex-row">
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
                className="rounded-md border-none"
                classNames={{
                   day_range_start: "bg-[#2D1D35] text-white rounded-l-full",
                   day_range_end: "bg-[#2D1D35] text-white rounded-r-full",
                   day_selected: "bg-[#2D1D35] text-white hover:bg-[#2D1D35] hover:text-white focus:bg-[#2D1D35] focus:text-white",
                   day_range_middle: "aria-selected:bg-[#F3F4F6] aria-selected:text-gray-900 rounded-none",
                   day_today: "border border-[#2D1D35] rounded-full",
                }}
              />
            </div>
            <div className="w-56 border-l border-gray-100 flex flex-col p-4 gap-1 bg-[#FDFDFD]">
               <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">Presets</div>
               {presets.map((preset) => (
                 <button
                   key={preset.label}
                   onClick={() => handlePresetClick(preset)}
                   className={cn(
                     "flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-xl transition-all text-left group",
                     isActivePreset(preset) 
                       ? "bg-[#2D1D35] text-white shadow-lg" 
                       : "text-gray-600 hover:bg-gray-100"
                   )}
                 >
                   {preset.label}
                   {preset.premium && (
                     <Diamond size={12} className={cn(isActivePreset(preset) ? "text-[#D9F99D] fill-[#D9F99D]" : "text-[#BEF264] fill-[#BEF264] group-hover:scale-110 transition-transform")} />
                   )}
                 </button>
               ))}
               <div className="mt-6">
                  <PopoverClose asChild>
                    <Button 
                      className="w-full h-10 text-[11px] font-extrabold bg-[#D9F99D] text-[#0A0A0A] hover:bg-[#bef264] rounded-xl shadow-md transition-all active:scale-95"
                    >
                      Apply Range
                    </Button>
                  </PopoverClose>
               </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
