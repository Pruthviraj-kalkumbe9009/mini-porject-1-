/**
 * Admin module: dashboard, teachers, subjects, rooms, timetable, leaves.
 * Tries live APIs first, then falls back to DemoStore.
 */
"use strict";

const AdminApp = (() => {
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    function toast(message, type = "success") {
        if (window.Shared?.showToast) Shared.showToast(message, type);
        else alert(message);
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[ch]));
    }

    async function withApi(apiCall, demoCall) {
        try {
            if (window.API && typeof apiCall === "function") {
                return await apiCall();
            }
        } catch (error) {
            if (error.status) throw error;
            console.warn("API unavailable, using demo data.", error);
        }
        return demoCall();
    }

    function paginate(rows, page, size) {
        const total = Math.max(1, Math.ceil(rows.length / size));
        const current = Math.min(Math.max(1, page), total);
        const start = (current - 1) * size;
        return { page: current, total, slice: rows.slice(start, start + size) };
    }

    function bindTableTools(state) {
        const search = $("#tableSearch");
        const sort = $("#tableSort");
        if (search) search.addEventListener("input", () => { state.page = 1; state.render(); });
        if (sort) sort.addEventListener("change", () => { state.page = 1; state.render(); });
        $("#prevPage")?.addEventListener("click", () => { state.page -= 1; state.render(); });
        $("#nextPage")?.addEventListener("click", () => { state.page += 1; state.render(); });
    }

    function bindShell() {
        const bell = $("#bellButton");
        const panel = $("#notifPanel");
        bell?.addEventListener("click", () => panel?.classList.toggle("open"));
        document.addEventListener("click", (event) => {
            if (!event.target.closest(".bell-wrap")) panel?.classList.remove("open");
        });
        renderNotifications();
        setInterval(renderNotifications, 45000);
    }

    function renderNotifications() {
        const db = DemoStore.load();
        const items = db.notifications.filter((item) => item.role === "all" || item.role === "admin");
        const unread = items.filter((item) => !item.read).length;
        const count = $("#navUnread");
        const dot = $("#bellDot");
        if (count) count.textContent = String(unread);
        if (dot) dot.hidden = unread === 0;
        const panel = $("#notifPanel");
        if (!panel) return;
        panel.replaceChildren();
        items.slice(0, 8).forEach((item) => {
            const article = document.createElement("article");
            article.className = `list-item ${item.read ? "" : "unread"}`;
            const title = document.createElement("h3");
            title.textContent = item.title;
            const message = document.createElement("p");
            message.textContent = item.message;
            article.append(title, message);
            panel.append(article);
        });
    }

    function initDashboard() {
        const db = DemoStore.load();
        $("#statTeachers").textContent = String(db.faculty.length);
        $("#statRooms").textContent = String(db.rooms.length);
        $("#statSubjects").textContent = String(db.subjects.length);
        $("#statLeaves").textContent = String(db.leaves.filter((item) => item.status === "pending").length);
        const load = Math.min(100, Math.round((db.timetable.length / 24) * 100));
        $("#kpiFill").style.width = `${load}%`;
        $("#kpiLabel").textContent = `${load}% of a typical weekly load is placed`;
        withApi(
            () => API.get("/admin/dashboard/stats"),
            () => null
        ).then((stats) => {
            if (!stats) return;
            $("#statTeachers").textContent = String(stats.teachers);
            $("#statRooms").textContent = String(stats.rooms);
            $("#statSubjects").textContent = String(stats.subjects);
            $("#statLeaves").textContent = String(stats.pendingLeaves);
        }).catch((error) => toast(error.message, "danger"));

        $("#generateBtn")?.addEventListener("click", async () => {
            toast("Running constraint solver…", "info");
            try {
                const result = await withApi(
                    () => API.generateTimetable(),
                    () => DemoStore.generateTimetable()
                );
                if (result?.timetable) {
                    const data = DemoStore.load();
                    data.timetable = result.timetable;
                    data.preview = result.timetable;
                    DemoStore.save(data);
                }
                const count = Number(result?.count ?? result?.timetable?.length ?? result?.preview?.length ?? 0);
                const unplaced = Number(result?.unplaced ?? 0);
                toast(`Preview ready: ${count} slots placed (${unplaced} unplaced).`);
                window.location.href = "timetable.html";
            } catch (error) {
                toast(error.message || "Unable to generate a timetable.", "danger");
            }
        });
    }

    function initTeachers() {
        const state = { page: 1, size: 5, render: null };
        const form = $("#resourceForm");
        state.render = () => {
            const db = DemoStore.load();
            const term = ($("#tableSearch")?.value || "").toLowerCase();
            let rows = db.faculty.filter((item) => JSON.stringify(item).toLowerCase().includes(term));
            const sort = $("#tableSort")?.value;
            if (sort) rows.sort((a, b) => String(a[sort] || "").localeCompare(String(b[sort] || "")));
            const { slice, page, total } = paginate(rows, state.page, state.size);
            state.page = page;
            const body = $("#tableBody");
            body.replaceChildren();
            slice.forEach((item) => {
                const dept = db.departments.find((d) => d.id === item.departmentId);
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.email)}</td>
                    <td>${escapeHtml(item.qualification)}</td>
                    <td>${escapeHtml(dept?.name || "")}</td>
                    <td>${item.maxPerDay} / ${item.maxPerWeek}</td>
                    <td class="table-actions">
                        ${item.isApproved === false ? `<button class="button primary" data-approve-account="${escapeHtml(item.id)}" type="button">Approve account</button>` : ""}
                        <button class="button secondary" data-edit="${item.id}" type="button">Edit</button>
                        <button class="button danger" data-del="${item.id}" type="button">Remove</button>
                    </td>`;
                body.append(tr);
            });
            $("#pageLabel").textContent = `Page ${page} of ${total}`;
        };
        bindTableTools(state);
        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const db = DemoStore.load();
            const data = Object.fromEntries(new FormData(form).entries());
            const record = {
                id: data.id || DemoStore.id("f"),
                name: data.name,
                email: data.email,
                qualification: data.qualification,
                departmentId: data.departmentId,
                subjects: (data.subjects || "").split(",").map((s) => s.trim()).filter(Boolean),
                maxPerDay: Number(data.maxPerDay) || 4,
                maxPerWeek: Number(data.maxPerWeek) || 16,
                availableDays: Array.from(form.querySelectorAll('input[name="day"]:checked')).map((el) => Number(el.value))
            };
            const index = db.faculty.findIndex((item) => item.id === record.id);
            try {
                const response = await withApi(
                    () => index >= 0
                        ? API.put(`/admin/faculty/${encodeURIComponent(record.id)}`, record)
                        : API.post("/admin/faculty", record),
                    () => ({ item: record })
                );
                if (index >= 0) db.faculty[index] = { ...db.faculty[index], ...(response.item || record) };
                else db.faculty.push(response.item || record);
                DemoStore.save(db);
                form.reset();
                toast("Faculty saved.");
                state.render();
            } catch (error) {
                toast(error.message || "Unable to save faculty.", "danger");
            }
        });
        $("#tableBody")?.addEventListener("click", async (event) => {
            const db = DemoStore.load();
            const editId = event.target.dataset.edit;
            const delId = event.target.dataset.del;
            const approveId = event.target.dataset.approveAccount;
            if (approveId) {
                try {
                    await withApi(
                        () => API.post(`/admin/faculty/${encodeURIComponent(approveId)}/approve`, {}),
                        () => null
                    );
                    const faculty = db.faculty.find((row) => row.id === approveId);
                    if (faculty) faculty.isApproved = true;
                    DemoStore.save(db);
                    toast("Faculty account approved.");
                    state.render();
                } catch (error) {
                    toast(error.message || "Unable to approve this faculty account.", "danger");
                }
                return;
            }
            if (editId) {
                const item = db.faculty.find((row) => row.id === editId);
                if (!item) return;
                form.id.value = item.id;
                form.name.value = item.name;
                form.email.value = item.email;
                form.qualification.value = item.qualification;
                form.departmentId.value = item.departmentId;
                form.maxPerDay.value = item.maxPerDay;
                form.maxPerWeek.value = item.maxPerWeek;
                if (form.subjects) form.subjects.value = (item.subjects || []).join(", ");
                form.querySelectorAll('input[name="day"]').forEach((el) => {
                    el.checked = (item.availableDays || []).includes(Number(el.value));
                });
            }
            if (delId && confirm("Remove this faculty member?")) {
                try {
                    await withApi(
                        () => API.delete(`/admin/faculty/${encodeURIComponent(delId)}`),
                        () => null
                    );
                } catch (error) {
                    toast(error.message || "Unable to remove faculty.", "danger");
                    return;
                }
                db.faculty = db.faculty.filter((row) => row.id !== delId);
                DemoStore.save(db);
                state.render();
            }
        });
        const db = DemoStore.load();
        const deptSelect = form?.departmentId;
        if (deptSelect) {
            deptSelect.replaceChildren(...db.departments.map((d) => {
                const option = document.createElement("option");
                option.value = d.id;
                option.textContent = d.name;
                return option;
            }));
        }
        state.render();
    }

    function initSimpleResource(kind, fields) {
        const state = { page: 1, size: 6, render: null };
        const form = $("#resourceForm");
        const collection = () => DemoStore.load()[kind];
        state.render = () => {
            const db = DemoStore.load();
            const term = ($("#tableSearch")?.value || "").toLowerCase();
            let rows = db[kind].filter((item) => JSON.stringify(item).toLowerCase().includes(term));
            const { slice, page, total } = paginate(rows, state.page, state.size);
            state.page = page;
            const body = $("#tableBody");
            body.replaceChildren();
            slice.forEach((item) => {
                const tr = document.createElement("tr");
                tr.innerHTML = fields.map((field) => `<td>${escapeHtml(item[field] ?? "")}</td>`).join("") +
                    `<td class="table-actions">
                        <button class="button secondary" data-edit="${item.id}" type="button">Edit</button>
                        <button class="button danger" data-del="${item.id}" type="button">Remove</button>
                    </td>`;
                body.append(tr);
            });
            $("#pageLabel").textContent = `Page ${page} of ${total}`;
        };
        bindTableTools(state);
        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const db = DemoStore.load();
            const data = Object.fromEntries(new FormData(form).entries());
            if (!data.id) data.id = DemoStore.id(kind.slice(0, 1));
            if (data.capacity) data.capacity = Number(data.capacity);
            if (data.sessionsPerWeek) data.sessionsPerWeek = Number(data.sessionsPerWeek);
            if (data.duration) data.duration = Number(data.duration);
            const index = db[kind].findIndex((item) => item.id === data.id);
            try {
                const response = await withApi(
                    () => index >= 0
                        ? API.put(`/admin/${kind}/${encodeURIComponent(data.id)}`, data)
                        : API.post(`/admin/${kind}`, data),
                    () => ({ item: data })
                );
                if (index >= 0) db[kind][index] = { ...db[kind][index], ...(response.item || data) };
                else db[kind].push(response.item || data);
                DemoStore.save(db);
                form.reset();
                toast("Saved.");
                state.render();
            } catch (error) {
                toast(error.message || "Unable to save this record.", "danger");
            }
        });
        $("#tableBody")?.addEventListener("click", async (event) => {
            const db = DemoStore.load();
            const editId = event.target.dataset.edit;
            const delId = event.target.dataset.del;
            if (editId) {
                const item = db[kind].find((row) => row.id === editId);
                Object.keys(item || {}).forEach((key) => {
                    if (form[key]) form[key].value = item[key];
                });
            }
            if (delId && confirm("Delete this record?")) {
                try {
                    await withApi(
                        () => API.delete(`/admin/${kind}/${encodeURIComponent(delId)}`),
                        () => null
                    );
                } catch (error) {
                    toast(error.message || "Unable to delete this record.", "danger");
                    return;
                }
                db[kind] = db[kind].filter((row) => row.id !== delId);
                DemoStore.save(db);
                state.render();
            }
        });
        collection();
        state.render();
    }

    function initTimetable() {
        const grid = $("#weekGrid");
        const warning = $("#conflictBanner");
        const form = $("#scheduleForm");
        const summary = $("#scheduleSummary");
        if (!grid) return;

        const timeLabel = (value) => {
            const [hours, minutes] = value.split(":").map(Number);
            const hour = hours % 12 || 12;
            return `${hour}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
        };

        function setWarning(message) {
            warning.hidden = !message;
            warning.textContent = message || "";
        }

        function populateScheduleForm(institution) {
            form.startTime.value = institution.startTime;
            form.endTime.value = institution.endTime;
            form.periodMinutes.value = institution.periodMinutes;
            form.labSessionPeriods.value = institution.labSessionPeriods || 2;
            form.lunchStart.value = institution.lunch.start;
            form.lunchEnd.value = institution.lunch.end;
            form.shortBreakStart.value = institution.shortBreak?.start || "10:50";
            form.shortBreakEnd.value = institution.shortBreak?.end || "11:00";
        }

        function intervalRows(institution) {
            return [
                { interval: institution.shortBreak, label: "Short break", className: "short-break" },
                { interval: institution.lunch, label: "Lunch", className: "" }
            ]
                .filter(({ interval }) => interval?.start && interval?.end)
                .sort((a, b) => a.interval.start.localeCompare(b.interval.start));
        }

        function paint() {
            const data = DemoStore.load();
            const days = data.institution.workingDays || [1, 2, 3, 4, 5, 6];
            const breaks = intervalRows(data.institution);
            const renderedBreaks = new Set();
            grid.replaceChildren();
            const heads = ["Period", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            heads.forEach((label) => {
                const el = document.createElement("div");
                el.className = "week-head";
                el.textContent = label;
                grid.append(el);
            });
            data.slots.forEach((slot) => {
                breaks.forEach(({ interval, label, className }, index) => {
                    if (renderedBreaks.has(index) || interval.end > slot.start) return;
                    renderedBreaks.add(index);
                    const row = document.createElement("div");
                    row.className = `break-row ${className}`;
                    row.textContent = `${label} · ${timeLabel(interval.start)}–${timeLabel(interval.end)}`;
                    grid.append(row);
                });
                const time = document.createElement("div");
                time.className = "week-time";
                time.textContent = `${slot.start}–${slot.end}`;
                grid.append(time);
                for (let day = 1; day <= 6; day += 1) {
                    const cell = document.createElement("div");
                    cell.className = "week-cell";
                    cell.dataset.day = String(day);
                    cell.dataset.start = slot.start;
                    cell.dataset.end = slot.end;
                    if (!days.includes(day)) {
                        cell.classList.add("closed-period");
                        grid.append(cell);
                        continue;
                    }
                    data.timetable.filter((entry) => entry.day === day && entry.start === slot.start).forEach((entry) => {
                        const rich = DemoStore.enrichEntry(entry, data);
                        const card = document.createElement("div");
                        card.className = `slot-card ${rich.type === "practical" ? "practical" : ""}`;
                        card.draggable = true;
                        card.dataset.id = entry.id;
                        const strong = document.createElement("strong");
                        strong.textContent = rich.subjectCode || rich.subjectName;
                        const s1 = document.createElement("small");
                        s1.textContent = rich.facultyName;
                        const s2 = document.createElement("small");
                        s2.textContent = `${rich.roomCode} · ${rich.batchLabel}`;
                        const s3 = document.createElement("small");
                        s3.textContent = `${entry.start}–${entry.end}${entry.published ? " · Published" : " · Draft"}`;
                        card.append(strong, s1, s2, s3);
                        cell.append(card);
                    });
                    grid.append(cell);
                }
            });
            breaks.forEach(({ interval, label, className }, index) => {
                if (renderedBreaks.has(index)) return;
                const row = document.createElement("div");
                row.className = `break-row ${className}`;
                row.textContent = `${label} · ${timeLabel(interval.start)}–${timeLabel(interval.end)}`;
                grid.append(row);
            });

            const periodStarts = new Set(data.slots.map((slot) => slot.start));
            const outOfSchedule = data.timetable.filter((entry) => (
                !periodStarts.has(entry.start) || !days.includes(entry.day)
                || DemoStore.conflicts(entry, data, entry.id).length > 0
            )).length;
            summary.textContent = `${data.timetable.length} classes · ${data.subjects.filter((item) => item.type === "practical").length} practical subjects · ${data.slots.length} periods per working day`;
            if (outOfSchedule) {
                setWarning(`${outOfSchedule} existing class${outOfSchedule === 1 ? "" : "es"} do not fit the saved periods, working days or conflict rules. Regenerate the timetable to realign them.`);
            } else {
                setWarning("");
            }
        }

        grid.addEventListener("dragstart", (event) => {
            const id = event.target.closest(".slot-card")?.dataset.id;
            if (id) event.dataTransfer.setData("text/plain", id);
        });
        grid.addEventListener("dragover", (event) => {
            const cell = event.target.closest(".week-cell");
            if (!cell) return;
            event.preventDefault();
            cell.classList.add("drop-over");
        });
        grid.addEventListener("dragleave", (event) => {
            event.target.closest(".week-cell")?.classList.remove("drop-over");
        });
        grid.addEventListener("drop", async (event) => {
            const cell = event.target.closest(".week-cell");
            if (!cell) return;
            event.preventDefault();
            cell.classList.remove("drop-over");
            if (cell.classList.contains("closed-period")) {
                const message = "Classes can only be moved to configured working days.";
                setWarning(message);
                toast(message, "danger");
                return;
            }
            const id = event.dataTransfer.getData("text/plain");
            const data = DemoStore.load();
            const entry = data.timetable.find((item) => item.id === id);
            if (!entry) return;
            const slots = data.slots;
            const firstSlot = slots.findIndex((slot) => slot.start === cell.dataset.start);
            const block = [];
            let periodCount = Number(entry.periodCount);
            if (!Number.isInteger(periodCount) || periodCount < 1) {
                const subject = data.subjects.find((item) => item.id === entry.subjectId);
                periodCount = subject?.type === "practical"
                    ? Number(data.institution.labSessionPeriods) || Number(subject.duration) || 1
                    : Number(subject?.duration) || 1;
            }
            for (let index = firstSlot; index >= 0 && index < slots.length && block.length < periodCount; index += 1) {
                const slot = slots[index];
                if (block.length && block[block.length - 1].end !== slot.start) break;
                block.push(slot);
            }
            if (!block.length || block.length !== periodCount) {
                const message = "This session does not fit in a continuous block of configured periods.";
                setWarning(message);
                toast(message, "danger");
                return;
            }
            const next = {
                ...entry,
                day: Number(cell.dataset.day),
                start: cell.dataset.start,
                end: block[block.length - 1].end,
                periodCount
            };
            const reasons = DemoStore.conflicts(next, data, id);
            if (reasons.length) {
                setWarning(reasons[0]);
                toast(reasons[0], "danger");
                return;
            }
            const previous = { ...entry };
            Object.assign(entry, next);
            try {
                const endpoint = entry.published
                    ? `/admin/timetable/${encodeURIComponent(id)}`
                    : `/admin/timetable/preview/${encodeURIComponent(id)}`;
                await withApi(() => API.put(endpoint, next), () => null);
                DemoStore.save(data);
                paint();
                toast("Slot moved. No hard conflicts.");
            } catch (error) {
                Object.assign(entry, previous);
                setWarning(error.message);
                toast(error.message || "Unable to move this slot.", "danger");
            }
        });

        $("#publishBtn")?.addEventListener("click", async () => {
            const current = DemoStore.load();
            const invalidEntry = current.timetable.find((entry) => (
                !(current.institution.workingDays || [1, 2, 3, 4, 5, 6]).includes(entry.day)
                || DemoStore.conflicts(entry, current, entry.id).length > 0
            ));
            if (!current.timetable.length || invalidEntry) {
                const message = invalidEntry
                    ? DemoStore.conflicts(invalidEntry, current, invalidEntry.id)[0] || "Resolve all schedule conflicts before publishing."
                    : "Generate a timetable before publishing.";
                setWarning(message);
                toast(message, "danger");
                return;
            }
            try {
                await withApi(() => API.publishTimetable(), () => null);
            } catch (error) {
                toast(error.message || "Unable to publish timetable.", "danger");
                return;
            }
            const data = DemoStore.load();
            data.timetable.forEach((item) => { item.published = true; });
            data.notifications.unshift({
                id: DemoStore.id("n"),
                role: "all",
                title: "Timetable published",
                message: "Admin published the updated weekly timetable for students and faculty.",
                createdAt: new Date().toISOString(),
                read: false
            });
            data.preview = null;
            DemoStore.save(data);
            toast("Timetable published and students and faculty notified.");
            paint();
        });

        $("#generateBtn")?.addEventListener("click", async () => {
            try {
                const result = await withApi(
                    () => API.generateTimetable(),
                    () => DemoStore.generateTimetable()
                );
                if (result?.timetable) {
                    const db = DemoStore.load();
                    db.timetable = result.timetable;
                    db.preview = result.timetable;
                    DemoStore.save(db);
                }
                paint();
                toast(`Timetable preview ready: ${result.count} slots, ${result.unplaced} unplaced.`);
            } catch (error) {
                toast(error.message || "Unable to generate a timetable.", "danger");
            }
        });

        const initialData = DemoStore.load();
        initialData.slots = DemoStore.buildSlots(initialData.institution);
        DemoStore.save(initialData);
        populateScheduleForm(initialData.institution);
        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = DemoStore.load();
            const nextInstitution = {
                ...data.institution,
                startTime: form.startTime.value,
                endTime: form.endTime.value,
                periodMinutes: Number(form.periodMinutes.value),
                labSessionPeriods: Number(form.labSessionPeriods.value),
                lunch: { start: form.lunchStart.value, end: form.lunchEnd.value },
                shortBreak: { start: form.shortBreakStart.value, end: form.shortBreakEnd.value }
            };
            try {
                const slots = DemoStore.buildSlots(nextInstitution);
                if (slots.length === 0) throw new Error("The selected plan does not create any teaching periods.");
                await withApi(() => API.put("/admin/institution", nextInstitution), () => null);
                data.institution = nextInstitution;
                data.slots = slots;
                data.preview = null;
                data.timetable.forEach((entry) => { entry.published = false; });
                DemoStore.save(data);
                paint();
                toast("Period plan saved. Review and republish the timetable after regeneration.");
            } catch (error) {
                setWarning(error.message);
                toast(error.message, "danger");
            }
        });

        paint();
        if (initialData.preview) toast("Showing generated preview. Adjust with drag-and-drop.");
    }

    function initInstitution() {
        const db = DemoStore.load();
        const form = $("#institutionForm");
        if (form) {
            form.name.value = db.institution.name;
            form.startTime.value = db.institution.startTime;
            form.endTime.value = db.institution.endTime;
            form.periodMinutes.value = db.institution.periodMinutes;
            if (form.labSessionPeriods) form.labSessionPeriods.value = db.institution.labSessionPeriods || 2;
            form.lunchStart.value = db.institution.lunch.start;
            if (form.lunchEnd) form.lunchEnd.value = db.institution.lunch.end;
            if (form.academicYear) form.academicYear.value = db.institution.academicYear;
            if (form.shortBreakStart) form.shortBreakStart.value = db.institution.shortBreak?.start || "10:50";
            if (form.shortBreakEnd) form.shortBreakEnd.value = db.institution.shortBreak?.end || "11:00";
            form.querySelectorAll('input[name="workDay"]').forEach((el) => {
                el.checked = (db.institution.workingDays || []).includes(Number(el.value));
            });
            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                const data = DemoStore.load();
                data.institution.name = form.name.value;
                data.institution.startTime = form.startTime.value;
                data.institution.endTime = form.endTime.value;
                data.institution.periodMinutes = Number(form.periodMinutes.value);
                data.institution.lunch.start = form.lunchStart.value;
                if (form.lunchEnd) data.institution.lunch.end = form.lunchEnd.value;
                if (form.labSessionPeriods) data.institution.labSessionPeriods = Number(form.labSessionPeriods.value);
                if (form.academicYear) data.institution.academicYear = form.academicYear.value;
                if (form.shortBreakStart) {
                    data.institution.shortBreak = data.institution.shortBreak || {};
                    data.institution.shortBreak.start = form.shortBreakStart.value;
                    data.institution.shortBreak.end = form.shortBreakEnd.value;
                }
                try {
                    data.slots = DemoStore.buildSlots(data.institution);
                    const days = Array.from(form.querySelectorAll('input[name="workDay"]:checked')).map((el) => Number(el.value));
                    if (days.length) data.institution.workingDays = days;
                    await withApi(() => API.put("/admin/institution", data.institution), () => null);
                } catch (error) {
                    toast(error.message, "danger");
                    return;
                }
                data.preview = null;
                data.timetable.forEach((entry) => { entry.published = false; });
                DemoStore.save(data);
                toast("Institution and period settings saved. Regenerate and republish the timetable.");
            });

        const deptBody = $("#departmentRows");
        const programBody = $("#programRows");
        const paintCatalog = () => {
            const data = DemoStore.load();
            if (deptBody) {
                deptBody.replaceChildren();
                data.departments.forEach((item) => {
                    const tr = document.createElement("tr");
                    [item.code, item.name].forEach((text) => {
                        const td = document.createElement("td");
                        td.textContent = text;
                        tr.append(td);
                    });
                    deptBody.append(tr);
                });
            }
            if (programBody) {
                programBody.replaceChildren();
                data.programs.forEach((item) => {
                    const dept = data.departments.find((row) => row.id === item.departmentId);
                    const tr = document.createElement("tr");
                    [dept?.name, item.name].forEach((text) => {
                        const td = document.createElement("td");
                        td.textContent = text;
                        tr.append(td);
                    });
                    programBody.append(tr);
                });
            }
        };
        paintCatalog();
        $("#departmentForm")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = DemoStore.load();
            const payload = Object.fromEntries(new FormData(event.target).entries());
            const record = { id: DemoStore.id("d"), name: payload.name, code: payload.code };
            try {
                await withApi(() => API.post("/admin/departments", record), () => null);
            } catch (error) {
                toast(error.message || "Unable to add department.", "danger");
                return;
            }
            data.departments.push(record);
            DemoStore.save(data);
            event.target.reset();
            paintCatalog();
            toast("Department added.");
            location.reload();
        });
        $("#programForm")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = DemoStore.load();
            const payload = Object.fromEntries(new FormData(event.target).entries());
            const record = {
                id: DemoStore.id("p"),
                departmentId: payload.departmentId,
                name: payload.name,
                type: data.institution.type || "college"
            };
            try {
                await withApi(() => API.post("/admin/programs", record), () => null);
            } catch (error) {
                toast(error.message || "Unable to add program.", "danger");
                return;
            }
            data.programs.push(record);
            DemoStore.save(data);
            event.target.reset();
            paintCatalog();
            toast("Program added.");
        });
        const programDept = $("#programDepartment");
        if (programDept) {
            programDept.replaceChildren(...db.departments.map((d) => {
                const option = document.createElement("option");
                option.value = d.id;
                option.textContent = d.name;
                return option;
            }));
        }
        }
        const body = $("#batchRows");
        if (!body) return;
        const paintBatches = () => {
            const data = DemoStore.load();
            body.replaceChildren();
            data.batches.forEach((batch) => {
                const dept = data.departments.find((item) => item.id === batch.departmentId);
                const tr = document.createElement("tr");
                [dept?.name, batch.year, batch.semester, batch.division, batch.practicalBatch, batch.studentCount || "—"].forEach((text) => {
                    const td = document.createElement("td");
                    td.textContent = text;
                    tr.append(td);
                });
                body.append(tr);
            });
        };
        paintBatches();

        const deptSelect = $("#batchDepartment");
        if (deptSelect) {
            deptSelect.replaceChildren(...db.departments.map((d) => {
                const option = document.createElement("option");
                option.value = d.id;
                option.textContent = d.name;
                return option;
            }));
        }
        $("#batchForm")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const data = DemoStore.load();
            const payload = Object.fromEntries(new FormData(event.target).entries());
            const record = {
                id: DemoStore.id("b"),
                departmentId: payload.departmentId,
                programId: data.programs.find((item) => item.departmentId === payload.departmentId)?.id || "",
                year: payload.year,
                semester: payload.semester,
                division: payload.division,
                practicalBatch: payload.practicalBatch,
                studentCount: Number(payload.studentCount) || 0,
                academicYear: data.institution.academicYear
            };
            try {
                await withApi(() => API.post("/admin/batches", record), () => null);
            } catch (error) {
                toast(error.message || "Unable to add batch.", "danger");
                return;
            }
            data.batches.push(record);
            DemoStore.save(data);
            event.target.reset();
            paintBatches();
            toast("Batch added. It will appear in student onboarding dropdowns.");
        });
    }

    function initLeaves() {
        const list = $("#leaveList");
        const render = () => {
            const db = DemoStore.load();
            list.replaceChildren();
            db.leaves.forEach((leave) => {
                const article = document.createElement("article");
                article.className = "list-item";
                article.innerHTML = `
                    <div>
                        <h3>${escapeHtml(leave.facultyName)}</h3>
                        <p>${escapeHtml(leave.startsOn)} to ${escapeHtml(leave.endsOn)} · ${escapeHtml(leave.periods)}</p>
                        <small>${escapeHtml(leave.reason || "")}</small>
                        <small>${escapeHtml(leave.substitution || "No substitute yet")}</small>
                    </div>
                    <div class="review-actions">
                        <span class="status ${escapeHtml(leave.status)}">${escapeHtml(leave.status)}</span>
                        ${leave.status === "pending" ? `<button class="button secondary" data-approve="${escapeHtml(leave.id)}" type="button">Approve + reschedule</button>` : ""}
                    </div>`;
                list.append(article);
            });
        };
        list.addEventListener("click", async (event) => {
            const id = event.target.dataset.approve;
            if (!id) return;
            try {
                const result = await withApi(
                    () => API.post(`/admin/leaves/${encodeURIComponent(id)}/approve`, {}),
                    () => DemoStore.rescheduleLeave(id)
                );
                const approvedLeave = result?.leave || result;
                if (approvedLeave) {
                    const db = DemoStore.load();
                    const index = db.leaves.findIndex((leave) => leave.id === id);
                    if (index >= 0) db.leaves[index] = approvedLeave;
                    DemoStore.save(db);
                }
            } catch (error) {
                toast(error.message || "Unable to approve this leave.", "danger");
                return;
            }
            toast("Leave approved. Scheduler rearranged overlapping slots.");
            render();
        });
        render();
    }

    function initApprovals() {
        const list = $("#approvalList");
        const logs = $("#auditList");
        const render = () => {
            if (list) {
                list.replaceChildren();
                const pending = DemoStore.pendingFaculty();
                if (!pending.length) {
                    const p = document.createElement("p");
                    p.className = "empty-state";
                    p.textContent = "No faculty waiting for approval.";
                    list.append(p);
                }
                pending.forEach((user) => {
                    const article = document.createElement("article");
                    article.className = "list-item";
                    const h3 = document.createElement("h3");
                    h3.textContent = user.name;
                    const p = document.createElement("p");
                    p.textContent = user.email;
                    const button = document.createElement("button");
                    button.className = "button primary";
                    button.type = "button";
                    button.dataset.approveUser = user.id;
                    button.textContent = "Approve";
                    article.append(h3, p, button);
                    list.append(article);
                });
            }
            if (logs) {
                logs.replaceChildren();
                DemoStore.load().auditLogs?.slice(0, 12).forEach((item) => {
                    const article = document.createElement("article");
                    article.className = "list-item";
                    const h3 = document.createElement("h3");
                    h3.textContent = item.action;
                    const p = document.createElement("p");
                    p.textContent = `${item.actor}: ${item.detail}`;
                    article.append(h3, p);
                    logs.append(article);
                });
            }
        };
        list?.addEventListener("click", (event) => {
            const id = event.target.dataset.approveUser;
            if (!id) return;
            DemoStore.approveFaculty(id);
            toast("Faculty approved. They can sign in now.");
            render();
        });
        render();
    }

    async function syncAdminData() {
        if (!window.API) return;
        try {
            const remote = await API.get("/admin/bootstrap");
            const db = DemoStore.load();
            ["departments", "programs", "batches", "faculty", "subjects", "rooms", "timetable", "leaves", "notifications"]
                .forEach((key) => {
                    if (Array.isArray(remote[key])) db[key] = remote[key];
                });
            if (Array.isArray(remote["time-slots"])) db.slots = remote["time-slots"];
            if (remote.institution) db.institution = remote.institution;
            db.preview = remote.preview || null;
            if (remote.preview) db.timetable = remote.preview;
            DemoStore.save(db);
        } catch (error) {
            if (error.status) throw error;
            console.warn("Backend unavailable, using demo data.", error);
        }
    }

    async function init() {
        if (!DemoStore.getSession()) {
            window.location.replace("../login.html");
            return;
        }
        bindShell();
        try {
            await syncAdminData();
        } catch (error) {
            toast(error.message || "Unable to load admin data.", "danger");
            return;
        }
        const page = document.body.dataset.page;
        if (page === "dashboard") initDashboard();
        if (page === "teachers") initTeachers();
        if (page === "subjects") initSimpleResource("subjects", ["code", "name", "type", "sessionsPerWeek"]);
        if (page === "rooms") initSimpleResource("rooms", ["code", "type", "capacity"]);
        if (page === "timetable") initTimetable();
        if (page === "leaves") initLeaves();
        if (page === "institution") initInstitution();
        if (page === "approvals") initApprovals();
    }

    document.addEventListener("DOMContentLoaded", () => { void init(); });
    return { init };
})();
