/**
 * Demo data store for Member 1 frontend.
 * Used when the Express API is not running yet so dashboards stay fully usable.
 * Access tokens are never written to localStorage.
 */
"use strict";

const DemoStore = (() => {
    const DB_KEY = "scts-demo-db-v2";
    const SESSION_KEY = "scts-demo-session";

    const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    function seed() {
        return {
            users: [
                { id: "u-admin", name: "Campus Admin", email: "admin@smart.edu", password: "Admin@123", role: "admin", isApproved: true, isProfileComplete: true },
                { id: "u-fac-1", name: "Dr. Asha Nair", email: "faculty@smart.edu", password: "Faculty@123", role: "faculty", isApproved: true, facultyId: "f1" },
                { id: "u-fac-2", name: "Prof. Rohan Iyer", email: "rohan@smart.edu", password: "Faculty@123", role: "faculty", isApproved: true, facultyId: "f2" },
                { id: "u-fac-p", name: "Priya Shah", email: "priya@smart.edu", password: "Faculty@123", role: "faculty", isApproved: false },
                { id: "u-stu", name: "Pruthvi K", email: "student@smart.edu", password: "Student@123", role: "student", rollNumber: "22CS001", isProfileComplete: true, batchId: "b-cse5a" },
                { id: "u-new", name: "New Student", email: "newstudent@smart.edu", password: "Student@123", role: "student", rollNumber: "22CS099", isProfileComplete: false }
            ],
            institution: {
                name: "Smart Valley Institute of Technology",
                type: "college",
                academicYear: "2026-27",
                workingDays: [1, 2, 3, 4, 5, 6],
                periodMinutes: 60,
                labSessionPeriods: 2,
                startTime: "09:00",
                endTime: "16:00",
                lunch: { start: "12:00", end: "13:00" },
                shortBreak: { start: "10:50", end: "11:00" }
            },
            departments: [
                { id: "d-cse", name: "Computer Science", code: "CSE" },
                { id: "d-ece", name: "Electronics", code: "ECE" },
                { id: "d-mech", name: "Mechanical", code: "ME" }
            ],
            programs: [
                { id: "p-be-cse", departmentId: "d-cse", name: "B.E. Computer Science", type: "college" },
                { id: "p-be-ece", departmentId: "d-ece", name: "B.E. Electronics", type: "college" }
            ],
            batches: [
                { id: "b-cse5a", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "A", practicalBatch: "A1", academicYear: "2026-27" },
                { id: "b-cse5a2", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "A", practicalBatch: "A2", academicYear: "2026-27" },
                { id: "b-cse5b", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "B", practicalBatch: "B1", academicYear: "2026-27" },
                { id: "b-cse5c", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "C", practicalBatch: "C1", academicYear: "2026-27" },
                { id: "b-cse5d", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "D", practicalBatch: "D1", academicYear: "2026-27" }
            ],
            faculty: [
                { id: "f1", name: "Dr. Asha Nair", email: "faculty@smart.edu", qualification: "Ph.D. CSE", departmentId: "d-cse", subjects: ["s1", "s3"], maxPerDay: 4, maxPerWeek: 16, availableDays: [1, 2, 3, 4, 5] },
                { id: "f2", name: "Prof. Rohan Iyer", email: "rohan@smart.edu", qualification: "M.Tech", departmentId: "d-cse", subjects: ["s2"], maxPerDay: 3, maxPerWeek: 14, availableDays: [1, 2, 3, 4, 5, 6] },
                { id: "f3", name: "Dr. Meera Das", email: "meera@smart.edu", qualification: "Ph.D. AI", departmentId: "d-cse", subjects: ["s4"], maxPerDay: 3, maxPerWeek: 12, availableDays: [1, 2, 3, 4] }
            ],
            subjects: [
                { id: "s1", code: "CSE-301", name: "Database Management", departmentId: "d-cse", type: "theory", sessionsPerWeek: 4, duration: 1, facultyId: "f1", batchIds: ["b-cse5a"] },
                { id: "s2", code: "CSE-302", name: "Operating Systems", departmentId: "d-cse", type: "practical", sessionsPerWeek: 2, duration: 2, facultyId: "f2", batchIds: ["b-cse5a"] },
                { id: "s3", code: "CSE-303", name: "Computer Networks", departmentId: "d-cse", type: "theory", sessionsPerWeek: 3, duration: 1, facultyId: "f1", batchIds: ["b-cse5a"] },
                { id: "s4", code: "CSE-410", name: "Machine Learning", departmentId: "d-cse", type: "theory", sessionsPerWeek: 3, duration: 1, facultyId: "f3", batchIds: ["b-cse5a"] }
            ],
            rooms: [
                { id: "r1", code: "C-204", type: "classroom", capacity: 60 },
                { id: "r2", code: "A-112", type: "lecture_hall", capacity: 120 },
                { id: "r3", code: "LAB-2", type: "laboratory", capacity: 30 },
                { id: "r4", code: "LAB-1", type: "laboratory", capacity: 24 }
            ],
            slots: [
                { id: "p1", start: "09:00", end: "10:00" },
                { id: "p2", start: "10:00", end: "10:50" },
                { id: "p3", start: "11:00", end: "12:00" },
                { id: "p4", start: "13:00", end: "14:00" },
                { id: "p5", start: "14:00", end: "15:00" },
                { id: "p6", start: "15:00", end: "16:00" }
            ],
            timetable: [
                { id: "t1", day: 1, start: "09:00", end: "10:00", subjectId: "s1", facultyId: "f1", roomId: "r1", batchId: "b-cse5a", published: true },
                { id: "t2", day: 1, start: "11:00", end: "12:00", subjectId: "s3", facultyId: "f1", roomId: "r1", batchId: "b-cse5a", published: true },
                { id: "t3", day: 2, start: "13:00", end: "15:00", subjectId: "s2", facultyId: "f2", roomId: "r3", batchId: "b-cse5a", published: true },
                { id: "t4", day: 3, start: "09:00", end: "10:00", subjectId: "s4", facultyId: "f3", roomId: "r2", batchId: "b-cse5a", published: true },
                { id: "t5", day: 4, start: "14:00", end: "15:00", subjectId: "s1", facultyId: "f1", roomId: "r1", batchId: "b-cse5a", published: true },
                { id: "t6", day: 5, start: "09:00", end: "10:00", subjectId: "s3", facultyId: "f1", roomId: "r1", batchId: "b-cse5a", published: true },
                { id: "t7", day: 5, start: "13:00", end: "14:00", subjectId: "s4", facultyId: "f3", roomId: "r2", batchId: "b-cse5a", published: true }
            ],
            preview: null,
            leaves: [
                { id: "l1", facultyId: "f1", facultyName: "Dr. Asha Nair", startsOn: "2026-10-08", endsOn: "2026-10-09", periods: "full-day", reason: "Conference travel", status: "approved", substitution: "Prof. Rohan Iyer covering CSE-301" }
            ],
            notifications: [
                { id: "n1", role: "all", title: "Timetable published", message: "Semester 5 CSE-A weekly schedule is live.", createdAt: new Date().toISOString(), read: false },
                { id: "n2", role: "faculty", title: "Leave approved", message: "Dr. Asha Nair leave for 8–9 Oct is approved with a substitute.", createdAt: new Date().toISOString(), read: false },
                { id: "n3", role: "student", title: "Lab room change", message: "OS lab moved to LAB-2 on Tuesday.", createdAt: new Date().toISOString(), read: true }
            ],
            auditLogs: [
                { id: "a1", actor: "system", action: "seed", detail: "Demo catalog loaded", at: new Date().toISOString() }
            ]
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (raw) return JSON.parse(raw);
        } catch {
            /* ignore corrupt cache */
        }
        const data = seed();
        save(data);
        return data;
    }

    function save(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    }

    function id(prefix) {
        return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function timeToMinutes(value) {
        if (!/^\d{2}:\d{2}$/.test(value || "")) return NaN;
        const [hours, minutes] = value.split(":").map(Number);
        if (hours > 23 || minutes > 59) return NaN;
        return hours * 60 + minutes;
    }

    function minutesToTime(value) {
        return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
    }

    function buildSlots(institution) {
        const dayStart = timeToMinutes(institution.startTime);
        const dayEnd = timeToMinutes(institution.endTime);
        const periodMinutes = Number(institution.periodMinutes);
        if (!Number.isFinite(dayStart) || !Number.isFinite(dayEnd) || dayStart >= dayEnd
            || !Number.isInteger(periodMinutes) || periodMinutes < 1) {
            throw new Error("Enter a valid school day and period length.");
        }

        const breaks = [institution.lunch, institution.shortBreak]
            .filter((item) => item && (item.start || item.end))
            .map((item) => {
                const start = timeToMinutes(item.start);
                const end = timeToMinutes(item.end);
                if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end
                    || start < dayStart || end > dayEnd) {
                    throw new Error("Breaks must have a valid duration inside the school day.");
                }
                return { start, end };
            })
            .sort((a, b) => a.start - b.start);

        for (let index = 1; index < breaks.length; index += 1) {
            if (breaks[index].start < breaks[index - 1].end) {
                throw new Error("Lunch and short break cannot overlap.");
            }
        }

        const slots = [];
        let cursor = dayStart;
        while (cursor < dayEnd) {
            const activeBreak = breaks.find((item) => cursor >= item.start && cursor < item.end);
            if (activeBreak) {
                cursor = activeBreak.end;
                continue;
            }

            let slotEnd = Math.min(cursor + periodMinutes, dayEnd);
            const upcomingBreak = breaks.find((item) => item.start > cursor && item.start < slotEnd);
            if (upcomingBreak) slotEnd = upcomingBreak.start;
            if (slotEnd <= cursor) throw new Error("The period plan could not create a valid period.");
            slots.push({
                id: `p${slots.length + 1}`,
                start: minutesToTime(cursor),
                end: minutesToTime(slotEnd)
            });
            cursor = slotEnd;
        }
        return slots;
    }

    function getSession() {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
        } catch {
            return null;
        }
    }

    function setSession(user) {
        const safe = { ...user };
        delete safe.password;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
        return safe;
    }

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function login(identifier, password, role) {
        const db = load();
        const user = db.users.find((item) => {
            const matchId = item.email === identifier || item.rollNumber === identifier;
            const matchPass = item.password === password;
            const matchRole = !role || item.role === role;
            return matchId && matchPass && matchRole;
        });
        if (!user) throw new Error("Invalid email/roll number, password, or role.");
        if (user.role === "faculty" && !user.isApproved) {
            throw new Error("Faculty account is waiting for admin approval.");
        }
        return setSession(user);
    }

    function signup(payload) {
        const db = load();
        if (db.users.some((item) => item.email === payload.email)) {
            throw new Error("An account with this email already exists.");
        }
        if (payload.rollNumber && db.users.some((item) => item.rollNumber === payload.rollNumber)) {
            throw new Error("Roll number must be unique.");
        }
        const user = {
            id: id("u"),
            name: payload.name,
            email: payload.email,
            password: payload.password,
            role: payload.role || "student",
            rollNumber: payload.rollNumber || "",
            isApproved: payload.role !== "faculty",
            isProfileComplete: payload.role !== "student"
        };
        db.users.push(user);
        save(db);
        return user;
    }

    function enrichEntry(entry, db) {
        const subject = db.subjects.find((item) => item.id === entry.subjectId) || {};
        const faculty = db.faculty.find((item) => item.id === entry.facultyId) || {};
        const room = db.rooms.find((item) => item.id === entry.roomId) || {};
        const batch = db.batches.find((item) => item.id === entry.batchId) || {};
        return {
            ...entry,
            subjectName: subject.name || "Subject",
            subjectCode: subject.code || "",
            type: subject.type || "theory",
            facultyName: faculty.name || "Faculty",
            roomCode: room.code || "",
            roomType: room.type || "",
            batchLabel: batch.division ? `Sem ${batch.semester} ${batch.division}` : "",
            dayName: DAYS[entry.day] || ""
        };
    }

    function conflicts(entry, db, ignoreId) {
        const reasons = [];
        db.timetable.forEach((other) => {
            if (other.id === ignoreId || other.id === entry.id) return;
            if (other.day !== entry.day) return;
            const overlap = other.start < entry.end && entry.start < other.end;
            if (!overlap) return;
            if (other.facultyId === entry.facultyId) reasons.push("Teacher is already assigned at this time.");
            if (other.roomId === entry.roomId) reasons.push("Room is already occupied at this time.");
            if (other.batchId === entry.batchId) reasons.push("Batch already has a class at this time.");
        });
        const subject = db.subjects.find((item) => item.id === entry.subjectId);
        const room = db.rooms.find((item) => item.id === entry.roomId);
        if (entry.start < db.institution.startTime || entry.end > db.institution.endTime) {
            reasons.push("Class must fit inside the configured school day.");
        }
        if (subject && room && subject.type === "practical" && room.type !== "laboratory") {
            reasons.push("Practical classes must be in a lab.");
        }
        [
            { interval: db.institution.lunch, name: "lunch" },
            { interval: db.institution.shortBreak, name: "short break" }
        ].forEach(({ interval, name }) => {
            if (interval && interval.start && interval.end
                && entry.start < interval.end && interval.start < entry.end) {
                reasons.push(`Cannot schedule during ${name}.`);
            }
        });
        return reasons;
    }

    function audit(db, actor, action, detail) {
        db.auditLogs = db.auditLogs || [];
        db.auditLogs.unshift({
            id: id("a"),
            actor,
            action,
            detail,
            at: new Date().toISOString()
        });
    }

    function notify(db, role, title, message) {
        db.notifications.unshift({
            id: id("n"),
            role,
            title,
            message,
            createdAt: new Date().toISOString(),
            read: false
        });
    }

    function slotOverlapsBreaks(slot, institution) {
        return [institution.lunch, institution.shortBreak].some((interval) => (
            interval && interval.start && interval.end
            && slot.start < interval.end && interval.start < slot.end
        ));
    }

    function generateTimetable() {
        const db = load();
        db.slots = buildSlots(db.institution);
        const days = db.institution.workingDays || [1, 2, 3, 4, 5, 6];
        const slots = db.slots;
        const entries = [];
        let unplaced = 0;
        const subjectDuration = (subject) => subject.type === "practical"
            ? (Number(db.institution.labSessionPeriods) || Number(subject.duration) || 1)
            : (Number(subject.duration) || 1);
        const subjects = db.subjects.slice().sort((a, b) => subjectDuration(b) - subjectDuration(a));

        subjects.forEach((subject) => {
            const duration = subjectDuration(subject);
            const needed = Number(subject.sessionsPerWeek) || 1;
            const faculty = db.faculty.find((item) => item.id === subject.facultyId);
            const rooms = db.rooms.filter((room) => (
                subject.type === "practical" ? room.type === "laboratory" : room.type !== "laboratory"
            ));
            const batchIds = (subject.batchIds && subject.batchIds.length)
                ? subject.batchIds
                : [db.batches[0]?.id].filter(Boolean);

            batchIds.forEach((batchId) => {
                let placed = 0;
                days.forEach((day) => {
                    if (placed >= needed) return;
                    if (faculty?.availableDays && !faculty.availableDays.includes(day)) return;
                    if (entries.some((entry) => entry.batchId === batchId && entry.subjectId === subject.id && entry.day === day)) {
                        return;
                    }
                    for (let index = 0; index < slots.length && placed < needed; index += 1) {
                        const block = [];
                        for (let offset = 0; offset < duration; offset += 1) {
                            const slot = slots[index + offset];
                            if (!slot || (block.length && block[block.length - 1].end !== slot.start)) break;
                            block.push(slot);
                        }
                        if (block.length < duration) continue;
                        const draft = {
                            id: id("t"),
                            day,
                            start: block[0].start,
                            end: block[block.length - 1].end,
                            subjectId: subject.id,
                            facultyId: subject.facultyId,
                            roomId: rooms[0]?.id,
                            batchId,
                            periodCount: duration,
                            published: false
                        };
                        let accepted = null;
                        rooms.forEach((room) => {
                            if (accepted) return;
                            const candidate = { ...draft, roomId: room.id };
                            const reasons = conflicts(candidate, { ...db, timetable: entries });
                            if (!reasons.length) accepted = candidate;
                        });
                        if (accepted) {
                            entries.push(accepted);
                            placed += 1;
                        }
                    }
                });
                if (placed < needed) unplaced += needed - placed;
            });
        });

        db.timetable = entries;
        db.preview = entries;
        audit(db, "admin", "generate", `Placed ${entries.length} slots; ${unplaced} unplaced`);
        notify(db, "admin", "Preview ready", "Generated timetable is ready to review and publish.");
        save(db);
        return { count: entries.length, unplaced };
    }

    function rescheduleLeave(leaveId) {
        const db = load();
        const leave = db.leaves.find((item) => item.id === leaveId);
        if (!leave) return null;
        const faculty = db.faculty.find((item) => item.id === leave.facultyId);
        const affected = db.timetable.filter((entry) => entry.facultyId === leave.facultyId);
        const substitutes = db.faculty.filter((item) => item.id !== leave.facultyId);
        const changes = [];
        db.slots = buildSlots(db.institution);

        affected.forEach((entry) => {
            const subject = db.subjects.find((item) => item.id === entry.subjectId);
            let assigned = null;
            substitutes.forEach((other) => {
                if (assigned) return;
                if (subject && other.subjects?.length && !other.subjects.includes(subject.id) && other.departmentId !== faculty?.departmentId) {
                    return;
                }
                const next = { ...entry, facultyId: other.id };
                if (!conflicts(next, db, entry.id).length) {
                    entry.facultyId = other.id;
                    assigned = other;
                }
            });
            if (!assigned) {
                const periodCount = Number(entry.periodCount)
                    || (subject?.type === "practical"
                        ? Number(db.institution.labSessionPeriods) || Number(subject.duration) || 1
                        : Number(subject?.duration) || 1);
                db.slots.forEach((slot, slotIndex) => {
                    if (assigned) return;
                    const block = db.slots.slice(slotIndex, slotIndex + periodCount);
                    if (block.length !== periodCount
                        || block.some((period, index) => index > 0 && block[index - 1].end !== period.start)
                        || slotOverlapsBreaks({ start: block[0].start, end: block[block.length - 1].end }, db.institution)) return;
                    const next = { ...entry, start: slot.start, end: block[block.length - 1].end, periodCount };
                    if (!conflicts(next, db, entry.id).length) {
                        Object.assign(entry, next);
                        assigned = { name: "Slot swapped to a free period" };
                    }
                });
            }
            changes.push({
                entryId: entry.id,
                result: assigned ? (assigned.name || "reassigned") : "unresolved"
            });
        });

        leave.status = "approved";
        leave.substitution = changes.map((item) => item.result).join("; ") || "No overlapping classes.";
        audit(db, "admin", "leave-approve", `${leave.facultyName}: ${leave.substitution}`);
        notify(db, "all", "Leave auto-rescheduled", `${leave.facultyName} is on leave. Affected periods were reassigned.`);
        notify(db, "faculty", "Leave approved", leave.substitution);
        save(db);
        return leave;
    }

    function pendingFaculty() {
        return load().users.filter((item) => item.role === "faculty" && !item.isApproved);
    }

    function approveFaculty(userId) {
        const db = load();
        const user = db.users.find((item) => item.id === userId);
        if (!user) return null;
        user.isApproved = true;
        if (!user.facultyId) {
            const record = {
                id: id("f"),
                name: user.name,
                email: user.email,
                qualification: "Pending details",
                departmentId: db.departments[0]?.id || "",
                subjects: [],
                maxPerDay: 4,
                maxPerWeek: 16,
                availableDays: [1, 2, 3, 4, 5]
            };
            db.faculty.push(record);
            user.facultyId = record.id;
        }
        audit(db, "admin", "faculty-approve", user.email);
        notify(db, "faculty", "Account approved", `${user.name} can now sign in.`);
        save(db);
        return user;
    }

    function updateStudentBatch(userId, year, division) {
        const db = load();
        const user = db.users.find((item) => item.id === userId) || getSession();
        if (!user) return null;
        const match = db.batches.find((item) => item.year === String(year) && item.division === division)
            || db.batches.find((item) => item.division === division);
        if (match) {
            user.batchId = match.id;
            const stored = db.users.find((item) => item.id === user.id);
            if (stored) stored.batchId = match.id;
        }
        audit(db, user.email || "student", "profile-update", `Year ${year}, division ${division}`);
        notify(db, "admin", "Student profile updated", `${user.name} changed year/division.`);
        save(db);
        setSession(user);
        return user;
    }

    return {
        DAYS,
        load,
        save,
        id,
        getSession,
        setSession,
        clearSession,
        login,
        signup,
        enrichEntry,
        conflicts,
        buildSlots,
        generateTimetable,
        rescheduleLeave,
        pendingFaculty,
        approveFaculty,
        updateStudentBatch,
        reset() {
            const data = seed();
            save(data);
            return data;
        }
    };
})();

window.DemoStore = DemoStore;
