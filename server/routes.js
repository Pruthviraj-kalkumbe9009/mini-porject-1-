"use strict";

const crypto = require("node:crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { User, AppData } = require("./models");
const data = require("./data");

const router = express.Router();
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "development-access-secret-change-before-deploy";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "development-refresh-secret-change-before-deploy";
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || "7d";
const COOKIE_NAME = "sctsRefresh";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
};

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function fail(status, message) {
    return Object.assign(new Error(message), { status });
}

function safeUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
        isApproved: user.isApproved,
        batchId: user.batchId,
        facultyId: user.facultyId,
        rollNumber: user.rollNumber || null,
        profile: user.profile || {}
    };
}

function issueTokens(user) {
    const claims = { sub: user._id, version: user.tokenVersion, role: user.role };
    return {
        accessToken: jwt.sign(claims, ACCESS_SECRET, { expiresIn: ACCESS_TTL }),
        refreshToken: jwt.sign(claims, REFRESH_SECRET, { expiresIn: REFRESH_TTL })
    };
}

function setRefreshCookie(res, token) {
    const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    const match = /^(\d+)([smhd])$/.exec(REFRESH_TTL);
    res.cookie(COOKIE_NAME, token, {
        ...COOKIE_OPTIONS,
        maxAge: match ? Number(match[1]) * units[match[2]] : 7 * 24 * 60 * 60 * 1000
    });
}

async function userFromRefreshToken(token) {
    if (!token) return null;
    let claims;
    try {
        claims = jwt.verify(token, REFRESH_SECRET);
    } catch {
        return null;
    }
    const user = await User.findById(claims.sub);
    return user && user.tokenVersion === claims.version ? user : null;
}

function authenticate(req, res, next) {
    const header = req.get("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) return next(fail(401, "Sign in to continue."));
    let claims;
    try {
        claims = jwt.verify(match[1], ACCESS_SECRET);
    } catch {
        return next(fail(401, "Your session has expired. Sign in again."));
    }
    return User.findById(claims.sub).then((user) => {
        if (!user || user.tokenVersion !== claims.version) {
            return next(fail(401, "Your session has expired. Sign in again."));
        }
        req.user = user;
        return next();
    }).catch(next);
}

function roles(...allowed) {
    return (req, res, next) => {
        if (!req.user || !allowed.includes(req.user.role)) {
            return next(fail(403, "You do not have permission to perform this action."));
        }
        return next();
    };
}

function requiredString(value, label, max = 160) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
        throw fail(400, `${label} is required and must be at most ${max} characters.`);
    }
    return value.trim();
}

function validateCatalogRecord(bucket, record) {
    if (bucket === "departments") {
        return {
            ...record,
            name: requiredString(record.name, "Department name", 120),
            code: requiredString(record.code, "Department code", 20)
        };
    }
    if (bucket === "programs") {
        return {
            ...record,
            name: requiredString(record.name, "Program name", 160),
            departmentId: requiredString(record.departmentId, "Department")
        };
    }
    if (bucket === "batches") {
        const studentCount = Number(record.studentCount || 0);
        if (!Number.isInteger(studentCount) || studentCount < 0) throw fail(400, "Student count must be zero or a positive whole number.");
        return {
            ...record,
            departmentId: requiredString(record.departmentId, "Department"),
            year: requiredString(String(record.year || ""), "Year / class", 40),
            semester: requiredString(String(record.semester || ""), "Semester", 40),
            division: requiredString(record.division, "Division", 40),
            practicalBatch: requiredString(record.practicalBatch, "Practical batch", 40),
            studentCount
        };
    }
    if (bucket === "faculty") {
        const email = requiredString(record.email, "Faculty email", 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "Enter a valid faculty email.");
        const maxPerDay = Number(record.maxPerDay || 4);
        const maxPerWeek = Number(record.maxPerWeek || 16);
        const availableDays = Array.isArray(record.availableDays) ? record.availableDays : [1, 2, 3, 4, 5];
        if (!Number.isInteger(maxPerDay) || maxPerDay < 1 || !Number.isInteger(maxPerWeek) || maxPerWeek < 1 ||
            availableDays.some((day) => !Number.isInteger(Number(day)) || Number(day) < 1 || Number(day) > 6)) {
            throw fail(400, "Faculty workload and available days are invalid.");
        }
        return {
            ...record,
            name: requiredString(record.name, "Faculty name", 120),
            email,
            maxPerDay,
            maxPerWeek,
            subjects: Array.isArray(record.subjects) ? record.subjects : [],
            availableDays: availableDays.map(Number)
        };
    }
    if (bucket === "subjects") {
        if (!["theory", "practical"].includes(record.type)) throw fail(400, "Subject type must be theory or practical.");
        const sessionsPerWeek = Number(record.sessionsPerWeek);
        const duration = Number(record.duration);
        if (!Number.isInteger(sessionsPerWeek) || sessionsPerWeek < 1 || sessionsPerWeek > 20 ||
            !Number.isInteger(duration) || duration < 1 || duration > 8) {
            throw fail(400, "Sessions per week and duration must be positive whole numbers.");
        }
        return {
            ...record,
            code: requiredString(record.code, "Subject code", 40),
            name: requiredString(record.name, "Subject name", 160),
            sessionsPerWeek,
            duration,
            batchIds: Array.isArray(record.batchIds) ? record.batchIds : []
        };
    }
    if (bucket === "rooms") {
        const capacity = Number(record.capacity);
        if (!Number.isInteger(capacity) || capacity < 1) throw fail(400, "Room capacity must be a positive whole number.");
        if (!["classroom", "laboratory", "lecture_hall"].includes(record.type)) {
            throw fail(400, "Choose a valid room type.");
        }
        return { ...record, code: requiredString(record.code, "Room code", 40), capacity };
    }
    if (bucket === "time-slots") {
        if (!Number.isFinite(timeMinutes(record.start)) || !Number.isFinite(timeMinutes(record.end)) ||
            timeMinutes(record.start) >= timeMinutes(record.end)) {
            throw fail(400, "Time slots need a valid start and end time.");
        }
    }
    if (bucket === "timetable") {
        if (!Number.isInteger(Number(record.day)) || Number(record.day) < 1 || Number(record.day) > 6 ||
            !Number.isFinite(timeMinutes(record.start)) || !Number.isFinite(timeMinutes(record.end)) ||
            timeMinutes(record.start) >= timeMinutes(record.end)) {
            throw fail(400, "Timetable entries need a valid day and time range.");
        }
        for (const field of ["subjectId", "facultyId", "roomId", "batchId"]) {
            requiredString(record[field], field);
        }
        return { ...record, day: Number(record.day) };
    }
    return record;
}

function timeMinutes(value) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return NaN;
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
}

function overlaps(a, b) {
    return a.day === b.day && a.start < b.end && b.start < a.end;
}

function isConflict(entry, entries) {
    return entries.some((other) => other.id !== entry.id && overlaps(entry, other) && (
        other.facultyId === entry.facultyId ||
        other.roomId === entry.roomId ||
        other.batchId === entry.batchId
    ));
}

function publicEntry(entry, catalogs) {
    const subject = catalogs.subjects.find((item) => item.id === entry.subjectId) || {};
    const faculty = catalogs.faculty.find((item) => item.id === entry.facultyId) || {};
    const room = catalogs.rooms.find((item) => item.id === entry.roomId) || {};
    const batch = catalogs.batches.find((item) => item.id === entry.batchId) || {};
    return {
        ...entry,
        subjectName: subject.name || "Subject",
        subjectCode: subject.code || "",
        type: subject.type || "theory",
        facultyName: faculty.name || "Faculty",
        roomCode: room.code || "",
        roomType: room.type || "",
        batchLabel: batch.division ? `Sem ${batch.semester} ${batch.division}` : "",
        dayName: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][entry.day] || ""
    };
}

async function enriched(entries) {
    const [subjects, faculty, rooms, batches] = await Promise.all([
        data.list("subjects"), data.list("faculty"), data.list("rooms"), data.list("batches")
    ]);
    const catalogs = { subjects, faculty, rooms, batches };
    return entries.map((entry) => publicEntry(entry, catalogs));
}

async function audit(req, action, detail) {
    await data.put("audit-logs", {
        id: crypto.randomUUID(),
        actor: req.user?.email || "system",
        action,
        detail,
        at: new Date().toISOString()
    });
}

async function notify(role, title, message) {
    await data.put("notifications", {
        id: crypto.randomUUID(),
        role,
        title,
        message,
        createdAt: new Date().toISOString(),
        read: false,
        readBy: []
    });
}

function loginLimiter() {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 20,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message: "Too many sign-in attempts. Try again in 15 minutes." }
    });
}

router.get("/health", (req, res) => {
    res.json({ status: "ok", database: require("mongoose").connection.readyState === 1 ? "connected" : "disconnected" });
});

router.post("/auth/signup", asyncRoute(async (req, res) => {
    const name = requiredString(req.body.name, "Name", 120);
    const email = requiredString(req.body.email, "Email", 254).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const role = req.body.role || "student";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "Enter a valid email address.");
    if (password.length < 6 || password.length > 128) throw fail(400, "Password must contain 6 to 128 characters.");
    if (!["student", "faculty"].includes(role)) throw fail(400, "Only student and faculty self-registration is allowed.");
    const rollNumber = typeof req.body.rollNumber === "string" ? req.body.rollNumber.trim() : "";
    const user = await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role,
        ...(role === "student" && rollNumber ? { rollNumber } : {}),
        isApproved: role !== "faculty",
        isProfileComplete: false
    }).catch((error) => {
        if (error.code === 11000) throw fail(409, "An account with that email or roll number already exists.");
        throw error;
    });

    if (role === "faculty") {
        const facultyId = crypto.randomUUID();
        user.facultyId = facultyId;
        await user.save();
        await data.put("faculty", {
            id: facultyId, userId: user._id, name: user.name, email: user.email,
            qualification: "Pending details", departmentId: "",
            subjects: [], maxPerDay: 4, maxPerWeek: 16, availableDays: [1, 2, 3, 4, 5],
            isApproved: false
        });
    }
    res.status(201).json({
        message: role === "faculty" ? "Account created. Wait for admin approval before signing in." : "Account created. Sign in to complete your student profile.",
        user: safeUser(user)
    });
}));

router.post("/auth/login", loginLimiter(), asyncRoute(async (req, res) => {
    const identifier = requiredString(req.body.email, "Email or roll number", 254);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const filter = identifier.includes("@")
        ? { email: identifier.toLowerCase() }
        : { rollNumber: identifier };
    if (req.body.role) filter.role = req.body.role;
    const user = await User.findOne(filter);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw fail(401, "Invalid email/roll number, password, or role.");
    }
    if (user.role === "faculty" && !user.isApproved) {
        throw fail(403, "Faculty account is waiting for admin approval.");
    }
    user.lastLoginAt = new Date();
    await user.save();
    const tokens = issueTokens(user);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken, user: safeUser(user) });
}));

router.post("/auth/refresh", asyncRoute(async (req, res) => {
    const user = await userFromRefreshToken(req.cookies[COOKIE_NAME]);
    if (!user) throw fail(401, "Refresh session is missing or expired. Sign in again.");
    const tokens = issueTokens(user);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken });
}));

router.post("/auth/logout", asyncRoute(async (req, res) => {
    const user = await userFromRefreshToken(req.cookies[COOKIE_NAME]);
    if (user) {
        user.tokenVersion += 1;
        await user.save();
    }
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    res.json({ message: "Signed out." });
}));

router.get("/auth/me", authenticate, (req, res) => res.json({ user: safeUser(req.user) }));

router.get("/admin/bootstrap", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const buckets = ["departments", "programs", "batches", "faculty", "subjects", "rooms", "time-slots", "timetable", "leaves", "notifications"];
    const values = await Promise.all(buckets.map((bucket) => data.list(bucket)));
    const institutionRow = await AppData.findOne({ bucket: "institution", recordId: "default" }).lean();
    const previewRow = await AppData.findOne({ bucket: "timetable-preview", recordId: "current" }).lean();
    res.json({
        institution: institutionRow?.data || null,
        preview: previewRow?.data?.entries || null,
        ...Object.fromEntries(buckets.map((bucket, index) => [bucket, values[index]]))
    });
}));

router.get("/student/profile", authenticate, roles("student"), (req, res) => {
    res.json({ user: safeUser(req.user) });
});

router.get("/student/options", authenticate, roles("student", "faculty", "admin"), asyncRoute(async (req, res) => {
    const [departments, programs, batches] = await Promise.all([
        data.list("departments"), data.list("programs"), data.list("batches")
    ]);
    const [timeSlots, institutionRow] = await Promise.all([
        data.list("time-slots"),
        AppData.findOne({ bucket: "institution", recordId: "default" }).lean()
    ]);
    res.json({ departments, programs, batches, timeSlots, institution: institutionRow?.data || null });
}));

router.post("/student/onboarding", authenticate, roles("student"), asyncRoute(async (req, res) => {
    if (req.user.isProfileComplete) throw fail(409, "Your academic profile is already complete.");
    const batchId = requiredString(req.body.batchId, "Batch");
    const batch = await data.get("batches", batchId);
    if (!batch) throw fail(400, "Choose a valid batch from the institution's catalog.");
    const rollNumber = requiredString(req.body.rollNumber, "Roll number", 80);
    const duplicate = await User.exists({ rollNumber, _id: { $ne: req.user._id } });
    if (duplicate) throw fail(409, "That roll number is already registered.");
    const name = requiredString(req.body.fullName || req.user.name, "Name", 120);
    req.user.name = name;
    req.user.rollNumber = rollNumber;
    req.user.batchId = batch.id;
    req.user.isProfileComplete = true;
    req.user.profile = {
        institutionType: req.body.institutionType || "college",
        departmentId: batch.departmentId,
        programId: batch.programId,
        year: batch.year,
        division: batch.division,
        practicalBatch: batch.practicalBatch,
        academicYear: batch.academicYear,
        semester: batch.semester
    };
    await req.user.save();
    await audit(req, "student-onboarding", `Completed academic profile for ${rollNumber}`);
    res.json({ user: safeUser(req.user) });
}));

router.put("/student/profile", authenticate, roles("student"), asyncRoute(async (req, res) => {
    const name = requiredString(req.body.name || req.user.name, "Name", 120);
    req.user.name = name;
    if (req.body.rollNumber !== undefined) {
        const rollNumber = requiredString(req.body.rollNumber, "Roll number", 80);
        if (await User.exists({ rollNumber, _id: { $ne: req.user._id } })) {
            throw fail(409, "That roll number is already registered.");
        }
        req.user.rollNumber = rollNumber;
    }
    if (req.body.year !== undefined || req.body.division !== undefined) {
        const year = requiredString(String(req.body.year ?? req.user.profile?.year ?? ""), "Year / class", 40);
        const division = requiredString(String(req.body.division ?? req.user.profile?.division ?? ""), "Division", 40);
        const batches = await data.list("batches");
        const batch = batches.find((item) =>
            item.year === year &&
            item.division.toLowerCase() === division.toLowerCase() &&
            (!req.user.profile?.departmentId || item.departmentId === req.user.profile.departmentId) &&
            (!req.user.profile?.programId || item.programId === req.user.profile.programId) &&
            (!req.user.profile?.semester || item.semester === req.user.profile.semester)
        );
        if (!batch) throw fail(400, "That year and division are not available in your department.");
        req.user.batchId = batch.id;
        req.user.profile = {
            ...req.user.profile,
            year: batch.year,
            division: batch.division,
            semester: batch.semester,
            academicYear: batch.academicYear,
            practicalBatch: batch.practicalBatch
        };
        await notify("admin", "Student profile updated", `${req.user.name} changed year/division to ${year}/${division}.`);
    }
    await req.user.save();
    await audit(req, "student-profile-update", `Updated profile for ${req.user.email}`);
    res.json({ user: safeUser(req.user) });
}));

router.get("/student/timetable", authenticate, roles("student", "faculty", "admin"), asyncRoute(async (req, res) => {
    if (req.user.role === "student" && (!req.user.isProfileComplete || !req.user.batchId)) {
        throw fail(403, "Complete your academic profile before viewing the timetable.");
    }
    const entries = await data.list("timetable");
    const batchId = req.user.role === "student" ? req.user.batchId : req.query.batchId;
    res.json({ timetable: await enriched(entries.filter((entry) => entry.published && (!batchId || entry.batchId === batchId))) });
}));

router.get("/student/dashboard/stats", authenticate, roles("student", "faculty", "admin"), asyncRoute(async (req, res) => {
    if (req.user.role === "student" && !req.user.isProfileComplete) {
        throw fail(403, "Complete your academic profile before viewing dashboard statistics.");
    }
    const timetable = await data.list("timetable");
    const notifications = await data.list("notifications");
    const batchId = req.user.role === "student" ? req.user.batchId : req.query.batchId;
    res.json({
        classes: timetable.filter((entry) => entry.published && (!batchId || entry.batchId === batchId)).length,
        unreadNotifications: notifications.filter((item) => ["all", "student"].includes(item.role) && !item.read).length
    });
}));

router.get("/faculty/timetable", authenticate, roles("faculty", "admin"), asyncRoute(async (req, res) => {
    const timetable = await data.list("timetable");
    const facultyId = req.user.role === "faculty" ? req.user.facultyId : req.query.facultyId;
    res.json({ timetable: await enriched(timetable.filter((entry) => entry.published && (!facultyId || entry.facultyId === facultyId))) });
}));

router.get("/faculty/dashboard/stats", authenticate, roles("faculty", "admin"), asyncRoute(async (req, res) => {
    const [timetable, leaves] = await Promise.all([data.list("timetable"), data.list("leaves")]);
    const facultyId = req.user.role === "faculty" ? req.user.facultyId : req.query.facultyId;
    res.json({
        classes: timetable.filter((entry) => entry.published && (!facultyId || entry.facultyId === facultyId)).length,
        pendingLeaves: leaves.filter((leave) => (!facultyId || leave.facultyId === facultyId) && leave.status === "pending").length
    });
}));

router.post("/faculty/leaves", authenticate, roles("faculty"), asyncRoute(async (req, res) => {
    const startsOn = requiredString(req.body.startsOn, "Start date", 10);
    const endsOn = requiredString(req.body.endsOn, "End date", 10);
    const isValidDate = (value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const parsed = new Date(`${value}T00:00:00Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    };
    if (!isValidDate(startsOn) || !isValidDate(endsOn) || startsOn > endsOn) {
        throw fail(400, "Enter a valid leave date range.");
    }
    const leave = {
        id: crypto.randomUUID(),
        facultyId: req.user.facultyId,
        facultyName: req.user.name,
        startsOn,
        endsOn,
        periods: String(req.body.periods || "full-day").slice(0, 80),
        reason: requiredString(req.body.reason, "Reason", 500),
        status: "pending",
        substitution: ""
    };
    await data.put("leaves", leave);
    await notify("admin", "New leave request", `${req.user.name} requested leave from ${startsOn}.`);
    await audit(req, "leave-request", `${req.user.name} requested leave from ${startsOn} to ${endsOn}`);
    res.status(201).json({ leave });
}));

router.get("/faculty/leaves", authenticate, roles("faculty", "admin"), asyncRoute(async (req, res) => {
    const leaves = await data.list("leaves");
    res.json({ leaves: req.user.role === "faculty"
        ? leaves.filter((leave) => leave.facultyId === req.user.facultyId)
        : leaves });
}));

router.get("/admin/dashboard/stats", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const [faculty, rooms, subjects, leaves, timetable] = await Promise.all([
        data.list("faculty"), data.list("rooms"), data.list("subjects"),
        data.list("leaves"), data.list("timetable")
    ]);
    res.json({
        teachers: faculty.length,
        rooms: rooms.length,
        subjects: subjects.length,
        pendingLeaves: leaves.filter((item) => item.status === "pending").length,
        timetableEntries: timetable.length
    });
}));

router.get("/admin/:bucket", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    if (!data.COLLECTIONS.has(req.params.bucket)) throw fail(404, "Catalog not found.");
    if (req.params.bucket === "institution") {
        const row = await AppData.findOne({ bucket: "institution", recordId: "default" }).lean();
        return res.json({ institution: row?.data || null });
    }
    if (req.params.bucket === "leaves") {
        return res.json({ leaves: await data.list("leaves") });
    }
    if (req.params.bucket === "audit-logs") {
        return res.json({ auditLogs: await data.list("audit-logs") });
    }
    res.json({ items: await data.list(req.params.bucket) });
}));

router.put("/admin/institution", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const settings = req.body;
    const start = timeMinutes(settings.startTime);
    const end = timeMinutes(settings.endTime);
    const periodMinutes = Number(settings.periodMinutes);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
        !Number.isInteger(periodMinutes) || periodMinutes < 30 || periodMinutes > 120) {
        throw fail(400, "Provide a valid school-day range and period length (30–120 minutes).");
    }
    for (const key of ["lunch", "shortBreak"]) {
        const interval = settings[key];
        if (!interval || !Number.isFinite(timeMinutes(interval.start)) ||
            !Number.isFinite(timeMinutes(interval.end)) ||
            timeMinutes(interval.start) >= timeMinutes(interval.end) ||
            timeMinutes(interval.start) < start || timeMinutes(interval.end) > end) {
            throw fail(400, `${key} must have a valid duration inside the school day.`);
        }
    }
    if (settings.lunch.start < settings.shortBreak.end && settings.shortBreak.start < settings.lunch.end) {
        throw fail(400, "Lunch and short break cannot overlap.");
    }
    const breaks = [settings.lunch, settings.shortBreak]
        .map((item) => ({ start: timeMinutes(item.start), end: timeMinutes(item.end) }))
        .sort((a, b) => a.start - b.start);
    const slots = [];
    let cursor = start;
    let period = 1;
    while (cursor < end) {
        const activeBreak = breaks.find((item) => cursor >= item.start && cursor < item.end);
        if (activeBreak) {
            cursor = activeBreak.end;
            continue;
        }
        const nextBreak = breaks.find((item) => item.start > cursor && item.start < cursor + periodMinutes);
        const slotEnd = Math.min(end, nextBreak?.start ?? cursor + periodMinutes);
        const format = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        slots.push({ id: `p${period++}`, start: format(cursor), end: format(slotEnd) });
        cursor = slotEnd;
    }
    await AppData.findOneAndUpdate(
        { bucket: "institution", recordId: "default" },
        { $set: { data: { ...settings, name: requiredString(settings.name, "Institution name", 160) } } },
        { upsert: true }
    );
    await data.replace("time-slots", slots);
    await audit(req, "institution-update", `Updated settings for ${settings.name}`);
    res.json({ institution: settings, timeSlots: slots });
}));

router.post("/admin/faculty/:id/approve", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const facultyRecord = await data.get("faculty", req.params.id);
    if (!facultyRecord) throw fail(404, "Faculty record not found.");
    const user = await User.findOne({ $or: [{ facultyId: req.params.id }, { email: facultyRecord.email }] });
    if (user) {
        user.isApproved = true;
        await user.save();
    }
    facultyRecord.isApproved = true;
    await data.put("faculty", facultyRecord);
    await audit(req, "faculty-approve", `Approved ${facultyRecord.email}`);
    res.json({ faculty: facultyRecord, isApproved: true });
}));

router.post("/admin/timetable/generate", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const [subjects, faculty, rooms, batches, institutionRow] = await Promise.all([
        data.list("subjects"), data.list("faculty"), data.list("rooms"), data.list("batches"),
        AppData.findOne({ bucket: "institution", recordId: "default" }).lean()
    ]);
    const institution = institutionRow?.data || {
        workingDays: [1, 2, 3, 4, 5, 6], startTime: "09:00", endTime: "16:00",
        periodMinutes: 60, labSessionPeriods: 2,
        lunch: { start: "12:00", end: "13:00" }, shortBreak: { start: "10:50", end: "11:00" }
    };
    const breaks = [institution.lunch, institution.shortBreak].filter(Boolean)
        .map((item) => ({ start: timeMinutes(item.start), end: timeMinutes(item.end) }))
        .sort((a, b) => a.start - b.start);
    const slots = [];
    let cursor = timeMinutes(institution.startTime);
    const endOfDay = timeMinutes(institution.endTime);
    const periodLength = Number(institution.periodMinutes);
    while (cursor < endOfDay) {
        const activeBreak = breaks.find((item) => cursor >= item.start && cursor < item.end);
        if (activeBreak) {
            cursor = activeBreak.end;
            continue;
        }
        const nextBreak = breaks.find((item) => item.start > cursor && item.start < cursor + periodLength);
        const finish = Math.min(endOfDay, nextBreak?.start ?? cursor + periodLength);
        slots.push({ start: cursor, end: finish });
        cursor = finish;
    }
    const days = (institution.workingDays || [1, 2, 3, 4, 5, 6]).filter((day) => Number.isInteger(day) && day >= 1 && day <= 6);
    const entries = [];
    const unplaced = [];
    const facultyPerDay = new Map();
    const facultyPerWeek = new Map();
    const requirements = subjects.slice().sort((a, b) => (
        Number(b.type === "practical" ? institution.labSessionPeriods : b.duration || 1) -
        Number(a.type === "practical" ? institution.labSessionPeriods : a.duration || 1)
    ));
    for (const subject of requirements) {
        const length = Number(subject.type === "practical" ? institution.labSessionPeriods : subject.duration || 1);
        const teacher = faculty.find((item) => item.id === subject.facultyId);
        const batchIds = subject.batchIds?.length ? subject.batchIds : batches.slice(0, 1).map((item) => item.id);
        const suitableBatches = new Map(batches.map((item) => [item.id, item]));
        const allowedRooms = rooms.filter((room) => subject.type === "practical"
            ? room.type === "laboratory"
            : room.type !== "laboratory");
        if (!teacher) {
            for (const batchId of batchIds) {
                for (let count = 0; count < Number(subject.sessionsPerWeek || 1); count += 1) {
                    unplaced.push({ subjectId: subject.id, batchId });
                }
            }
            continue;
        }
        if (teacher.subjects?.length && !teacher.subjects.includes(subject.id)) {
            for (const batchId of batchIds) {
                for (let count = 0; count < Number(subject.sessionsPerWeek || 1); count += 1) {
                    unplaced.push({ subjectId: subject.id, batchId });
                }
            }
            continue;
        }
        for (const batchId of batchIds) {
            const batch = suitableBatches.get(batchId);
            const requiredCapacity = Number(batch?.studentCount || batch?.capacity || 0);
            const roomsForBatch = allowedRooms.filter((room) => !requiredCapacity || Number(room.capacity) >= requiredCapacity);
            for (let count = 0; count < Number(subject.sessionsPerWeek || 1); count += 1) {
                let placed = false;
                for (const day of days) {
                    if (teacher?.availableDays && !teacher.availableDays.includes(day)) continue;
                    const dayCount = facultyPerDay.get(`${teacher?.id}:${day}`) || 0;
                    const weekCount = facultyPerWeek.get(teacher?.id) || 0;
                    if (teacher && (dayCount >= Number(teacher.maxPerDay || 99) ||
                        weekCount >= Number(teacher.maxPerWeek || 999))) continue;
                    for (let slotIndex = 0; slotIndex <= slots.length - length; slotIndex += 1) {
                        const block = slots.slice(slotIndex, slotIndex + length);
                        if (block.some((slot, index) => index > 0 && block[index - 1].end !== slot.start)) continue;
                        for (const room of roomsForBatch) {
                            const entry = {
                                id: crypto.randomUUID(),
                                day,
                                start: `${String(Math.floor(block[0].start / 60)).padStart(2, "0")}:${String(block[0].start % 60).padStart(2, "0")}`,
                                end: `${String(Math.floor(block[block.length - 1].end / 60)).padStart(2, "0")}:${String(block[block.length - 1].end % 60).padStart(2, "0")}`,
                                subjectId: subject.id,
                                facultyId: subject.facultyId,
                                roomId: room.id,
                                batchId,
                                periodCount: length,
                                published: false
                            };
                            if (isConflict(entry, entries)) continue;
                            entries.push(entry);
                            facultyPerDay.set(`${teacher?.id}:${day}`, dayCount + 1);
                            facultyPerWeek.set(teacher?.id, weekCount + 1);
                            placed = true;
                            break;
                        }
                        if (placed) break;
                    }
                    if (placed) break;
                }
                if (!placed) unplaced.push({ subjectId: subject.id, batchId });
            }
        }
    }
    await data.put("timetable-preview", { id: "current", entries });
    await audit(req, "timetable-generate", `Generated ${entries.length} entries; ${unplaced.length} unplaced`);
    await notify("admin", "Timetable preview ready", `Generated ${entries.length} timetable entries; ${unplaced.length} could not be placed.`);
    res.json({ count: entries.length, unplaced: unplaced.length, unplacedSessions: unplaced, timetable: await enriched(entries) });
}));

router.get("/admin/timetable/preview", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const preview = await data.get("timetable-preview", "current");
    const entries = preview?.entries || [];
    res.json({ preview: await enriched(entries), timetable: await enriched(entries), count: entries.length });
}));

router.get("/admin/:bucket/:id", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    if (!data.COLLECTIONS.has(req.params.bucket)) throw fail(404, "Catalog not found.");
    const item = await data.get(req.params.bucket, req.params.id);
    if (!item) throw fail(404, "Record not found.");
    res.json({ item });
}));

router.put("/admin/timetable/preview/:id", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const preview = await data.get("timetable-preview", "current");
    if (!preview?.entries) throw fail(404, "Generate a timetable preview before editing slots.");
    const index = preview.entries.findIndex((entry) => entry.id === req.params.id);
    if (index < 0) throw fail(404, "Preview slot not found.");
    const entry = { ...preview.entries[index], ...req.body, id: req.params.id, published: false };
    if (!Number.isInteger(Number(entry.day)) || Number(entry.day) < 1 || Number(entry.day) > 6 ||
        !Number.isFinite(timeMinutes(entry.start)) || !Number.isFinite(timeMinutes(entry.end)) ||
        timeMinutes(entry.start) >= timeMinutes(entry.end)) {
        throw fail(400, "Choose a valid day and time range.");
    }
    if (isConflict(entry, preview.entries)) {
        throw fail(409, "This change conflicts with another class, faculty member, or room.");
    }
    preview.entries[index] = entry;
    await data.put("timetable-preview", preview);
    res.json({ item: entry });
}));

router.post("/admin/timetable/publish", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const preview = await data.get("timetable-preview", "current");
    if (!preview?.entries?.length) throw fail(409, "Generate a timetable preview before publishing.");
    const entries = preview.entries.map((entry) => ({ ...entry, published: true }));
    await data.replace("timetable", entries);
    await data.remove("timetable-preview", "current");
    await audit(req, "timetable-publish", `Published ${entries.length} timetable entries`);
    await notify("all", "Timetable published", "A new timetable is now available.");
    res.json({ message: "Timetable published.", count: entries.length });
}));

router.post("/admin/leaves/:id/approve", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const leave = await data.get("leaves", req.params.id);
    if (!leave) throw fail(404, "Leave request not found.");
    if (leave.status !== "pending") throw fail(409, "This leave request has already been processed.");
    const [timetable, faculty, subjects] = await Promise.all([
        data.list("timetable"), data.list("faculty"), data.list("subjects")
    ]);
    const leaveDates = new Map();
    for (let date = new Date(`${leave.startsOn}T00:00:00Z`), end = new Date(`${leave.endsOn}T00:00:00Z`);
        date <= end;
        date.setUTCDate(date.getUTCDate() + 1)) {
        const day = date.getUTCDay() || 7;
        if (day >= 1 && day <= 6) leaveDates.set(date.toISOString().slice(0, 10), day);
    }
    const affected = timetable.filter((entry) => entry.facultyId === leave.facultyId && [...leaveDates.values()].includes(entry.day));
    const changes = [];
    const substitutions = [];
    const reserved = [];
    for (const [date, day] of leaveDates) {
      for (const entry of affected.filter((item) => item.day === day)) {
        const subject = subjects.find((item) => item.id === entry.subjectId);
        const scheduled = timetable.concat(reserved);
        const replacement = faculty.find((person) => person.id !== leave.facultyId &&
            (!person.subjects?.length || person.subjects.includes(entry.subjectId)) &&
            (!person.availableDays || person.availableDays.includes(entry.day)) &&
            scheduled.filter((item) => item.facultyId === person.id && item.day === entry.day).length < Number(person.maxPerDay || 99) &&
            scheduled.filter((item) => item.facultyId === person.id).length < Number(person.maxPerWeek || 999) &&
            !isConflict({ ...entry, facultyId: person.id }, scheduled));
        if (replacement) {
            reserved.push({ ...entry, facultyId: replacement.id });
            substitutions.push({
                date,
                entryId: entry.id,
                substituteFacultyId: replacement.id,
                substituteName: replacement.name
            });
            changes.push(`${subject?.code || subject?.name || "Class"} covered by ${replacement.name}`);
        } else {
            changes.push(`${subject?.code || subject?.name || "Class"} has no available substitute`);
        }
      }
    }
    leave.status = "approved";
    leave.substitution = changes.join("; ") || "No affected classes.";
    leave.substitutions = substitutions;
    await data.put("leaves", leave);
    await notify("all", "Leave auto-rescheduled", `${leave.facultyName}'s affected classes were reviewed for substitution.`);
    await notify("faculty", "Leave approved", leave.substitution);
    await audit(req, "leave-approve", `${leave.facultyName}: ${leave.substitution}`);
    res.json({ leave });
}));

router.post("/admin/leaves/:id/reject", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const leave = await data.get("leaves", req.params.id);
    if (!leave) throw fail(404, "Leave request not found.");
    if (leave.status !== "pending") throw fail(409, "This leave request has already been processed.");
    leave.status = "rejected";
    await data.put("leaves", leave);
    await notify("faculty", "Leave request declined", `Your leave request from ${leave.startsOn} was declined.`);
    await audit(req, "leave-reject", `${leave.facultyName}: ${leave.startsOn}`);
    res.json({ leave });
}));

router.get("/notifications", authenticate, asyncRoute(async (req, res) => {
    const notifications = await data.list("notifications");
    const allowedRole = req.user.role;
    const items = notifications.filter((item) => item.role === "all" || item.role === allowedRole)
        .map((item) => ({
            ...item,
            read: Array.isArray(item.readBy)
                ? item.readBy.includes(req.user._id)
                : Boolean(item.read)
        }));
    res.json({ notifications: items });
}));

router.put("/notifications/:id/read", authenticate, asyncRoute(async (req, res) => {
    const notification = await data.get("notifications", req.params.id);
    if (!notification || !["all", req.user.role].includes(notification.role)) {
        throw fail(404, "Notification not found.");
    }
    notification.readBy = Array.isArray(notification.readBy) ? notification.readBy : [];
    if (!notification.readBy.includes(req.user._id)) notification.readBy.push(req.user._id);
    await data.put("notifications", notification);
    res.json({ notification: { ...notification, read: true } });
}));

router.post("/admin/:bucket", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const { bucket } = req.params;
    if (!data.COLLECTIONS.has(bucket) || ["timetable", "leaves", "notifications", "audit-logs", "institution"].includes(bucket)) {
        throw fail(404, "Catalog not found.");
    }
    const record = validateCatalogRecord(bucket, { ...req.body, id: req.body.id || crypto.randomUUID() });
    if (bucket === "timetable" && isConflict(record, await data.list(bucket))) {
        throw fail(409, "This class conflicts with another class, faculty member, or room.");
    }
    await data.put(bucket, record);
    await audit(req, `catalog-create:${bucket}`, `Created ${record.id}`);
    res.status(201).json({ item: record });
}));

router.put("/admin/:bucket/:id", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const { bucket, id } = req.params;
    if (!data.COLLECTIONS.has(bucket) || ["notifications", "audit-logs", "institution"].includes(bucket)) {
        throw fail(404, "Catalog not found.");
    }
    const current = await data.get(bucket, id);
    if (!current) throw fail(404, "Record not found.");
    const record = validateCatalogRecord(bucket, { ...current, ...req.body, id });
    if (bucket === "timetable" && isConflict(record, (await data.list(bucket)).filter((item) => item.id !== id))) {
        throw fail(409, "This change conflicts with another class, faculty member, or room.");
    }
    await data.put(bucket, record);
    await audit(req, `catalog-update:${bucket}`, `Updated ${id}`);
    res.json({ item: record });
}));

router.delete("/admin/:bucket/:id", authenticate, roles("admin"), asyncRoute(async (req, res) => {
    const { bucket, id } = req.params;
    if (!data.COLLECTIONS.has(bucket) || ["notifications", "audit-logs", "institution"].includes(bucket)) {
        throw fail(404, "Catalog not found.");
    }
    if (!await data.remove(bucket, id)) throw fail(404, "Record not found.");
    await audit(req, `catalog-delete:${bucket}`, `Deleted ${id}`);
    res.json({ message: "Record deleted." });
}));

module.exports = { router, asyncRoute, authenticate, userFromRefreshToken, COOKIE_NAME, roles };
