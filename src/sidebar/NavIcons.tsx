import { MessageSquare, CheckSquare, Settings } from "lucide-react";

interface NavIconsProps {
	activeView: "chat" | "tasks" | "settings";
	onNavigate: (view: "chat" | "tasks" | "settings") => void;
}

const ITEMS = [
	{ view: "chat" as const, icon: MessageSquare, label: "Chat" },
	{ view: "tasks" as const, icon: CheckSquare, label: "Tasks" },
	{ view: "settings" as const, icon: Settings, label: "Settings" },
];

export function NavIcons({ activeView, onNavigate }: NavIconsProps) {
	return (
		<div className="flex justify-around">
			{ITEMS.map(({ view, icon: Icon, label }) => (
				<button
					key={view}
					type="button"
					onClick={() => onNavigate(view)}
					aria-label={label}
					className={`p-2 rounded-lg transition-colors ${
						activeView === view
							? "bg-sidebar-accent text-sidebar-accent-foreground"
							: "text-muted-foreground hover:text-sidebar-foreground"
					}`}
				>
					<Icon className="w-5 h-5" />
				</button>
			))}
		</div>
	);
}
