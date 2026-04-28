import { cn } from "@/lib/utils";
import * as React from "react";

interface TooltipProps {
	children: React.ReactNode;
	content: string;
	side?: "top" | "bottom" | "left" | "right";
}

function Tooltip({ children, content, side = "bottom" }: TooltipProps) {
	const [open, setOpen] = React.useState(false);
	const ref = React.useRef<HTMLDivElement>(null);

	const sideClasses = {
		top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
		bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
		left: "right-full top-1/2 -translate-y-1/2 mr-2",
		right: "left-full top-1/2 -translate-y-1/2 ml-2",
	};

	return (
		<div
			ref={ref}
			className="relative inline-flex"
			onMouseEnter={() => setOpen(true)}
			onMouseLeave={() => setOpen(false)}
			onFocus={() => setOpen(true)}
			onBlur={() => setOpen(false)}
		>
			{children}
			{open && (
				<div
					className={cn(
						"absolute z-50 px-2.5 py-1 rounded-md bg-popover text-popover-foreground text-xs whitespace-nowrap shadow-lg border border-border pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150",
						sideClasses[side],
					)}
				>
					{content}
				</div>
			)}
		</div>
	);
}

export { Tooltip };
