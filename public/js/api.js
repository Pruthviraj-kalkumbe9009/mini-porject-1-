"use strict";

const API = {
    BASE_URL: window.location.port === "5000" || !["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "/api"
        : `http://${window.location.hostname}:5000/api`,
    accessToken: null
};

function apiError(message, status) {
    const error = new Error(message || "Request failed.");
    error.status = status;
    return error;
}

async function parseResponse(response) {
    const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) throw apiError(data.message || "Request failed.", response.status);
    return data;
}

async function refreshAccessToken() {
    const response = await fetch(`${API.BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include"
    });
    if (!response.ok) {
        API.accessToken = null;
        return false;
    }
    const data = await response.json();
    API.accessToken = data.accessToken || null;
    return Boolean(API.accessToken);
}

async function request(endpoint, options = {}, retry = true) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (API.accessToken) headers.set("Authorization", `Bearer ${API.accessToken}`);

    const response = await fetch(`${API.BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: "include"
    });

    if (response.status === 401 && retry && !endpoint.startsWith("/auth/")) {
        const refreshed = await refreshAccessToken();
        if (refreshed) return request(endpoint, options, false);
    }
    return parseResponse(response);
}

const APIClient = Object.assign(API, {
    setAccessToken(token) {
        API.accessToken = token || null;
    },
    getAccessToken() {
        return API.accessToken;
    },
    clearAccessToken() {
        API.accessToken = null;
    },
    get(endpoint) {
        return request(endpoint, { method: "GET" });
    },
    post(endpoint, body) {
        return request(endpoint, { method: "POST", body: JSON.stringify(body ?? {}) });
    },
    put(endpoint, body) {
        return request(endpoint, { method: "PUT", body: JSON.stringify(body ?? {}) });
    },
    delete(endpoint) {
        return request(endpoint, { method: "DELETE" });
    },
    login(credentials) {
        return request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }, false);
    },
    signup(details) {
        return request("/auth/signup", { method: "POST", body: JSON.stringify(details) }, false);
    },
    refreshAccessToken,
    async logoutUser() {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 3000);
        try {
            return await request("/auth/logout", {
                method: "POST",
                signal: controller.signal
            }, false);
        } finally {
            window.clearTimeout(timeout);
            API.accessToken = null;
        }
    },
    completeOnboarding(profile) {
        return request("/student/onboarding", { method: "POST", body: JSON.stringify(profile) });
    },
    applyLeave(leave) {
        return request("/faculty/leaves", { method: "POST", body: JSON.stringify(leave) });
    },
    generateTimetable() {
        return request("/admin/timetable/generate", { method: "POST", body: "{}" });
    },
    publishTimetable() {
        return request("/admin/timetable/publish", { method: "POST", body: "{}" });
    }
});

window.API = APIClient;
