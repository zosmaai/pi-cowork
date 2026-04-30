import type { ExtensionInfo } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export function useExtensions() {
	const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const list = await invoke<ExtensionInfo[]>("list_extensions");
			setExtensions(list);
		} catch (err) {
			console.error("Failed to load extensions:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { extensions, loading, refresh };
}
