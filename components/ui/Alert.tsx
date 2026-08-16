import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "warning" | "error" | "success";
  title?: string;
}

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  const variantStyles = {
    info: "border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200",
    warning: "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200",
    error: "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-200",
    success: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200",
  };

  const icons = {
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
  };

  return (
    <div
      className={twMerge(
        clsx(
          "flex gap-3 rounded-xl border p-4 text-sm transition-all",
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold mb-1 leading-tight">{title}</h5>}
        <div className="text-xs opacity-90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
