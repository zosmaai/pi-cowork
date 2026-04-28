import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const html = document.documentElement;
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const hasDarkClass = html.classList.contains("dark");
		setIsDark(hasDarkClass || prefersDark);
	}, []);

	function toggle() {
		const html = document.documentElement;
		if (html.classList.contains("dark")) {
			html.classList.remove("dark");
			html.classList.add("light");
			setIsDark(false);
		} else {
			html.classList.add("dark");
			html.classList.remove("light");
			setIsDark(true);
		}
	}

	return (
		<button
			type="button"
			onClick={toggle}
			className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
		</button>
	);
}
