"use strict";

const bcrypt = require("bcryptjs");
const { User } = require("./models");
const { replace } = require("./data");

const departments = [
    { id: "d-cse", name: "Computer Science", code: "CSE" },
    { id: "d-ece", name: "Electronics", code: "ECE" },
    { id: "d-mech", name: "Mechanical", code: "ME" }
];
const batches = [
    { id: "b-cse5a", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "A", practicalBatch: "A1", academicYear: "2026-27" },
    { id: "b-cse5a2", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "A", practicalBatch: "A2", academicYear: "2026-27" },
    { id: "b-cse5b", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "B", practicalBatch: "B1", academicYear: "2026-27" },
    { id: "b-cse5c", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "C", practicalBatch: "C1", academicYear: "2026-27" },
    { id: "b-cse5d", departmentId: "d-cse", programId: "p-be-cse", year: "3", semester: "5", division: "D", practicalBatch: "D1", academicYear: "2026-27" }
];
const faculty = [
    { id: "f1", name: "Dr. Asha Nair", email: "faculty@smart.edu", qualification: "Ph.D. CSE", departmentId: "d-cse", subjects: ["s1", "s3"], maxPerDay: 4, maxPerWeek: 16, availableDays: [1, 2, 3, 4, 5], isApproved: true },
    { id: "f2", name: "Prof. Rohan Iyer", email: "rohan@smart.edu", qualification: "M.Tech", departmentId: "d-cse", subjects: ["s2"], maxPerDay: 3, maxPerWeek: 14, availableDays: [1, 2, 3, 4, 5, 6], isApproved: true },
    { id: "f3", name: "Dr. Meera Das", email: "meera@smart.edu", qualification: "Ph.D. AI", departmentId: "d-cse", subjects: ["s4"], maxPerDay: 3, maxPerWeek: 12, availableDays: [1, 2, 3, 4], isApproved: true }
];
const subjects = [
    { id: "s1", code: "CSE-301", name: "Database Management", departmentId: "d-cse", type: "theory", sessionsPerWeek: 4, duration: 1, facultyId: "f1", batchIds: ["b-cse5a"] },
    { id: "s2", code: "CSE-302", name: "Operating Systems", departmentId: "d-cse", type: "practical", sessionsPerWeek: 2, duration: 2, facultyId: "f2", batchIds: ["b-cse5a"] },
    { id: "s3", code: "CSE-303", name: "Computer Networks", departmentId: "d-cse", type: "theory", sessionsPerWeek: 3, duration: 1, facultyId: "f1", batchIds: ["b-cse5a"] },
    { id: "s4", code: "CSE-410", name: "Machine Learning", departmentId: "d-cse", type: "theory", sessionsPerWeek: 3, duration: 1, facultyId: "f3", batchIds: ["b-cse5a"] }
];
const rooms = [
    { id: "r1", code: "C-204", type: "classroom", capacity: 60 },
    { id: "r2", code: "A-112", type: "lecture_hall", capacity: 120 },
    { id: "r3", code: "LAB-2", type: "laboratory", capacity: 30 },
    { id: "r4", code: "LAB-1", type: "laboratory", capacity: 24 }
];
const timeSlots = [
    { id: "p1", start: "09:00", end: "10:00" },
    { id: "p2", start: "10:00", end: "10:50" },
    { id: "p3", start: "11:00", end: "12:00" },
    { id: "p4", start: "13:00", end: "14:00" },
    { id: "p5", start: "14:00", end: "15:00" },
    { id: "p6", start: "15:00", end: "16:00" }
];
const initialTimetable = [
    { id: "t1", day: 1, start: "09:00", end: "10:00", subjectId: "s1", facultyId: "f1", roomId: "r1", batchId: "b-cse5a", published: true },
    { id: "t2", day: 1, start: "11:00", end: "12:00", subjectId: "s3", facultyId: "f1", roomId: "r1", batchId: "b-cse5a", published: true },
    { id: "t3", day: 2, start: "13:00", end: "15:00", subjectId: "s2", facultyId: "f2", roomId: "r3", batchId: "b-cse5a", published: true },
    { id: "t4", day: 3, start: "09:00", end: "10:00", subjectId: "s4", facultyId: "f3", roomId: "r2", batchId: "b-cse5a", published: true },
    { id: "t5", day: 4, start: "14:00", end: "15:00", subjectId: "s1", facultyId: "f1", roomId: "r1", batchId: "b-cse5a", published: true },
    { id: "t6", day: 5, start: "09:00", end: "10:00", subjectId: "s3", facultyId: "f1", roomId: "r1", batchId: "b-cse5a", published: true },
    { id: "t7", day: 5, start: "13:00", end: "14:00", subjectId: "s4", facultyId: "f3", roomId: "r2", batchId: "b-cse5a", published: true }
];

const demoUsers = [
    { _id: "u-admin", name: "Campus Admin", email: "admin@smart.edu", password: "Admin@123", role: "admin", isApproved: true, isProfileComplete: true },
    { _id: "u-fac-1", name: "Dr. Asha Nair", email: "faculty@smart.edu", password: "Faculty@123", role: "faculty", isApproved: true, facultyId: "f1" },
    { _id: "u-fac-2", name: "Prof. Rohan Iyer", email: "rohan@smart.edu", password: "Faculty@123", role: "faculty", isApproved: true, facultyId: "f2" },
    { _id: "u-stu", name: "Pruthvi K", email: "student@smart.edu", password: "Student@123", role: "student", rollNumber: "22CS001", isProfileComplete: true, batchId: "b-cse5a", profile: { departmentId: "d-cse", year: "3", division: "A", semester: "5", academicYear: "2026-27" } },
    { _id: "u-new", name: "New Student", email: "newstudent@smart.edu", password: "Student@123", role: "student", rollNumber: "22CS099", isProfileComplete: false }
];

async function seed() {
    const existingUsers = await User.countDocuments();
    if (!existingUsers) {
        const production = process.env.NODE_ENV === "production";
        const configuredAdminEmail = process.env.ADMIN_EMAIL;
        const configuredAdminPassword = process.env.ADMIN_PASSWORD;
        if (production && (!configuredAdminEmail || !configuredAdminPassword)) {
            throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before starting an empty production database.");
        }
        const users = production
            ? [{ _id: "u-admin", name: "Institution Admin", email: configuredAdminEmail, password: configuredAdminPassword, role: "admin" }]
            : demoUsers;
        for (const item of users) {
            const { password, ...fields } = item;
            await User.create({
                ...fields,
                email: fields.email.toLowerCase(),
                passwordHash: await bcrypt.hash(password, 12)
            });
        }
    }

    if (process.env.NODE_ENV !== "production") {
        const initialData = {
            departments,
            programs: [
                { id: "p-be-cse", departmentId: "d-cse", name: "B.E. Computer Science", type: "college" },
                { id: "p-be-ece", departmentId: "d-ece", name: "B.E. Electronics", type: "college" }
            ],
            batches,
            faculty,
            subjects,
            rooms,
            "time-slots": timeSlots,
            timetable: initialTimetable,
            leaves: [{
                id: "l1", facultyId: "f1", facultyName: "Dr. Asha Nair",
                startsOn: "2026-10-08", endsOn: "2026-10-09", periods: "full-day",
                reason: "Conference travel", status: "approved",
                substitution: "Prof. Rohan Iyer covering CSE-301"
            }],
            notifications: [
                { id: "n1", role: "all", title: "Timetable published", message: "Semester 5 CSE-A weekly schedule is live.", createdAt: new Date().toISOString(), read: false },
                { id: "n2", role: "faculty", title: "Leave approved", message: "Dr. Asha Nair leave for 8–9 Oct is approved with a substitute.", createdAt: new Date().toISOString(), read: false }
            ],
            "audit-logs": [{ id: "a1", actor: "system", action: "seed", detail: "Demo catalog loaded", at: new Date().toISOString() }]
        };
        const { AppData } = require("./models");
        for (const [bucket, records] of Object.entries(initialData)) {
            if (!await AppData.exists({ bucket })) await replace(bucket, records);
        }
        await AppData.updateOne(
            { bucket: "institution", recordId: "default" },
            { $setOnInsert: { data: {
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
            } } },
            { upsert: true }
        );
    }
}

module.exports = seed;
