/**
 * Convenience RBAC redirect. Real protection is Express static-route guards.
 * Uses the in-memory/session demo user until JWT auth is live.
 */
"use strict";

(function pageGuard() {
    const path = window.location.pathname.replace(/\\/g, "/");
    const session = window.DemoStore ? DemoStore.getSession() : null;
    const needsAuth = /\/(admin|faculty|student)\//.test(path);

    function loginUrl() {
        return new URL("../login.html", window.location.href).href;
    }

    function forbiddenUrl() {
        return new URL("../403.html", window.location.href).href;
    }

    if (!needsAuth) return;

    if (!session) {
        window.location.replace(loginUrl());
        return;
    }

    if (path.includes("/admin/") && session.role !== "admin") {
        window.location.replace(forbiddenUrl());
        return;
    }

    if (path.includes("/faculty/") && session.role === "student") {
        window.location.replace(forbiddenUrl());
        return;
    }

    if (
        session.role === "student" &&
        session.isProfileComplete === false &&
        path.includes("/student/") &&
        !path.includes("onboarding")
    ) {
        window.location.replace(new URL("onboarding.html", window.location.href).href);
    }
})();
