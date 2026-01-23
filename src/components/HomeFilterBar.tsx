import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, X, Check } from "lucide-react"; // Swapped Search for Check or just text
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ... (Interfaces remain the same)

export const HomeFilterBar = ({ onApplyFilters, onClear }: HomeFilterBarProps) => {
  // ... (State and Effects remain the same)

  const hasFilters = location || checkIn || checkOut;

  return (
    <div className="w-full bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto flex flex-row items-center gap-3 flex-wrap md:flex-nowrap">
        
        {/* Location Input Group */}
        <div ref={locationRef} className="relative flex-[2] min-w-[200px] group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-primary/10 text-primary transition-colors group-focus-within:bg-primary group-focus-within:text-white">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          <Input
            placeholder="Where are you going?"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setShowLocationSuggestions(true);
            }}
            onFocus={() => setShowLocationSuggestions(true)}
            className="pl-11 h-12 text-sm bg-muted/40 border-none shadow-inner rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
          />
          
          {/* Suggestions Dropdown */}
          {showLocationSuggestions && locationSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-background border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-2 border-b border-border bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Suggestions</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {locationSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.location}-${index}`}
                    onClick={() => handleLocationSelect(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate block">
                        {suggestion.place || suggestion.location}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {[suggestion.location, suggestion.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Selectors Group */}
        <div className="flex flex-1 gap-2 min-w-[280px]">
            {/* Check-in */}
            <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
            <PopoverTrigger asChild>
                <Button
                variant="outline"
                className="flex-1 h-12 justify-start text-left text-sm bg-muted/40 border-none shadow-inner rounded-xl hover:bg-muted/60"
                >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold leading-none mb-0.5">Check-in</span>
                    <span className="truncate">{checkIn ? format(checkIn, "MMM d, yyyy") : "Add date"}</span>
                </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border" align="start">
                <Calendar
                mode="single"
                selected={checkIn}
                onSelect={(date) => {
                    setCheckIn(date);
                    setCheckInOpen(false);
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="p-3"
                />
            </PopoverContent>
            </Popover>

            {/* Check-out */}
            <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
            <PopoverTrigger asChild>
                <Button
                variant="outline"
                className="flex-1 h-12 justify-start text-left text-sm bg-muted/40 border-none shadow-inner rounded-xl hover:bg-muted/60"
                >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold leading-none mb-0.5">Check-out</span>
                    <span className="truncate">{checkOut ? format(checkOut, "MMM d, yyyy") : "Add date"}</span>
                </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border" align="start">
                <Calendar
                mode="single"
                selected={checkOut}
                onSelect={(date) => {
                    setCheckOut(date);
                    setCheckOutOpen(false);
                }}
                disabled={(date) => {
                    const minDate = checkIn || new Date();
                    return date <= minDate;
                }}
                className="p-3"
                />
            </PopoverContent>
            </Popover>
        </div>

        {/* Action Group */}
        <div className="flex gap-2 items-center pl-2 border-l border-border ml-1">
          <Button
            onClick={handleApply}
            className="h-12 px-6 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all active:scale-95"
          >
            Apply
          </Button>
          
          {hasFilters && (
            <Button
              onClick={handleClear}
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Clear all"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};