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
	thinking?: string;
	toolCalls?: ToolCallInfo[];
	isStreaming?: boolean;
	model?: string;
	provider?: string;
}

export interface ToolCallInfo {
	id: string;
	name: string;
	args: Record<string, unknown>;
	status: "running" | "completed" | "error";
	result?: string;
	isError?: boolean;
}

export * from "./pi-events";
