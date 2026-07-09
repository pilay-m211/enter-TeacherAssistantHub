const ITEMS = [
  "Lincoln Middle School",
  "OCR-Verified Grading",
  "Rubric Builder",
  "Riverside High",
  "Instant Gradebook Sync",
  "Oakwood Academy",
  "Bulk Answer Scanning",
  "Westfield Elementary",
];

export function MarqueeTicker() {
  const loopItems = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-card/40 py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {loopItems.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="text-sm font-medium tracking-wide text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
