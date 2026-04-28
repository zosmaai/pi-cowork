import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
	it("merges multiple class strings", () => {
		const result = cn("foo", "bar");
		expect(result).toBe("foo bar");
	});

	it("handles conditional classes with objects", () => {
		const result = cn("base", { active: true, disabled: false });
		expect(result).toBe("base active");
	});

	it("filters out falsy values", () => {
		const result = cn("foo", null, undefined, false, "bar");
		expect(result).toBe("foo bar");
	});

	it("resolves tailwind conflicts", () => {
		const result = cn("px-2 py-1", "px-4");
		expect(result).toBe("py-1 px-4");
	});

	it("returns empty string when given no valid classes", () => {
		const result = cn(null, undefined, false);
		expect(result).toBe("");
	});
});
