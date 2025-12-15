import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GradientButton({ className, ...props }: ButtonProps) {
  return (
    <Button
      className={cn(
        "relative overflow-hidden border border-transparent text-slate-950",
        "bg-gradient-blue-green hover-glow hover-lift",
        className,
      )}
      {...props}
    />
  );
}


