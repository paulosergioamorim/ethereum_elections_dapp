import type { ReactNode } from "react";

/** Nome de função, evento ou expressão no meio do texto. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-xs bg-secondary px-1 py-0.5 font-mono text-[0.8em] break-words">
      {children}
    </code>
  );
}
