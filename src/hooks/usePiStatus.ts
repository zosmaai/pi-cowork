import type { PiStatus } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export function usePiStatus() {
	const [status, setStatus] = useState<PiStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const checkStatus = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await invoke<PiStatus>("check_pi_status");
			setStatus(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		checkStatus();
	}, [checkStatus]);

	return { status, loading, error, refetch: checkStatus };
}
