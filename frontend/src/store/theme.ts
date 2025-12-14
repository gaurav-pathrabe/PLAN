/**
 * theme.ts - Light/dark theme system
 * 
 * Manages theme preference with local persistence and smooth transitions
 */

export type Theme = 'light' | 'dark';

const THEME_KEY = 'plan-theme';

/**
 * Get the current theme from localStorage or system preference
 */
export function getTheme(): Theme {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }

    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }

    return 'light';
}

/**
 * Set the theme and persist to localStorage
 */
export function setTheme(theme: Theme): void {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
}

/**
 * Toggle between light and dark theme with smooth transition
 */
export function toggleTheme(): Theme {
    const current = getTheme();
    const next: Theme = current === 'light' ? 'dark' : 'light';

    // Enable transition before changing
    enableThemeTransition();

    setTheme(next);

    // Disable transition after animation completes
    setTimeout(() => {
        disableThemeTransition();
    }, 400);

    return next;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
    // Apply to both html and body for complete coverage
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
    }
}

/**
 * Enable smooth transition for theme changes
 */
function enableThemeTransition(): void {
    document.documentElement.classList.add('theme-transition');
    document.body.classList.add('theme-transition');
}

/**
 * Disable theme transition to prevent unwanted animations
 */
function disableThemeTransition(): void {
    document.documentElement.classList.remove('theme-transition');
    document.body.classList.remove('theme-transition');
}

/**
 * Initialize theme on app load (no transition)
 */
export function initializeTheme(): Theme {
    const theme = getTheme();

    // Apply immediately without transition
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    return theme;
}
