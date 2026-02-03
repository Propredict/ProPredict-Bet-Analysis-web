import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LeagueOption {
  id: string;
  name: string;
  matchCount?: number;
}

interface LeagueSearchSelectProps {
  leagues: LeagueOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function LeagueSearchSelect({
  leagues,
  value,
  onValueChange,
  placeholder = "Select league...",
  className,
  compact = false,
}: LeagueSearchSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLeague = leagues.find((league) => league.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
          <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/50 hover:border-primary hover:bg-primary/20 shadow-lg shadow-primary/20 animate-pulse hover:animate-none transition-all duration-300",
            compact ? "h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4 font-semibold" : "h-11 text-base px-4 font-semibold",
            className
          )}
        >
          <span className="truncate">
            {selectedLeague ? (
              <>
                {selectedLeague.name}
                {selectedLeague.id !== "all" && selectedLeague.matchCount !== undefined && (
                  <span className="text-muted-foreground ml-1">({selectedLeague.matchCount})</span>
                )}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className={cn("ml-1 shrink-0 opacity-50", compact ? "h-3 w-3" : "h-4 w-4")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-popover border-border z-50" align="end">
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-primary/30 bg-primary/5 px-3 py-1">
            <Search className="mr-2 h-5 w-5 shrink-0 text-primary animate-pulse" />
            <CommandInput
              placeholder="Type to search..."
              className="h-11 border-0 focus:ring-0 text-sm placeholder:text-primary/50 font-medium"
              autoFocus
            />
          </div>
          <CommandList className="max-h-[250px]">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
              No league found.
            </CommandEmpty>
            <CommandGroup>
              {leagues.map((league) => (
                <CommandItem
                  key={league.id}
                  value={league.name}
                  onSelect={() => {
                    onValueChange(league.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">
                    {league.name}
                    {league.id !== "all" && league.matchCount !== undefined && (
                      <span className="text-muted-foreground ml-1 text-xs">({league.matchCount})</span>
                    )}
                  </span>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === league.id ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
