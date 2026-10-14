"use strict";

(() => {
    const storageKey = "theme";
    const root = document.documentElement;

    function isDark() {
        return root.classList.contains("dark");
    }

    function syncThemeButton() {
        const button = document.getElementById("themeToggle");
        if (!button) return;
        const dark = isDark();
        button.textContent = dark ? "☀️" : "◐";
        button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
        button.title = dark ? "Switch to light mode" : "Switch to dark mode";
        button.setAttribute("aria-pressed", String(dark));
    }

    function setTheme(dark) {
        root.classList.toggle("dark", dark);
        document.body?.classList.toggle("dark", dark);
        try {
            localStorage.setItem(storageKey, dark ? "dark" : "light");
        } catch (error) {
            console.warn("Theme preference could not be saved.", error);
        }
        syncThemeButton();
    }

    try {
        root.classList.toggle("dark", localStorage.getItem(storageKey) === "dark");
    } catch (error) {
        console.warn("Theme preference could not be loaded.", error);
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.body.classList.toggle("dark", isDark());
        syncThemeButton();

        document.getElementById("themeToggle")?.addEventListener("click", () => {
            setTheme(!isDark());
        });
    });

    window.Theme = {
        set: setTheme,
        toggle: () => setTheme(!isDark()),
        isDark
    };
})();
