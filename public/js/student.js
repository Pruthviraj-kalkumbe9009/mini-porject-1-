/**
 * Student dashboard: weekly grid, today view, notifications, profile edit.
 */
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const $ = (sel) => document.querySelector(sel);
    const session = DemoStore.getSession();
    if (!session) {
        window.location.replace("../login.html");
        return;
    }
    const db = DemoStore.load();
    const user = session;
    if (user.role === "faculty" || user.role === "admin") {
        $("#facultyViewLink")?.removeAttribute("hidden");
    }

    if (user && user.role === "student" && user.isProfileComplete === false) {
        window.location.replace("onboarding.html");
        return;
    }

    const batchId = user?.batchId || "b-cse5a";
    try {
        const [timetableResult, options, notificationsResult] = await Promise.all([
            API.get("/student/timetable"),
            API.get("/student/options"),
            API.get("/notifications")
        ]);
        db.timetable = db.timetable.filter((item) => item.batchId !== batchId)
            .concat(timetableResult.timetable || []);
        if (Array.isArray(options.timeSlots)) db.slots = options.timeSlots;
        if (options.institution) db.institution = options.institution;
        db.notifications = (db.notifications || []).filter((item) => item.role === "faculty")
            .concat(notificationsResult.notifications || []);
        DemoStore.save(db);
    } catch (error) {
        if (error.status) {
            Shared?.showToast?.(error.message || "Unable to load your timetable.", "danger");
            return;
        }
    }
    const entries = db.timetable.filter((item) => item.batchId === batchId && item.published)
        .map((item) => DemoStore.enrichEntry(item, db));

    $("#userName").textContent = (user?.name || "Student").split(" ")[0];
    const studentBatch = db.batches.find((item) => item.id === batchId);
    const department = db.departments.find((item) => item.id === studentBatch?.departmentId);
    $("#identityValue").textContent = studentBatch
        ? `${department?.code || department?.name || "Batch"} · Year ${studentBatch.year} · Sem ${studentBatch.semester} · ${studentBatch.division}`
        : "Batch pending";
    const profileForm = $("#profileForm");
    if (profileForm) {
        profileForm.year.value = user?.profile?.year || db.batches.find((item) => item.id === batchId)?.year || "";
        profileForm.division.value = user?.profile?.division || db.batches.find((item) => item.id === batchId)?.division || "";
    }
    $("#classCount").textContent = String(entries.length);
    $("#todayLabel").textContent = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

    const panel = $("#notifPanel");
    $("#bellButton")?.addEventListener("click", () => panel?.classList.toggle("open"));
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".bell-wrap")) panel?.classList.remove("open");
    });

    const empty = $("#emptyState");
    if (!entries.length && empty) empty.hidden = false;

    const today = new Date().getDay() || 6;
    const strip = $("#todayStrip");
    const todays = entries.filter((item) => item.day === today);
    if (!todays.length) {
        const p = document.createElement("p");
        p.className = "empty-state";
        p.textContent = "No classes scheduled today.";
        strip.append(p);
    } else {
        todays.forEach((item) => {
            const card = document.createElement("article");
            card.className = "today-card";
            const time = document.createElement("strong");
            time.textContent = `${item.start}–${item.end}`;
            const mid = document.createElement("div");
            const h3 = document.createElement("h3");
            h3.textContent = item.subjectName;
            const p = document.createElement("p");
            p.textContent = `${item.facultyName} · ${item.roomCode} · ${item.type}`;
            mid.append(h3, p);
            const badge = document.createElement("span");
            badge.className = `status ${item.type === "practical" ? "pending" : "published"}`;
            badge.textContent = item.type;
            card.append(time, mid, badge);
            strip.append(card);
        });
    }

    const grid = $("#weekGrid");
    const heads = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    heads.forEach((label) => {
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
            entries.filter((item) => item.day === day && item.start === slot.start).forEach((item) => {
                const card = document.createElement("div");
                card.className = `slot-card ${item.type === "practical" ? "practical" : ""}`;
                const strong = document.createElement("strong");
                strong.textContent = item.subjectCode;
                const s1 = document.createElement("small");
                s1.textContent = item.facultyName;
                const s2 = document.createElement("small");
                s2.textContent = item.roomCode;
                card.append(strong, s1, s2);
                cell.append(card);
            });
            grid.append(cell);
        }
    });

    function paintNotifications() {
        const data = DemoStore.load();
        const items = data.notifications.filter((item) => item.role !== "faculty");
        const unread = items.filter((item) => !item.read).length;
        $("#unreadCount").textContent = String(unread);
        $("#navUnread").textContent = String(unread);
        const dot = $("#bellDot");
        if (dot) dot.hidden = unread === 0;
        const list = $("#notificationList");
        list.replaceChildren();
        panel?.replaceChildren();
        items.forEach((item) => {
            const article = document.createElement("article");
            article.className = `list-item ${item.read ? "" : "unread"}`;
            const h3 = document.createElement("h3");
            h3.textContent = item.title;
            const p = document.createElement("p");
            p.textContent = item.message;
            article.append(h3, p);
            list.append(article);
            panel?.append(article.cloneNode(true));
        });
        const banner = $("#changeBanner");
        if (banner) banner.hidden = unread === 0;
    }

    $("#markReadButton")?.addEventListener("click", async () => {
        const data = DemoStore.load();
        try {
            await Promise.all(data.notifications
                .filter((item) => item.role !== "faculty" && !item.read)
                .map((item) => API.put(`/notifications/${encodeURIComponent(item.id)}/read`, {})));
        } catch (error) {
            Shared?.showToast?.(error.message || "Unable to update notifications.", "danger");
            return;
        }
        data.notifications.forEach((item) => { item.read = true; });
        DemoStore.save(data);
        paintNotifications();
    });
    paintNotifications();
    setInterval(paintNotifications, 40000);

    $("#editProfileButton")?.addEventListener("click", () => $("#profileDialog")?.showModal());
    $("#closeProfileDialog")?.addEventListener("click", () => $("#profileDialog")?.close());
    $("#cancelProfileEdit")?.addEventListener("click", () => $("#profileDialog")?.close());
    $("#profileForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!confirm("Change year/division? This is logged for audit.")) return;
        const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
            const result = await API.put("/student/profile", payload);
            if (result.user) DemoStore.setSession(result.user);
            Shared?.showToast?.("Profile updated.", "success");
            $("#profileDialog").close();
            window.setTimeout(() => window.location.reload(), 500);
            return;
        } catch (error) {
            if (error.status) {
                Shared?.showToast?.(error.message || "Unable to update your profile.", "danger");
                return;
            }
        }
        const data = DemoStore.load();
        DemoStore.updateStudentBatch(user?.id, payload.year, payload.division);
        data.notifications.unshift({
            id: DemoStore.id("n"),
            role: "admin",
            title: "Student profile updated",
            message: `${user?.name || "Student"} updated academic details.`,
            createdAt: new Date().toISOString(),
            read: false
        });
        DemoStore.save(data);
        $("#profileDialog").close();
        Shared?.showToast?.("Profile updated.", "success");
    });
});
