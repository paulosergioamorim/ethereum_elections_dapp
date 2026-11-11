import { SearchIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

export function SearchInput(props: Omit<ComponentProps<typeof Input>, "type">) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" className="h-10 pl-9" {...props} />
    </div>
  );
}
