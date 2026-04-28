import { cn } from "@/lib/utils";
import * as React from "react";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div ref={ref} className={cn("relative overflow-auto", className)} {...props}>
				{children}
			</div>
		);
	},
);
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("flex touch-none select-none transition-colors", className)}
			{...props}
		/>
	),
);
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
