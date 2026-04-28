import {
	readTextFile,
	writeTextFile,
	readDir,
	mkdir,
	remove,
	exists,
} from "@tauri-apps/plugin-fs";
import { join, homeDir } from "@tauri-apps/api/path";

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

async function sessionDir(): Promise<string> {
	const home = await homeDir();
	return join(home, "pi-cowork", "sessions");
}

function extractTitle(lines: string[]): string {
	for (const line of lines) {
		try {
			const e = JSON.parse(line);
			if (e.type === "message_start" && e.message?.role === "user") {
				const text = e.message.content?.[0]?.text || "";
				return text.length > 80 ? `${text.slice(0, 80)}...` : text;
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
		const content = await readTextFile(join(dir, file.name));
		const lines = content.trim().split("\n");
		if (lines.length === 0) continue;

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
	}
	return sessions;
}

export async function writeSession(
	id: string,
	events: Record<string, unknown>[],
): Promise<void> {
	const dir = await sessionDir();
	await mkdir(dir, { recursive: true });

	const header = events[0];
	const ts = (header.timestamp as string) || new Date().toISOString();
	const safeTs = ts.replace(/[:.]/g, "-");
	const filename = `${safeTs}_${id}.jsonl`;
	const content = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
	await writeTextFile(join(dir, filename), content);
}

export async function readSession(
	id: string,
): Promise<SessionData | null> {
	const dir = await sessionDir();

	const dirExists = await exists(dir);
	if (!dirExists) return null;

	const entries = await readDir(dir);
	const match = entries.find((e) => e.name?.includes(id));
	if (!match || !match.name) return null;

	const content = await readTextFile(join(dir, match.name));
	const lines = content.trim().split("\n");
	const events = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
	const header = events[0] as Record<string, unknown>;

	return {
		meta: {
			id: (header.id as string) || id,
			title: extractTitle(lines),
			timestamp: new Date(header.timestamp as string).getTime(),
			messageCount: events.filter(
				(e) =>
					(e as any).type === "message_start" &&
					(e as any).message?.role === "user",
			).length,
		},
		events,
	};
}

export async function deleteSession(id: string): Promise<void> {
	const dir = await sessionDir();

	const dirExists = await exists(dir);
	if (!dirExists) return;

	const entries = await readDir(dir);
	const match = entries.find((e) => e.name?.includes(id));
	if (match?.name) {
		await remove(join(dir, match.name));
	}
}
