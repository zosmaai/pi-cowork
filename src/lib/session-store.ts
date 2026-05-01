import type { ChatMessage, ToolCallInfo } from "@/types";
import { homeDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";

export interface SessionMeta {
	id: string;
	title: string;
	timestamp: number;
	messageCount: number;
}

export interface SessionData {
	meta: SessionMeta;
	events: Record<string, unknown>[];
}

/**
 * Convert pi JSON stream events into ChatMessage[] for display.
 * Handles all message types: user, assistant, custom, toolResult.
 * Preserves thinking, tool calls, model info.
 */
export function piEventsToChatMessages(events: Record<string, unknown>[]): ChatMessage[] {
	const messages: ChatMessage[] = [];

	for (const event of events) {
		const type = event.type as string;

		if (type === "message_start") {
			const msg = event.message as Record<string, unknown> | undefined;
			if (!msg) continue;
			const role = msg.role as string;

			// Skip non-displayable messages (custom like memex-recall-reminder)
			if (role === "custom") continue;

			// Build a ChatMessage from the message content
			const chatMsg = piMessageToChatMessage(msg);
			if (chatMsg) messages.push(chatMsg);
		} else if (type === "turn_start" || type === "agent_start" || type === "session") {
		} else if (type === "message_update") {
			// Last message_update with text_delta content should override last assistant message
			const msg = event.message as Record<string, unknown> | undefined;
			const ame = event.assistantMessageEvent as Record<string, unknown> | undefined;
			if (!msg || !ame) continue;

			const ameType = ame.type as string;
			// Only process final-state updates (text_end, toolcall_end, thinking_end)
			if (ameType === "text_end" || ameType === "toolcall_end" || ameType === "thinking_end") {
				const chatMsg = piMessageToChatMessage(msg);
				if (chatMsg && messages.length > 0) {
					// Replace the last assistant message with the updated version
					const last = messages[messages.length - 1];
					if (last.role === "assistant") {
						messages[messages.length - 1] = chatMsg;
					} else {
						messages.push(chatMsg);
					}
				} else if (chatMsg) {
					messages.push(chatMsg);
				}
			}
		} else if (type === "message_end") {
			// Final complete message state — use this as authoritative
			const msg = event.message as Record<string, unknown> | undefined;
			if (!msg) continue;
			const role = msg.role as string;
			if (role === "custom") continue;

			const chatMsg = piMessageToChatMessage(msg);
			if (chatMsg) {
				// Replace last message of same role, or append
				const last = messages.length > 0 ? messages[messages.length - 1] : null;
				if (last && last.role === chatMsg.role) {
					messages[messages.length - 1] = chatMsg;
				} else {
					messages.push(chatMsg);
				}
			}
		} else if (type === "turn_end") {
			// Turn end has final message and tool results
			const msg = event.message as Record<string, unknown> | undefined;
			if (!msg) continue;
			const chatMsg = piMessageToChatMessage(msg);
			if (chatMsg) {
				// Replace or append
				const last = messages.length > 0 ? messages[messages.length - 1] : null;
				if (last && last.role === "assistant") {
					messages[messages.length - 1] = chatMsg;
				} else {
					messages.push(chatMsg);
				}
			}
		} else if (type === "tool_execution_end") {
			// Attach tool results to the last assistant message's tool calls
			const toolCallId = event.toolCallId as string;
			const resultContent = (event.result as Record<string, unknown>)?.content as
				| Array<{ type: string; text: string }>
				| undefined;
			const isError = event.isError as boolean | undefined;
			const resultText = resultContent?.map((c) => c.text).join("") || "";

			// Find the last assistant message and update its tool call result
			for (let i = messages.length - 1; i >= 0; i--) {
				if (messages[i].role === "assistant" && messages[i].toolCalls) {
					const tc = messages[i].toolCalls?.find((t) => t.id === toolCallId);
					if (tc) {
						tc.result = resultText;
						tc.status = isError ? "error" : "completed";
						tc.isError = isError;
					}
					break;
				}
			}
		}
	}

	return messages;
}

/**
 * Convert a single pi message object to a ChatMessage.
 */
function piMessageToChatMessage(msg: Record<string, unknown>): ChatMessage | null {
	const role = msg.role as string;
	if (role !== "user" && role !== "assistant") return null;

	const content = msg.content as Array<Record<string, unknown>> | undefined;
	let text = "";
	let thinking = "";
	const toolCalls: ToolCallInfo[] = [];

	if (Array.isArray(content)) {
		for (const block of content) {
			const blockType = block.type as string;
			if (blockType === "text") {
				text += (block.text as string) || "";
			} else if (blockType === "thinking") {
				thinking += (block.thinking as string) || "";
			} else if (blockType === "toolCall") {
				toolCalls.push({
					id: (block.id as string) || "",
					name: (block.name as string) || "unknown",
					args: (block.arguments as Record<string, unknown>) || {},
					status: "completed" as const,
					result: "",
				});
			} else if (blockType === "tool_use") {
				// Legacy format
				const tc = block.toolCall as Record<string, unknown> | undefined;
				if (tc) {
					toolCalls.push({
						id: (tc.id as string) || "",
						name:
							((tc.function as Record<string, unknown>)?.name as string) ||
							(tc.name as string) ||
							"unknown",
						args: (() => {
							try {
								const rawArgs = (tc.function as Record<string, unknown>)?.arguments || tc.arguments;
								if (typeof rawArgs === "string") return JSON.parse(rawArgs);
								return (rawArgs as Record<string, unknown>) || {};
							} catch {
								return {};
							}
						})(),
						status: "completed" as const,
						result: "",
					});
				}
			}
		}
	} else if (typeof msg.content === "string") {
		text = msg.content;
	}

	// Skip empty custom/system messages
	if (!text && !thinking && toolCalls.length === 0 && role === "user") {
		// User messages should always have content
		return null;
	}

	return {
		id: crypto.randomUUID(),
		role: role as "user" | "assistant",
		content: text,
		timestamp: (msg.timestamp as number) || Date.now(),
		...(thinking ? { thinking } : {}),
		...(toolCalls.length > 0 ? { toolCalls } : {}),
		...(msg.model ? { model: msg.model as string } : {}),
		...(msg.provider ? { provider: msg.provider as string } : {}),
	};
}

/**
 * Convert ChatMessage[] to serializable events for writing to disk.
 * Stores in pi's native JSON stream format so sessions are portable.
 */
export function chatMessagesToEvents(
	sessionId: string,
	messages: ChatMessage[],
): Record<string, unknown>[] {
	const events: Record<string, unknown>[] = [
		{
			type: "session",
			version: 3,
			id: sessionId,
			timestamp: new Date().toISOString(),
			cwd: "",
		},
	];

	for (const msg of messages) {
		const content: Array<Record<string, unknown>> = [];

		if (msg.thinking) {
			content.push({
				type: "thinking",
				thinking: msg.thinking,
				thinkingSignature: "session-restore",
			});
		}

		if (msg.content) {
			content.push({
				type: "text",
				text: msg.content,
			});
		}

		if (msg.toolCalls && msg.toolCalls.length > 0) {
			for (const tc of msg.toolCalls) {
				content.push({
					type: "toolCall",
					id: tc.id,
					name: tc.name,
					arguments: tc.args,
				});
			}
		}

		if (content.length === 0) continue;

		events.push({
			type: "message_start",
			message: {
				role: msg.role,
				content,
				timestamp: msg.timestamp,
				...(msg.model ? { model: msg.model } : {}),
				...(msg.provider ? { provider: msg.provider } : {}),
			},
		});

		events.push({
			type: "message_end",
			message: {
				role: msg.role,
				content,
				timestamp: msg.timestamp,
			},
		});

		// Emit tool_execution_end events for tool call results
		if (msg.toolCalls) {
			for (const tc of msg.toolCalls) {
				if (tc.result) {
					events.push({
						type: "tool_execution_end",
						toolCallId: tc.id,
						toolName: tc.name,
						result: {
							content: [{ type: "text", text: tc.result }],
						},
						isError: tc.isError || false,
					});
				}
			}
		}
	}

	events.push({ type: "agent_end", messages: [] });

	return events;
}

async function sessionDir(): Promise<string> {
	const home = await homeDir();
	return join(home, ".zosmaai", "cowork");
}

function extractTitle(lines: string[]): string {
	for (const line of lines) {
		try {
			const e = JSON.parse(line);
			if (e.type === "message_start" && e.message?.role === "user") {
				const content = e.message.content;
				if (Array.isArray(content)) {
					const text = content.find((c: Record<string, unknown>) => c.type === "text")?.text || "";
					return text.length > 80 ? `${text.slice(0, 80)}...` : text;
				}
				if (typeof content === "string") {
					return content.length > 80 ? `${content.slice(0, 80)}...` : content;
				}
			}
		} catch {
			// skip unparseable lines
		}
	}
	return "Untitled session";
}

export async function listSessions(): Promise<SessionMeta[]> {
	const dir = await sessionDir();

	const dirExists = await exists(dir);
	if (!dirExists) return [];

	const entries = await readDir(dir);
	const jsonlFiles = entries
		.filter((e) => e.name?.endsWith(".jsonl"))
		.sort((a, b) => ((b.name || "") > (a.name || "") ? 1 : -1));

	const sessions: SessionMeta[] = [];
	for (const file of jsonlFiles) {
		if (!file.name) continue;
		const content = await readTextFile(await join(dir, file.name));
		const lines = content.trim().split("\n");
		if (lines.length === 0) continue;

		try {
			const header = JSON.parse(lines[0]);
			const userMsgs = lines.filter((l) => {
				try {
					const e = JSON.parse(l);
					return e.type === "message_start" && e.message?.role === "user";
				} catch {
					return false;
				}
			});

			sessions.push({
				id: header.id || file.name.replace(".jsonl", ""),
				title: extractTitle(lines),
				timestamp: new Date(header.timestamp).getTime(),
				messageCount: userMsgs.length,
			});
		} catch {
			// Skip malformed session files
		}
	}
	return sessions;
}

export async function writeSession(id: string, events: Record<string, unknown>[]): Promise<void> {
	const dir = await sessionDir();
	await mkdir(dir, { recursive: true });

	// Remove any existing file for this session ID to prevent duplicates
	const dirExists = await exists(dir);
	if (dirExists) {
		const entries = await readDir(dir);
		const existing = entries.find((e) => e.name?.includes(id));
		if (existing?.name) {
			await remove(await join(dir, existing.name));
		}
	}

	const header = events[0];
	const ts = (header.timestamp as string) || new Date().toISOString();
	const safeTs = ts.replace(/[:.]/g, "-");
	const filename = `${safeTs}_${id}.jsonl`;
	const content = `${events.map((e) => JSON.stringify(e)).join("\n")}\n`;
	await writeTextFile(await join(dir, filename), content);
}

export async function readSession(id: string): Promise<SessionData | null> {
	const dir = await sessionDir();

	const dirExists = await exists(dir);
	if (!dirExists) return null;

	const entries = await readDir(dir);
	const match = entries.find((e) => e.name?.includes(id));
	if (!match?.name) return null;

	const content = await readTextFile(await join(dir, match.name));
	const lines = content.trim().split("\n");
	if (lines.length === 0) return null;

	try {
		const events = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
		const header = events[0];

		return {
			meta: {
				id: (header.id as string) || id,
				title: extractTitle(lines),
				timestamp: new Date(header.timestamp as string).getTime(),
				messageCount: events.filter(
					(e) =>
						(e as Record<string, unknown>).type === "message_start" &&
						((e as Record<string, unknown>).message as Record<string, unknown>)?.role === "user",
				).length,
			},
			events,
		};
	} catch {
		return null;
	}
}

export async function deleteSession(id: string): Promise<void> {
	const dir = await sessionDir();

	const dirExists = await exists(dir);
	if (!dirExists) return;

	const entries = await readDir(dir);
	const match = entries.find((e) => e.name?.includes(id));
	if (match?.name) {
		await remove(await join(dir, match.name));
	}
}
