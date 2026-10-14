"use strict";

require("dotenv").config();

const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { User } = require("./server/models");
const seed = require("./server/seed");
const { router: api } = require("./server/routes");

const app = express();
const port = Number(process.env.PORT) || 5000;
const publicDir = path.join(__dirname, "public");
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "development-refresh-secret-change-before-deploy";
const REFRESH_COOKIE = "sctsRefresh";

if (process.env.NODE_ENV === "production") {
    for (const key of ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"]) {
        if (!process.env[key] || process.env[key].length < 32) {
            throw new Error(`${key} must be set to a random secret with at least 32 characters in production.`);
        }
    }
}

app.disable("x-powered-by");
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" }
}));
const allowedOrigins = new Set(
    [process.env.CLIENT_ORIGIN, ...(process.env.NODE_ENV === "production"
        ? []
        : ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:5501", "http://127.0.0.1:5501"])]
        .filter(Boolean)
);
app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && allowedOrigins.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    }
    if (req.method === "OPTIONS") return res.sendStatus(origin && !allowedOrigins.has(origin) ? 403 : 204);
    return next();
});
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) req.body = {};
    next();
});
app.use(cookieParser());
app.use("/api", api);

function pagePermissions(pathname, role) {
    if (pathname.startsWith("/admin/")) return role === "admin";
    if (pathname.startsWith("/faculty/")) return role === "admin" || role === "faculty";
    if (pathname.startsWith("/student/")) return ["admin", "faculty", "student"].includes(role);
    return true;
}

app.get(/^\/(admin|faculty|student)\/.*\.html$/, async (req, res, next) => {
    const pagePath = req.path;
    try {
        const token = req.cookies[REFRESH_COOKIE];
        if (!token) return res.redirect(303, "/login.html");
        const claims = jwt.verify(token, REFRESH_SECRET);
        const user = await User.findById(claims.sub);
        if (!user || user.tokenVersion !== claims.version || !pagePermissions(pagePath, user.role)) {
            return res.redirect(303, "/403.html");
        }
        if (user.role === "student" && !user.isProfileComplete && pagePath !== "/student/onboarding.html") {
            return res.redirect(303, "/student/onboarding.html");
        }
        if (user.role === "student" && user.isProfileComplete && pagePath === "/student/onboarding.html") {
            return res.redirect(303, "/student/dashboard.html");
        }
        return next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.redirect(303, "/login.html");
        }
        return next(error);
    }
});

app.use(express.static(publicDir, {
    dotfiles: "deny",
    index: "index.html",
    fallthrough: true
}));

app.use("/api", (req, res) => res.status(404).json({ message: "API endpoint not found." }));
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.name === "ValidationError") {
        return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
        return res.status(409).json({ message: "A record with that unique value already exists." });
    }
    const status = Number.isInteger(err.status) ? err.status : 500;
    if (status >= 500) console.error(err);
    return res.status(status).json({ message: status >= 500 ? "An unexpected server error occurred." : err.message });
});

async function start() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Set MONGODB_URI in your environment or .env file.");
    await mongoose.connect(uri);
    await seed();
    app.listen(port, () => console.log(`Smart Scheduler server listening at http://localhost:${port}`));
}

start().catch((error) => {
    console.error("Server startup failed:", error);
    process.exitCode = 1;
});
