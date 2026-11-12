import { ArrowUpRightIcon, BookOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocLink } from "../content";

/** "docs.semaphore.pse.dev": de onde vem o link, sem o "www." */
function sourceOf(href: string): string {
  return new URL(href).host.replace(/^www\./, "");
}

/** Link externo para a documentação, em nova aba, com a origem ao lado. */
export function ExternalDocLink({ link }: { link: DocLink }) {
  return (
    <>
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        hrefLang={link.lang}
        className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
      >
        {link.label}
        <ArrowUpRightIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="sr-only"> (abre em nova aba)</span>
      </a>{" "}
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {sourceOf(link.href)}
        {link.lang && " · em português"}
      </span>
    </>
  );
}

/** Bloco "Documentação" no pé de um card. */
export function DocLinks({ links, className }: { links: DocLink[]; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <BookOpenIcon aria-hidden className="size-3.5" />
        Documentação
      </p>

      <ul className="space-y-1.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <ExternalDocLink link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}
