import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * REFRESHED DESIGN SYSTEM - Card Components
 * 
 * Improved spacing and visual depth for better readability:
 * - CardHeader: py-4 px-5 (breathing room)
 * - CardContent: py-4 px-5 (breathing room)
 * - CardFooter: py-4 px-5 (breathing room)
 * - CardTitle: text-base md:text-lg (matches h3)
 * - CardDescription: text-sm for better readability
 * - Enhanced shadows for depth
 */

/**
 * Enhanced Card with better shadows and spacing for improved readability
 */

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow-md shadow-black/20", className)} {...props} />
));

Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 py-4 px-5", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base md:text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("py-4 px-5 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center py-4 px-5 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
