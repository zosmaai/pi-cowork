export interface PiStatus {
	installed: boolean;
	version: string | null;
	path: string | null;
}

export interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: number;
}
