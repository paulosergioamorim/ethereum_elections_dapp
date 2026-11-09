import { VoteIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
    >
      <VoteIcon className="size-[1.15rem]" />
    </span>
  );
}

export function BrandLink() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Eleições, página inicial">
      <BrandMark />
      <span className="text-lg font-semibold tracking-tight">
        eleições<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
