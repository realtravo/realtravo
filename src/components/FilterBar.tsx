import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils"; // shadcn helper

const COLORS = {
  TEAL: "#008080",
};

export interface FilterValues {
  location?: string;
  dateFrom?: Date;
  dateTo?: Date;
  checkIn?: Date;
  checkOut?: Date;
}

interface FilterBarProps {
  type: "trips-events" | "hotels" | "adventure";
  onApplyFilters: (filters: FilterValues) => void;
}

export const FilterBar = ({ type, onApplyFilters }: FilterBarProps) => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();

  const handleApply = () => {
    const filters: FilterValues = {};
    if (type === "hotels") {
      filters.checkIn = checkIn;
      filters.checkOut = checkOut;
    } else {
      filters.dateFrom = dateFrom;
      filters.dateTo = dateTo;
    }
    onApplyFilters(filters);
  };

  const DateDisplay = ({ label, date, placeholder }: { label: string; date?: Date; placeholderText: string }) => (
    <div className="flex flex-col px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-[120px]">
      <span className="text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200 tracking-tight">
        {label}
      </span>
      <span className={cn("text-sm", !date ? "text-slate-400" : "text-slate-600 font-medium")}>
        {date ? format(date, "MMM dd") : placeholderText}
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Main Pill Container */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] md:rounded-full shadow-lg overflow-hidden p-1.5 transition-all">
        
        {/* Destination Section */}
        <div className="flex-grow flex flex-col px-6 py-2 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200">Where</span>
          <input 
            type="text" 
            placeholder="Destinations" 
            className="bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Date Section */}
        <div className="flex flex-row flex-grow md:flex-grow-0">
          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex-1 md:border-r border-slate-100 dark:border-slate-800">
                <DateDisplay 
                  label={type === "hotels" ? "From" : "From"} 
                  date={type === "hotels" ? checkIn : dateFrom} 
                  placeholderText="Add" 
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={type === "hotels" ? checkIn : dateFrom}
                onSelect={type === "hotels" ? setCheckIn : setDateFrom}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>

          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex-1">
                <DateDisplay 
                  label={type === "hotels" ? "To" : "To"} 
                  date={type === "hotels" ? checkOut : dateTo} 
                  placeholderText="Add" 
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={type === "hotels" ? checkOut : dateTo}
                onSelect={type === "hotels" ? setCheckOut : setDateTo}
                disabled={(date) => {
                  const base = (type === "hotels" ? checkIn : dateFrom) || new Date();
                  return date <= base;
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleApply}
          className="h-12 md:h-12 px-8 rounded-full text-white font-bold transition-transform active:scale-95 ml-auto"
          style={{ backgroundColor: COLORS.TEAL }}
        >
          <Search className="h-4 w-4 mr-2 stroke-[3px]" />
          Search
        </Button>
      </div>
    </div>
  );
};