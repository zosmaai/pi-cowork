// Pi JSON streaming event types
// Based on https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/json.md

export interface PiSessionEvent {
	type: "session";
	version: number;
	id: string;
	timestamp: string;
	cwd: string;
}

export interface PiAgentStartEvent {
	type: "agent_start";
}

export interface PiAgentEndEvent {
	type: "agent_end";
	messages: PiAgentMessage[];
}

export interface PiTurnStartEvent {
	type: "turn_start";
}

export interface PiTurnEndEvent {
	type: "turn_end";
	message: PiAgentMessage;
	toolResults: PiToolResultMessage[];
}

export interface PiMessageStartEvent {
	type: "message_start";
	message: PiAgentMessage;
}

export interface PiMessageEndEvent {
	type: "message_end";
	message: PiAgentMessage;
}

export interface PiMessageUpdateEvent {
	type: "message_update";
	message: PiAgentMessage;
	assistantMessageEvent: AssistantMessageEvent;
}

export interface PiToolExecutionStartEvent {
	type: "tool_execution_start";
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
}

export interface PiToolExecutionUpdateEvent {
	type: "tool_execution_update";
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	partialResult: {
		content: Array<{ type: string; text: string }>;
		details: Record<string, unknown>;
	};
}

export interface PiToolExecutionEndEvent {
	type: "tool_execution_end";
	toolCallId: string;
	toolName: string;
	result: {
		content: Array<{ type: string; text: string }>;
		details: Record<string, unknown>;
	};
	isError: boolean;
}

export interface PiQueueUpdateEvent {
	type: "queue_update";
	steering: readonly string[];
	followUp: readonly string[];
}

export interface PiCompactionStartEvent {
	type: "compaction_start";
	reason: "manual" | "threshold" | "overflow";
}

export interface PiCompactionEndEvent {
	type: "compaction_end";
	reason: "manual" | "threshold" | "overflow";
	result?: {
		summary: string;
		firstKeptEntryId: string;
		tokensBefore: number;
		details: Record<string, unknown>;
	};
	aborted: boolean;
	willRetry: boolean;
	errorMessage?: string;
}

export interface PiAutoRetryStartEvent {
	type: "auto_retry_start";
	attempt: number;
	maxAttempts: number;
	delayMs: number;
	errorMessage: string;
}

export interface PiAutoRetryEndEvent {
	type: "auto_retry_end";
	success: boolean;
	attempt: number;
	finalError?: string;
}

export interface PiDoneEvent {
	type: "done";
}

export interface PiErrorEvent {
	type: "error";
	message: string;
}

export type PiEvent =
	| PiSessionEvent
	| PiAgentStartEvent
	| PiAgentEndEvent
	| PiTurnStartEvent
	| PiTurnEndEvent
	| PiMessageStartEvent
	| PiMessageEndEvent
	| PiMessageUpdateEvent
	| PiToolExecutionStartEvent
	| PiToolExecutionUpdateEvent
	| PiToolExecutionEndEvent
	| PiQueueUpdateEvent
	| PiCompactionStartEvent
	| PiCompactionEndEvent
	| PiAutoRetryStartEvent
	| PiAutoRetryEndEvent
	| PiDoneEvent
	| PiErrorEvent;

// Assistant message event subtypes
export type AssistantMessageEvent =
	| { type: "start" }
	| { type: "text_start"; contentIndex: number; partial: PiAgentMessage }
	| { type: "text_delta"; contentIndex: number; delta: string; partial: PiAgentMessage }
	| { type: "text_end"; contentIndex: number; content: string; partial: PiAgentMessage }
	| { type: "thinking_start"; contentIndex: number; partial: PiAgentMessage }
	| { type: "thinking_delta"; contentIndex: number; delta: string; partial: PiAgentMessage }
	| { type: "thinking_end"; contentIndex: number; partial: PiAgentMessage }
	| { type: "toolcall_start"; contentIndex: number; partial: PiAgentMessage }
	| { type: "toolcall_delta"; contentIndex: number; delta: string; partial: PiAgentMessage }
	| { type: "toolcall_end"; contentIndex: number; toolCall: PiToolCall; partial: PiAgentMessage }
	| { type: "done"; reason: "stop" | "length" | "toolUse" }
	| { type: "error"; reason: "aborted" | "error" };

// Message content types
export type PiMessageContent =
	| { type: "text"; text: string }
	| { type: "thinking"; thinking: string; thinkingSignature?: string }
	| {
			type: "toolCall";
			id: string;
			name: string;
			arguments: Record<string, unknown>;
			partialArgs?: string;
			streamIndex?: number;
	  }
	| { type: "tool_use"; toolCall: PiToolCall } // legacy
	| { type: "image"; source: { type: string; mediaType: string; data: string } };

// Actual format from pi --mode json toolcall_end events
export interface PiToolCall {
	type: "toolCall";
	id: string;
	name: string;
	arguments: Record<string, unknown>;
	partialArgs?: string;
	streamIndex?: number;
}

// Legacy format (Anthropic-style) — not emitted by pi but kept for compat
export interface PiToolCallLegacy {
	id: string;
	type: "function";
	function: {
		name: string;
		arguments: string;
	};
}

export interface PiAgentMessage {
	role: "user" | "assistant" | "system" | "tool" | "custom" | "toolResult";
	content: PiMessageContent[];
	timestamp?: number;
	api?: string;
	provider?: string;
	model?: string;
	customType?: string;
	display?: boolean;
	usage?: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		totalTokens: number;
		cost: {
			input: number;
			output: number;
			cacheRead: number;
			cacheWrite: number;
			total: number;
		};
	};
	stopReason?: string;
	responseId?: string;
	toolCallId?: string;
	toolName?: string;
	isError?: boolean;
}

export interface PiToolResultMessage {
	role: "toolResult";
	toolCallId: string;
	toolName?: string;
	content: Array<{ type: string; text: string }>;
	details?: Record<string, unknown>;
	isError?: boolean;
	timestamp?: number;
}
