// Shared helpers for the community feature
import type { Database } from "@/integrations/supabase/types";

export type ReactionType = Database["public"]["Enums"]["reaction_type"];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
};

export const REACTION_COLOR: Record<ReactionType, string> = {
  like: "text-blue-500",
  love: "text-rose-500",
  haha: "text-amber-500",
  wow: "text-amber-500",
  sad: "text-amber-500",
};

export const REACTIONS_ORDER: ReactionType[] = ["like", "love", "haha", "wow", "sad"];

/** Extract hashtags from content. Returns lowercase tags without the # prefix. */
export function extractHashtags(text: string): string[] {
  // supports unicode letters incl. Arabic
  const re = /(?:^|\s)#([\p{L}\p{N}_]{1,50})/gu;
  const tags = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tags.add(m[1].toLowerCase());
  }
  return [...tags];
}

/** Extract @mentions from content (returns the raw handles, no @). */
export function extractMentions(text: string): string[] {
  const re = /(?:^|\s)@([\p{L}\p{N}_]{2,40})/gu;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

export interface RichSegment {
  type: "text" | "hashtag" | "mention" | "bold" | "italic" | "link";
  value: string;
  payload?: string;
}

/**
 * Lightweight tokenizer:
 *  - **bold**
 *  - *italic*
 *  - #hashtag
 *  - @mention
 *  - http(s)://link
 */
export function tokenizeRichText(text: string): RichSegment[] {
  if (!text) return [];
  // Master regex with named groups
  const re =
    /(\*\*([^*\n]+)\*\*)|(\*([^*\n]+)\*)|((?:^|\s)#([\p{L}\p{N}_]{1,50}))|((?:^|\s)@([\p{L}\p{N}_]{2,40}))|(https?:\/\/[^\s]+)/gu;
  const segs: RichSegment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    if (start > lastIndex) {
      segs.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    if (m[1]) {
      segs.push({ type: "bold", value: m[2] });
    } else if (m[3]) {
      segs.push({ type: "italic", value: m[4] });
    } else if (m[5]) {
      // Preserve any leading whitespace as text
      const lead = m[5].startsWith("#") ? "" : m[5][0];
      if (lead) segs.push({ type: "text", value: lead });
      segs.push({ type: "hashtag", value: `#${m[6]}`, payload: m[6].toLowerCase() });
    } else if (m[7]) {
      const lead = m[7].startsWith("@") ? "" : m[7][0];
      if (lead) segs.push({ type: "text", value: lead });
      segs.push({ type: "mention", value: `@${m[8]}`, payload: m[8] });
    } else if (m[9]) {
      segs.push({ type: "link", value: m[9], payload: m[9] });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segs.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segs;
}

export function timeAgo(iso: string, lang: "ar" | "en"): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const ar = {
    now: "الآن",
    m: "د",
    h: "س",
    d: "ي",
    w: "أ",
  };
  const en = {
    now: "now",
    m: "m",
    h: "h",
    d: "d",
    w: "w",
  };
  const L = lang === "ar" ? ar : en;
  if (diff < 60) return L.now;
  if (diff < 3600) return `${Math.floor(diff / 60)}${L.m}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${L.h}`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}${L.d}`;
  return `${Math.floor(diff / (86400 * 7))}${L.w}`;
}
