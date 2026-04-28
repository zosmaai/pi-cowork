import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import {
	MessageSquare,
	FolderOpen,
	Settings,
	Sparkles,
	Command,
} from "lucide-react";

interface ActivityBarProps {
	activeView: string;
	onViewChange: (view: string) => void;
}

const items = [
	{ id: "chat", icon: MessageSquare, label: "Chat" },
	{ id: "files", icon: FolderOpen, label: "Files" },
	{ id: "prompts", icon: Sparkles, label: "Prompts" },
	{ id: "commands", icon: Command, label: "Commands" },
	{ id: "settings", icon: Settings, label: "Settings" },
];

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
	return (
		<div className="w-12 flex flex-col items-center py-2 bg-sidebar border-r border-sidebar-border select-none">
			{/* App icon */}
			<div className="mb-4 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
				π
			</div>

			<Separator />

			{/* Main nav items */}
			<div className="flex flex-col gap-1 py-2 flex-1">
				{items.slice(0, 4).map((item) => (
					<Tooltip key={item.id} content={item.label} side="right">
						<button
							type="button"
							onClick={() => onViewChange(item.id)}
							className={cn(
								"w-9 h-9 rounded-md flex items-center justify-center transition-colors",
								activeView === item.id
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
							)}
						>
							<item.icon className="w-[18px] h-[18px]" />
						</button>
					</Tooltip>
				))}
			</div>

			{/* Bottom items */}
			<div className="flex flex-col gap-1 py-2">
				{items.slice(4).map((item) => (
					<Tooltip key={item.id} content={item.label} side="right">
						<button
							type="button"
							onClick={() => onViewChange(item.id)}
							className={cn(
								"w-9 h-9 rounded-md flex items-center justify-center transition-colors",
								activeView === item.id
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
							)}
						>
							<item.icon className="w-[18px] h-[18px]" />
						</button>
					</Tooltip>
				))}
			</div>
		</div>
	);
}

function Separator() {
	return <div className="w-6 h-[1px] bg-sidebar-border my-1" />;
}
