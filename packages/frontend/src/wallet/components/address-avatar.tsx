import type { Address } from "viem";
import { cn } from "@/lib/utils";

/** Avatar determinístico: cada endereço tem sempre o mesmo gradiente, para reconhecer as contas de relance. */
export function AddressAvatar({ address, className }: { address: Address; className?: string }) {
  const hue = Number.parseInt(address.slice(2, 8), 16) % 360;
  const secondHue = (hue + 120) % 360;

  return (
    <span
      aria-hidden
      className={cn("inline-block size-5 shrink-0 rounded-xs", className)}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${secondHue} 80% 40%))`,
      }}
    />
  );
}
