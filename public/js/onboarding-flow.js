"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    const session = DemoStore.getSession();
    if (!session) {
        window.location.replace("../login.html");
        return;
    }
    const demoData = DemoStore.load();
    let db = demoData;
    try {
        const options = await API.get("/student/options");
        db = { ...demoData, ...options };
    } catch (error) {
        if (error.status) {
            Shared?.showToast?.(error.message || "Unable to load the student options.", "danger");
            return;
        }
    }
    const form = document.getElementById("onboardingForm");
    let step = 1;

    if (session?.role === "student" && session.isProfileComplete) {
        window.location.replace("dashboard.html");
        return;
    }

    if (session) {
        form.fullName.value = session.name || "";
        form.email.value = session.email || "";
        form.rollNumber.value = session.rollNumber || "";
    }
    document.getElementById("logoutLink")?.addEventListener("click", async (event) => {
        event.preventDefault();
        const link = event.currentTarget;
        DemoStore.clearSession();
        API.clearAccessToken();
        try {
            await API.logoutUser();
        } catch (error) {
            console.warn("Server logout failed; local session was cleared.", error);
        } finally {
            window.location.replace(link.href);
        }
    });

    const departmentSelect = form.department;
    db.departments.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        departmentSelect.append(option);
    });

    function fillDependent() {
        const departmentId = form.department.value;
        const programs = db.programs.filter((item) => item.departmentId === departmentId);
        fillSelect(form.program, programs.map((item) => [item.id, item.name]));
        const batches = db.batches.filter((item) => item.departmentId === departmentId);
        fillSelect(form.year, [...new Set(batches.map((item) => item.year))].map((value) => [value, `Year ${value}`]));
        const year = form.year.value;
        const yearBatches = batches.filter((item) => item.year === year);
        fillSelect(form.division, [...new Set(yearBatches.map((item) => item.division))].map((value) => [value, value]));
        const division = form.division.value;
        const divBatches = yearBatches.filter((item) => item.division === division);
        fillSelect(form.practicalBatch, divBatches.map((item) => [item.id, item.practicalBatch]));
        fillSelect(form.academicYear, [...new Set(batches.map((item) => item.academicYear))].map((value) => [value, value]));
        fillSelect(form.semester, [...new Set(divBatches.map((item) => item.semester))].map((value) => [value, `Semester ${value}`]));
    }

    function fillSelect(select, pairs) {
        const previous = select.value;
        select.replaceChildren();
        pairs.forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            select.append(option);
        });
        if ([...select.options].some((option) => option.value === previous)) {
            select.value = previous;
        }
    }

    ["department", "year", "division"].forEach((name) => {
        form[name].addEventListener("change", fillDependent);
    });
    fillDependent();

    function showStep(next) {
        step = next;
        document.querySelectorAll(".step-panel").forEach((panel) => {
            panel.hidden = Number(panel.dataset.step) !== step;
        });
        document.querySelectorAll(".wizard-step").forEach((el, index) => {
            el.classList.toggle("active", index + 1 === step);
            el.classList.toggle("done", index + 1 < step);
        });
        document.getElementById("progressFill").style.width = `${(step / 3) * 100}%`;
        document.getElementById("stepText").textContent = `Step ${step} of 3`;
        document.getElementById("prevBtn").hidden = step === 1;
        document.getElementById("nextBtn").hidden = step === 3;
        document.getElementById("submitBtn").hidden = step !== 3;
        if (step === 3) {
            const batch = db.batches.find((item) => item.id === form.practicalBatch.value);
            const dept = db.departments.find((item) => item.id === form.department.value);
            document.getElementById("reviewBox").textContent =
                `${form.fullName.value} · ${form.rollNumber.value} · ${dept?.name || ""} · Year ${form.year.value} · Div ${form.division.value} · ${batch?.practicalBatch || ""} · ${form.academicYear.value}`;
        }
    }

    document.getElementById("nextBtn").addEventListener("click", () => {
        if (step === 1 && !form.reportValidity()) return;
        if (step === 2 && !form.department.value) return;
        showStep(step + 1);
    });
    document.getElementById("prevBtn").addEventListener("click", () => showStep(step - 1));

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.batchId = payload.practicalBatch;
        payload.isProfileComplete = true;
        try {
            const result = await API.completeOnboarding(payload);
            if (result.user) DemoStore.setSession(result.user);
        } catch (error) {
            if (error.status) {
                Shared?.showToast?.(error.message || "Unable to save your profile.", "danger");
                return;
            }
            const data = DemoStore.load();
            const user = data.users.find((item) => item.email === payload.email) || session;
            if (user) {
                user.isProfileComplete = true;
                user.batchId = payload.batchId;
                user.rollNumber = payload.rollNumber;
                user.name = payload.fullName;
                DemoStore.setSession(user);
            }
            DemoStore.save(data);
        }
        window.location.href = "dashboard.html";
    });

    showStep(1);
});
