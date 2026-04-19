import { Link } from "@tanstack/react-router";
import { tokenizeRichText } from "@/lib/community";

interface RichContentProps {
  text: string;
  className?: string;
}

/** Renders post/comment content with bold, italic, hashtags, mentions, links. */
export function RichContent({ text, className }: RichContentProps) {
  const segs = tokenizeRichText(text);
  return (
    <p className={className} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {segs.map((s, i) => {
        switch (s.type) {
          case "bold":
            return (
              <strong key={i} className="font-bold">
                {s.value}
              </strong>
            );
          case "italic":
            return (
              <em key={i} className="italic">
                {s.value}
              </em>
            );
          case "hashtag":
            return (
              <Link
                key={i}
                to="/community/tag/$tag"
                params={{ tag: s.payload! }}
                className="font-semibold text-primary hover:underline"
              >
                {s.value}
              </Link>
            );
          case "mention":
            return (
              <Link
                key={i}
                to="/top-creators"
                className="font-semibold text-primary hover:underline"
              >
                {s.value}
              </Link>
            );
          case "link":
            return (
              <a
                key={i}
                href={s.payload}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                {s.value}
              </a>
            );
          default:
            return <span key={i}>{s.value}</span>;
        }
      })}
    </p>
  );
}
