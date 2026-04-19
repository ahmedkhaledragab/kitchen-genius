import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Suggestion {
  kind: "user" | "tag";
  id: string;
  label: string;
  sub?: string;
  avatar?: string | null;
}

interface MentionTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  onEnterSubmit?: () => void;
  autoFocus?: boolean;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength = 2000,
  className,
  onEnterSubmit,
  autoFocus,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<"@" | "#" | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const triggerStart = useRef<number>(-1);

  function detectTrigger(text: string, caret: number) {
    // walk back from caret to find space or trigger char
    let i = caret - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === "@" || ch === "#") {
        const before = i === 0 ? " " : text[i - 1];
        if (/\s/.test(before) || before === "") {
          const q = text.slice(i + 1, caret);
          if (/^[\p{L}\p{N}_]*$/u.test(q)) {
            return { trig: ch as "@" | "#", start: i, query: q };
          }
        }
        return null;
      }
      if (/\s/.test(ch)) return null;
      i--;
    }
    return null;
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    const caret = e.target.selectionStart ?? text.length;
    const det = detectTrigger(text, caret);
    if (det) {
      setTrigger(det.trig);
      setQuery(det.query);
      triggerStart.current = det.start;
      setOpen(true);
      setActiveIdx(0);
    } else {
      setOpen(false);
      setTrigger(null);
    }
  }

  // Fetch suggestions debounced
  useEffect(() => {
    if (!open || !trigger) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (trigger === "@") {
        const q = query.trim();
        const queryBuilder = supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("is_active", true)
          .limit(6);
        const { data } = q
          ? await queryBuilder.ilike("display_name", `%${q}%`)
          : await queryBuilder.order("created_at", { ascending: false });
        if (cancelled) return;
        setItems(
          (data || [])
            .filter((u) => u.display_name)
            .map((u) => ({
              kind: "user" as const,
              id: u.id,
              label: u.display_name!,
              avatar: u.avatar_url,
            })),
        );
      } else {
        const q = query.trim().toLowerCase();
        const { data } = await supabase
          .from("community_post_hashtags")
          .select("tag")
          .ilike("tag", `${q}%`)
          .limit(20);
        if (cancelled) return;
        const counts = new Map<string, number>();
        (data || []).forEach((r) => counts.set(r.tag, (counts.get(r.tag) || 0) + 1));
        const list = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([tag, n]) => ({
            kind: "tag" as const,
            id: tag,
            label: `#${tag}`,
            sub: `${n}`,
          }));
        setItems(list);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, trigger, query]);

  function applyChoice(choice: Suggestion) {
    const ta = ref.current;
    if (!ta) return;
    const start = triggerStart.current;
    if (start < 0) return;
    const before = value.slice(0, start);
    const after = value.slice(start + 1 + query.length);
    const insertion =
      choice.kind === "user"
        ? `@${choice.label.replace(/\s+/g, "_")} `
        : `${choice.label} `;
    const next = `${before}${insertion}${after}`;
    onChange(next);
    setOpen(false);
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = (before + insertion).length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (open && items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % items.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + items.length) % items.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyChoice(items[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && onEnterSubmit) {
      e.preventDefault();
      onEnterSubmit();
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={cn("resize-none rounded-xl", className)}
        autoFocus={autoFocus}
      />
      {open && items.length > 0 && (
        <div className="absolute left-2 right-2 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-2xl border bg-popover shadow-lg">
          {items.map((item, i) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyChoice(item);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition",
                activeIdx === i ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              {item.kind === "user" ? (
                <Avatar className="h-7 w-7">
                  {item.avatar && <AvatarImage src={item.avatar} />}
                  <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                    {item.label.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm">#</span>
              )}
              <span className="flex-1 truncate font-medium">{item.label}</span>
              {item.sub && <span className="text-xs text-muted-foreground">{item.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
