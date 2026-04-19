import { useState, useRef } from "react";
import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  REACTION_EMOJI,
  REACTION_COLOR,
  REACTIONS_ORDER,
  type ReactionType,
} from "@/lib/community";
import { cn } from "@/lib/utils";

interface ReactionPickerProps {
  current: ReactionType | null;
  count: number;
  onPick: (r: ReactionType | null) => void;
  label: string;
}

export function ReactionPicker({ current, count, onPick, label }: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function open() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowPicker(true);
  }
  function scheduleClose() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowPicker(false), 250);
  }

  function quickToggle() {
    if (current) onPick(null);
    else onPick("like");
  }

  return (
    <div className="relative flex-1" onMouseLeave={scheduleClose}>
      {showPicker && (
        <div
          onMouseEnter={open}
          className="absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-popover px-2 py-1.5 shadow-lg animate-in fade-in zoom-in-95"
        >
          {REACTIONS_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onPick(current === r ? null : r);
                setShowPicker(false);
              }}
              className="text-2xl transition hover:scale-125"
              aria-label={r}
            >
              {REACTION_EMOJI[r]}
            </button>
          ))}
        </div>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onMouseEnter={open}
        onTouchStart={() => {
          // long-press feel on mobile: open picker after small delay
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setShowPicker(true), 350);
        }}
        onTouchEnd={() => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
        }}
        onClick={quickToggle}
        className={cn("w-full rounded-xl gap-1.5", current && REACTION_COLOR[current])}
      >
        {current ? (
          <span className="text-base leading-none">{REACTION_EMOJI[current]}</span>
        ) : (
          <ThumbsUp className="h-4 w-4" />
        )}
        <span className="text-xs font-semibold">
          {current ? label : ""}
          {count > 0 && (current ? ` · ${count}` : count)}
        </span>
      </Button>
    </div>
  );
}
