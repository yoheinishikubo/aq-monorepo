import * as React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      md: "h-8 w-8 border-4",
      lg: "h-12 w-12 border-4",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-solid",
          sizeClasses[size],
          "border-gray-300 border-t-blue-500", // Changed colors for better visibility
          className
        )}
        role="status"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);
Spinner.displayName = "Spinner";

export { Spinner };
