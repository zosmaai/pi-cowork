import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const THEMES = ["warm-light", "dark", "midnight"] as const;
type ThemeName = (typeof THEMES)[number];

const THEME_LABELS: Record<ThemeName, string> = {
	"warm-light": "Light",
	dark: "Dark",
	midnight: "Midnight",
};

function getSystemTheme(): ThemeName {
	try {
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		return prefersDark ? "dark" : "warm-light";
	} catch {
		return "dark";
	}
}

function applyTheme(theme: ThemeName) {
	const html = document.documentElement;
	// Remove all theme attributes
	for (const t of THEMES) {
		html.removeAttribute(`data-theme-${t}`);
	}
	// Remove old class-based dark/light
	html.classList.remove("dark", "light");

	if (theme === "warm-light") {
		// Light theme: no data-theme needed (it's the :root default)
		// But also handle system preference
		const sysTheme = getSystemTheme();
		if (sysTheme === "dark" || sysTheme === "midnight") {
			// If system is dark, we need to explicitly set warm-light
			html.setAttribute("data-theme", "warm-light");
		}
	} else {
		html.setAttribute("data-theme", theme);
	}

	// Store preference
	try {
		localStorage.setItem("pi-cowork-theme", theme);
	} catch {
		// localStorage not available
	}
}

function getStoredTheme(): ThemeName {
	try {
		const stored = localStorage.getItem("pi-cowork-theme");
		if (stored && THEMES.includes(stored as ThemeName)) {
			return stored as ThemeName;
		}
	} catch {
		// localStorage not available (test env, SSR, etc.)
	}
	return getSystemTheme();
}

export function ThemeToggle() {
	const [currentTheme, setCurrentTheme] = useState<ThemeName>("dark");
	const [showPicker, setShowPicker] = useState(false);

	// Initialize on mount
	useEffect(() => {
		const theme = getStoredTheme();
		setCurrentTheme(theme);
		applyTheme(theme);
	}, []);

	function cycleTheme() {
		const currentIdx = THEMES.indexOf(currentTheme);
		const next = THEMES[(currentIdx + 1) % THEMES.length];
		setCurrentTheme(next);
		applyTheme(next);
		setShowPicker(false);
	}

	// Determine the icon
	return (
		<div className="relative">
			<button
				type="button"
				onClick={cycleTheme}
				onContextMenu={(e) => {
					e.preventDefault();
					setShowPicker(!showPicker);
				}}
				className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
				aria-label={`Current theme: ${THEME_LABELS[currentTheme]}. Click to cycle, right-click for picker.`}
				title={THEME_LABELS[currentTheme]}
			>
				{currentTheme === "warm-light" ? (
					<Sun className="w-4 h-4" />
				) : currentTheme === "midnight" ? (
					<Monitor className="w-4 h-4" />
				) : (
					<Moon className="w-4 h-4" />
				)}
			</button>

			{/* Quick picker dropdown (right-click) */}
			{showPicker && (
				<div
					className="absolute bottom-full right-0 mb-2 rounded-lg border shadow-lg p-1 min-w-28 animate-fade-in-scale z-50"
					style={{
						background: "hsl(var(--card))",
						borderColor: "hsl(var(--border))",
					}}
				>
					{THEMES.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => {
								setCurrentTheme(t);
								applyTheme(t);
								setShowPicker(false);
							}}
							className="w-full text-left px-3 py-1.5 text-xs rounded transition-colors"
							style={{
								color: t === currentTheme ? "hsl(var(--primary))" : "hsl(var(--foreground))",
								background: t === currentTheme ? "hsl(var(--primary) / 0.1)" : "transparent",
							}}
						>
							{THEME_LABELS[t]}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
