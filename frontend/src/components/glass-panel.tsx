import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

export function GlassPanel({ className, ...props }: GlassPanelProps) {
  return (
    <section
      className={cn(
        "glass-surface bg-black/75 text-slate-100",
        className,
      )}
      {...props}
    />
  );
}


