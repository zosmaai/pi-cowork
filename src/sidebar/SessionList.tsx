import type { SessionMeta } from "@/lib/session-store";
import { SessionItem } from "./SessionItem";

interface SessionListProps {
	sessions: SessionMeta[];
	activeSessionId: string | null;
	loading: boolean;
	onSelect: (id: string) => void;
	onDelete: (id: string) => void;
}

export function SessionList({
	sessions,
	activeSessionId,
	loading,
	onSelect,
	onDelete,
}: SessionListProps) {
	return (
		<div className="flex-1 overflow-y-auto px-3">
			<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
				Recents
			</div>
			{loading ? (
				<div className="px-3 py-4 text-sm text-muted-foreground">Loading...</div>
			) : sessions.length === 0 ? (
				<div className="px-3 py-4 text-sm text-muted-foreground">No sessions yet</div>
			) : (
				<div className="space-y-0.5">
					{sessions.map((session) => (
						<SessionItem
							key={session.id}
							session={session}
							isActive={activeSessionId === session.id}
							onSelect={onSelect}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}
		</div>
	);
}
