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

// Extension info from the metaagents engine
export interface ExtensionInfo {
	id: string;
	name: string;
	version: string;
	description: string;
	enabled: boolean;
	source: "local" | "npm" | "localPath";
}

// Provider info from pi's models.json
export interface ProviderInfo {
	id: string;
	name: string;
	api: string;
	modelCount: number;
}

// Model info from pi's models.json
export interface ModelInfo {
	id: string;
	name: string;
	provider: string;
	reasoning: boolean;
	contextWindow: number;
	maxTokens: number;
}

// Config snapshot from the engine
export interface ConfigPayload {
	defaultProvider: string | null;
	defaultModel: string | null;
	providers: ProviderInfo[];
	models: ModelInfo[];
}

export * from "./pi-events";
