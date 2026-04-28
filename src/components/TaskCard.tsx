import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface TaskCardProps {
	icon: LucideIcon;
	label: string;
	onClick?: () => void;
}

export function TaskCard({ icon: Icon, label, onClick }: TaskCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-3 px-4 py-3 rounded-xl border bg-card text-left",
				"transition-all hover:shadow-sm hover:border-primary/30 hover:bg-accent",
				"active:scale-[0.98]",
			)}
		>
			<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
				<Icon className="w-4 h-4 text-muted-foreground" />
			</div>
			<span className="text-sm font-medium text-foreground">{label}</span>
		</button>
	);
}
