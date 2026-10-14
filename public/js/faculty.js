/**
 * Faculty dashboard: personal timetable, emergency leave, substitutions, notifications.
 */
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const session = DemoStore.getSession();
    if (!session) {
        window.location.replace("../login.html");
        return;
    }
    const db = DemoStore.load();
    try {
        const [timetableResult, leavesResult, notificationsResult] = await Promise.all([
            API.get("/faculty/timetable"),
            API.get("/faculty/leaves"),
            API.get("/notifications")
        ]);
        db.timetable = db.timetable.filter((item) => item.facultyId !== session.facultyId)
            .concat(timetableResult.timetable || []);
        db.leaves = db.leaves.filter((item) => item.facultyId !== session.facultyId)
            .concat(leavesResult.leaves || []);
        db.notifications = (db.notifications || []).filter((item) => item.role === "student")
            .concat(notificationsResult.notifications || []);
        DemoStore.save(db);
    } catch (error) {
        if (error.status) {
            Shared?.showToast?.(error.message || "Unable to load faculty data.", "danger");
            return;
        }
    }
    const faculty = db.faculty.find((item) => item.id === session.facultyId) || db.faculty[0];
    const $ = (sel) => document.querySelector(sel);

    $("#userName").textContent = faculty.name.split(" ")[0];
    $("#todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short"
    });

    const mine = db.timetable
        .filter((entry) => entry.facultyId === faculty.id)
        .map((entry) => DemoStore.enrichEntry(entry, db));
    $("#classCount").textContent = String(mine.length);
    $("#identityValue").textContent = faculty.qualification;

    const latestLeave = db.leaves.find((item) => item.facultyId === faculty.id);
    if (latestLeave) $("#leaveStatus").textContent = latestLeave.status;

    const today = new Date().getDay() || 6;
    const todayItems = mine.filter((item) => item.day === today);
    const strip = $("#todayStrip");
    if (!todayItems.length) {
        const p = document.createElement("p");
        p.className = "empty-state";
        p.textContent = "No classes today.";
        strip.append(p);
    } else {
        todayItems.forEach((item) => {
            const card = document.createElement("article");
            card.className = "today-card";
            const time = document.createElement("strong");
            time.textContent = `${item.start}–${item.end}`;
            const mid = document.createElement("div");
            const h3 = document.createElement("h3");
            h3.textContent = item.subjectName;
            const p = document.createElement("p");
            p.textContent = `${item.batchLabel} · ${item.roomCode}`;
            mid.append(h3, p);
            const badge = document.createElement("span");
            badge.className = `status ${item.type === "practical" ? "pending" : "published"}`;
            badge.textContent = item.type;
            card.append(time, mid, badge);
            strip.append(card);
        });
    }

    const grid = $("#weekGrid");
    ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((label) => {
        const el = document.createElement("div");
        el.className = "week-head";
        el.textContent = label;
        grid.append(el);
    });
    db.slots.forEach((slot) => {
        const time = document.createElement("div");
        time.className = "week-time";
        time.textContent = slot.start;
        grid.append(time);
        for (let day = 1; day <= 6; day += 1) {
            const cell = document.createElement("div");
            cell.className = "week-cell";
            mine.filter((item) => item.day === day && item.start === slot.start).forEach((item) => {
                const card = document.createElement("div");
                card.className = `slot-card ${item.type === "practical" ? "practical" : ""}`;
                const strong = document.createElement("strong");
                strong.textContent = item.subjectCode || item.subjectName;
                const s1 = document.createElement("small");
                s1.textContent = item.batchLabel;
                const s2 = document.createElement("small");
                s2.textContent = item.roomCode;
                card.append(strong, s1, s2);
                cell.append(card);
            });
            grid.append(cell);
        }
    });

    const body = $("#timetableRows");
    body.replaceChildren();
    mine.forEach((item) => {
        const tr = document.createElement("tr");
        [item.dayName, `${item.start}–${item.end}`, item.subjectName, item.batchLabel, item.roomCode].forEach((text) => {
            const td = document.createElement("td");
            td.textContent = text;
            tr.append(td);
        });
        body.append(tr);
    });

    const leaveList = $("#leaveList");
    const mineLeaves = db.leaves.filter((item) => item.facultyId === faculty.id);
    if (!mineLeaves.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No leave requests yet.";
        leaveList.append(empty);
    }
    mineLeaves.forEach((leave) => {
        const article = document.createElement("article");
        article.className = "list-item";
        const h3 = document.createElement("h3");
        h3.textContent = `${leave.startsOn} → ${leave.endsOn}`;
        const p = document.createElement("p");
        p.textContent = leave.reason || "No reason given";
        const small = document.createElement("small");
        small.textContent = leave.substitution || "Waiting for substitution";
        const status = document.createElement("span");
        status.className = `status ${leave.status}`;
        status.textContent = leave.status;
        article.append(h3, p, small, status);
        leaveList.append(article);
    });

    $("#leaveForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
            if (window.API?.applyLeave) {
                await API.applyLeave(payload);
                Shared?.showToast?.("Leave submitted. Admin will auto-reschedule if approved.", "success");
                form.reset();
                setTimeout(() => location.reload(), 600);
                return;
            }
        } catch (error) {
            if (error.status) {
                Shared?.showToast?.(error.message || "Unable to submit leave.", "danger");
                return;
            }
        }
        const data = DemoStore.load();
        data.leaves.unshift({
            id: DemoStore.id("l"),
            facultyId: faculty.id,
            facultyName: faculty.name,
            startsOn: payload.startsOn,
            endsOn: payload.endsOn,
            periods: payload.periods,
            reason: payload.reason,
            status: "pending",
            substitution: ""
        });
        data.notifications.unshift({
            id: DemoStore.id("n"),
            role: "admin",
            title: "New leave request",
            message: `${faculty.name} requested leave from ${payload.startsOn}.`,
            createdAt: new Date().toISOString(),
            read: false
        });
        DemoStore.save(data);
        Shared?.showToast?.("Leave submitted. Admin will auto-reschedule if approved.", "success");
        form.reset();
        setTimeout(() => location.reload(), 600);
    });

    const items = db.notifications.filter((item) => item.role !== "student");
    const unread = items.filter((item) => !item.read).length;
    const count = $("#navUnread");
    const dot = $("#bellDot");
    if (count) count.textContent = String(unread);
    if (dot) dot.hidden = unread === 0;

    const notif = $("#notificationList");
    const panel = $("#notifPanel");
    items.forEach((item) => {
        const article = document.createElement("article");
        article.className = `list-item ${item.read ? "" : "unread"}`;
        const h3 = document.createElement("h3");
        h3.textContent = item.title;
        const p = document.createElement("p");
        p.textContent = item.message;
        article.append(h3, p);
        notif.append(article.cloneNode(true));
        panel?.append(article);
    });

    $("#bellButton")?.addEventListener("click", () => panel?.classList.toggle("open"));
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".bell-wrap")) panel?.classList.remove("open");
    });
});
