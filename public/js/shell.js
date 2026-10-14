/**
 * Shared app chrome: mobile sidebar, theme, logout.
 * Used by Admin, Faculty, and Student pages.
 */
"use strict";

const AppShell = (() => {
    function bindSidebar() {
        const sidebar = document.querySelector(".sidebar");
        const toggle = document.getElementById("sidebarToggle");
        const backdrop = document.getElementById("sidebarBackdrop");
        if (!sidebar || !toggle) return;

        const close = () => {
            sidebar.classList.remove("open");
            document.body.classList.remove("nav-open");
        };
        const open = () => {
            sidebar.classList.add("open");
            document.body.classList.add("nav-open");
        };

        toggle.addEventListener("click", () => {
            if (sidebar.classList.contains("open")) close();
            else open();
        });
        backdrop?.addEventListener("click", close);
        sidebar.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    }

    function bindLogout() {
        document.getElementById("logoutBtn")?.addEventListener("click", async (event) => {
            event.preventDefault();
            const button = event.currentTarget;
            button?.setAttribute("aria-disabled", "true");
            const destination = button.href || new URL("../index.html", window.location.href).href;
            if (window.DemoStore) DemoStore.clearSession();
            if (window.API?.clearAccessToken) API.clearAccessToken();
            try {
                if (window.API?.logoutUser) {
                    await API.logoutUser();
                } else {
                    const response = await fetch("/api/auth/logout", {
                        method: "POST",
                        credentials: "include"
                    });
                    if (!response.ok) throw new Error(`Logout request failed (${response.status}).`);
                }
            } catch (error) {
                console.warn("Server logout failed; local session was cleared.", error);
            } finally {
                window.location.replace(destination);
            }
        });
    }

    function init() {
        if (!window.DemoStore?.getSession()) {
            window.location.replace(new URL("../login.html", window.location.href).href);
            return;
        }
        bindSidebar();
        bindLogout();
    }

    document.addEventListener("DOMContentLoaded", init);
    return { init };
})();

window.AppShell = AppShell;
