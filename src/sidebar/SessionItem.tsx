import { MessageSquare, Trash2 } from "lucide-react";
import type { SessionMeta } from "@/lib/session-store";

interface SessionItemProps {
	session: SessionMeta;
	isActive: boolean;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
}

export function SessionItem({
	session,
	isActive,
	onSelect,
	onDelete,
}: SessionItemProps) {
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => onSelect(session.id)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(session.id);
				}
			}}
			className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors group cursor-pointer ${
				isActive
					? "bg-sidebar-accent text-sidebar-accent-foreground"
					: "text-sidebar-foreground hover:bg-sidebar-accent/50"
			}`}
		>
			<MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
			<span className="truncate flex-1">{session.title}</span>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onDelete(session.id);
				}}
				className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sidebar-accent/80 transition-opacity shrink-0"
				aria-label={`Delete session ${session.title}`}
			>
				<Trash2 className="w-3 h-3" />
			</button>
		</div>
	);
}
