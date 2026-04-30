import type { ModelInfo } from "@/types";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ModelSelectorProps {
	models: ModelInfo[];
	currentModelId?: string;
	onSelect: (provider: string, modelId: string) => void;
}

export function ModelSelector({ models, currentModelId, onSelect }: ModelSelectorProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [open]);

	const current = models.find((m) => m.id === currentModelId);
	const label = current?.name || currentModelId || "Default";

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
			>
				<span className="max-w-[120px] truncate">{label}</span>
				<ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
			</button>
			{open && (
				<div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border bg-popover shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
					{models.map((model) => (
						<button
							key={model.id}
							type="button"
							onClick={() => {
								onSelect(model.provider, model.id);
								setOpen(false);
							}}
							className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
								model.id === currentModelId ? "text-primary font-medium" : "text-foreground"
							}`}
						>
							<span className="truncate">{model.name}</span>
							{model.id === currentModelId && <span className="text-primary">✓</span>}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
