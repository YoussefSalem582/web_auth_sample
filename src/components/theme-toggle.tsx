"use client";

/**
 * Toggles the `dark` class on <html> and remembers the choice.
 * The icon is picked by CSS, not React state, so there is nothing to hydrate.
 */
export function ThemeToggle({ label }: { label: string }) {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-border/40"
    >
      <span className="dark:hidden">☾</span>
      <span className="hidden dark:inline">☀︎</span>
    </button>
  );
}
