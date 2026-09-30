"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export function EmptyState({
  title,
  body,
  action,
  className,
  icon,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-16 text-center", className)}>
      {icon && <div className="mb-6 text-stone">{icon}</div>}
      <h2 className="display text-3xl sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-stone">{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center px-6 py-16 text-center", className)}>
      <p className="eyebrow text-ember">Something went wrong</p>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-stone">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
