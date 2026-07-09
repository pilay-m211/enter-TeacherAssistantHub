import { Fragment } from "react";

interface HighlightMatchProps {
  text: string;
  query: string;
}

/** Wraps the first case-insensitive match of `query` inside `text` in a highlighted span. */
export function HighlightMatch({ text, query }: HighlightMatchProps) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return <>{text}</>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmed.length);
  const after = text.slice(index + trimmed.length);

  return (
    <Fragment>
      {before}
      <mark className="rounded-sm bg-warning/30 px-0.5 text-foreground">{match}</mark>
      {after}
    </Fragment>
  );
}
