import { LogoMark } from "@/components/landing/Navbar";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: ["Features", "How it works", "Tech stack"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Support"],
  },
  {
    title: "Company",
    links: ["About", "Contact"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <LogoMark />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Veritas — AI-assisted grading and rosters for teachers who'd rather teach than transcribe.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-semibold text-foreground">{column.title}</h4>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Veritas. Built for teachers.
        </div>
      </div>
    </footer>
  );
}
