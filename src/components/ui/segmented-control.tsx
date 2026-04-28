import { cn } from "@/lib/utils";

interface SegmentedControlProps {
	options: { value: string; label: string }[];
	value: string;
	onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
	return (
		<div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					className={cn(
						"flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
						value === option.value
							? "bg-card text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
