const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const dashboard = {
    user: {
        fullName: "Pruthvi K",
        email: "student@example.com",
        role: "student",
        rollNo: "22CS001"
    },
    profile: {
        department: "Computer Science",
        semester: "5",
        section: "A",
        academic_year: "2026-27",
        phone: "9876543210",
        language: "English"
    },
    timetable: [
        {
            day_of_week: 1,
            starts_at: "09:00",
            ends_at: "10:00",
            subject_name: "Database Management",
            subject_code: "CSE-301",
            department: "Computer Science",
            semester: "5",
            section: "A",
            academic_year: "2026-27",
            faculty_name: "Dr. Asha Nair",
            room_code: "C-204",
            is_published: true
        },
        {
            day_of_week: 2,
            starts_at: "11:00",
            ends_at: "12:30",
            subject_name: "Operating Systems",
            subject_code: "CSE-302",
            department: "Computer Science",
            semester: "5",
            section: "A",
            academic_year: "2026-27",
            faculty_name: "Prof. Rohan Iyer",
            room_code: "LAB-2",
            is_published: true
        },
        {
            day_of_week: 4,
            starts_at: "14:00",
            ends_at: "15:30",
            subject_name: "Machine Learning",
            subject_code: "CSE-410",
            department: "Computer Science",
            semester: "5",
            section: "A",
            academic_year: "2026-27",
            faculty_name: "Dr. Meera Das",
            room_code: "A-112",
            is_published: true
        }
    ],
    notifications: [
        {
            title: "Timetable published",
            message: "Your weekly schedule for Semester 5 has been published.",
            created_at: "Today, 09:15 AM",
            is_read: false
        },
        {
            title: "Faculty update",
            message: "Lab session moved to Room LAB-2 on Thursday.",
            created_at: "Yesterday, 04:40 PM",
            is_read: true
        }
    ],
    leaveRequests: [
        {
            id: 1,
            faculty_name: "Dr. Asha Nair",
            starts_on: "2026-10-08",
            ends_on: "2026-10-09",
            reason: "Conference travel",
            status: "approved"
        }
    ]
};

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showMessage(message, isError = false) {
    const banner = $("#pageMessage");
    if (!banner) return;
    banner.textContent = message;
    banner.classList.toggle("error", isError);
    banner.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    const toggle = $("#themeToggle");
    if (toggle) {
        toggle.textContent = isDark ? "☀" : "☾";
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

function renderProfile() {
    const profileTarget = $("#profileDetails");
    if (!profileTarget) return;

    const values = [
        ["Name", dashboard.user.fullName],
        ["Email", dashboard.user.email],
        ["Role", dashboard.user.role],
        ["Roll number", dashboard.user.rollNo || "—"],
        ["Department", dashboard.profile.department],
        ["Semester", dashboard.profile.semester],
        ["Section", dashboard.profile.section],
        ["Academic year", dashboard.profile.academic_year],
        ["Phone", dashboard.profile.phone],
        ["Language", dashboard.profile.language]
    ];

    profileTarget.innerHTML = values.map(([label, value]) => `
        <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
        </div>
    `).join("");
}

function renderTodayRows() {
    const todayRows = $("#todayRows");
    if (!todayRows) return;

    const today = new Date().getDay();
    const todayNumber = today === 0 ? 7 : today;
    const items = dashboard.timetable.filter((item) => item.day_of_week === todayNumber);

    if (!items.length) {
        todayRows.innerHTML = '<tr><td colspan="4" class="empty-state">No classes scheduled today.</td></tr>';
        return;
    }

    todayRows.innerHTML = items.map((item) => `
        <tr>
            <td>${escapeHtml(item.starts_at)}–${escapeHtml(item.ends_at)}</td>
            <td>${escapeHtml(item.subject_name)}</td>
            <td>${escapeHtml(item.faculty_name)}</td>
            <td>${escapeHtml(item.room_code)}</td>
        </tr>
    `).join("");
}

function renderTimetable() {
    const timetableRows = $("#timetableRows");
    if (!timetableRows) return;

    timetableRows.innerHTML = dashboard.timetable.map((item) => `
        <tr>
            <td>${escapeHtml(days[item.day_of_week])}</td>
            <td>${escapeHtml(item.starts_at)}–${escapeHtml(item.ends_at)}</td>
            <td>
                <strong>${escapeHtml(item.subject_name)}</strong><br>
                <small>${escapeHtml(item.subject_code)}</small>
            </td>
            <td>${escapeHtml(item.department)} · ${escapeHtml(item.semester)} · ${escapeHtml(item.section)}<br>
                <small>${escapeHtml(item.academic_year)}</small>
            </td>
            <td>${escapeHtml(item.faculty_name)}</td>
            <td>${escapeHtml(item.room_code)}</td>
            <td><span class="status ${item.is_published ? "published" : "draft"}">${item.is_published ? "Published" : "Draft"}</span></td>
        </tr>
    `).join("");
}

function renderLeaves() {
    const leaveList = $("#leaveList");
    if (!leaveList) return;

    if (!dashboard.leaveRequests.length) {
        leaveList.innerHTML = '<div class="empty-state">There are no leave requests to show.</div>';
        return;
    }

    leaveList.innerHTML = dashboard.leaveRequests.map((leave) => `
        <article class="list-item">
            <div>
                <h3>${escapeHtml(leave.faculty_name)}</h3>
                <p>${escapeHtml(leave.starts_on)} to ${escapeHtml(leave.ends_on)}</p>
                ${leave.reason ? `<small>${escapeHtml(leave.reason)}</small>` : ""}
            </div>
            <div class="review-actions">
                <span class="status ${escapeHtml(leave.status)}">${escapeHtml(leave.status)}</span>
            </div>
        </article>
    `).join("");
}

function renderNotifications() {
    const list = $("#notificationList");
    const unreadCount = dashboard.notifications.filter((item) => !item.is_read).length;

    const unreadElement = $("#unreadCount");
    const navUnread = $("#navUnread");
    if (unreadElement) unreadElement.textContent = String(unreadCount);
    if (navUnread) navUnread.textContent = String(unreadCount);

    if (!list) return;

    list.innerHTML = dashboard.notifications.map((item) => `
        <article class="list-item ${item.is_read ? "" : "unread"}">
            <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.message)}</p>
                <small>${escapeHtml(item.created_at)}</small>
            </div>
            <span class="status">${item.is_read ? "Read" : "New"}</span>
        </article>
    `).join("");
}

function updateOverview() {
    const userName = $("#userName");
    const roleLabel = $("#roleLabel");
    const welcomeDescription = $("#welcomeDescription");
    const classCount = $("#classCount");
    const unreadCount = $("#unreadCount");
    const identityValue = $("#identityValue");
    const todayLabel = $("#todayLabel");

    if (userName) userName.textContent = dashboard.user.fullName.split(" ")[0];
    if (roleLabel) roleLabel.textContent = dashboard.user.role.toUpperCase();
    if (welcomeDescription) {
        welcomeDescription.textContent = `Your schedule, all in one place for ${dashboard.profile.department}.`;
    }
    if (classCount) classCount.textContent = String(dashboard.timetable.length);
    if (unreadCount) unreadCount.textContent = String(dashboard.notifications.filter((item) => !item.is_read).length);
    if (identityValue) identityValue.textContent = `${dashboard.profile.department} • Sem ${dashboard.profile.semester}`;
    if (todayLabel) {
        const date = new Date();
        todayLabel.textContent = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
}

function initializeSidebar() {
    const toggle = $("#sidebarToggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
        document.body.classList.toggle("sidebar-collapsed");
    });
}

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        setTheme(true);
    } else {
        setTheme(false);
    }

    const toggle = $("#themeToggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
        setTheme(!document.body.classList.contains("dark"));
    });
}

function bindActions() {
    const markReadButton = $("#markReadButton");
    if (markReadButton) {
        markReadButton.addEventListener("click", () => {
            dashboard.notifications.forEach((item) => {
                item.is_read = true;
            });
            renderNotifications();
            updateOverview();
            showMessage("Notifications marked as read.");
        });
    }

    const searchInput = $("#scheduleSearch");
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const term = searchInput.value.trim().toLowerCase();
            const rows = dashboard.timetable.filter((item) => {
                const text = [
                    item.subject_name,
                    item.subject_code,
                    item.department,
                    item.section,
                    item.faculty_name,
                    item.room_code,
                    days[item.day_of_week]
                ].join(" ").toLowerCase();
                return !term || text.includes(term);
            });

            const table = $("#timetableRows");
            if (!table) return;

            table.innerHTML = rows.map((item) => `
                <tr>
                    <td>${escapeHtml(days[item.day_of_week])}</td>
                    <td>${escapeHtml(item.starts_at)}–${escapeHtml(item.ends_at)}</td>
                    <td><strong>${escapeHtml(item.subject_name)}</strong><br><small>${escapeHtml(item.subject_code)}</small></td>
                    <td>${escapeHtml(item.department)} · ${escapeHtml(item.semester)} · ${escapeHtml(item.section)}<br><small>${escapeHtml(item.academic_year)}</small></td>
                    <td>${escapeHtml(item.faculty_name)}</td>
                    <td>${escapeHtml(item.room_code)}</td>
                    <td><span class="status ${item.is_published ? "published" : "draft"}">${item.is_published ? "Published" : "Draft"}</span></td>
                </tr>
            `).join("");
        });
    }
}

function renderDashboard() {
    renderProfile();
    renderTodayRows();
    renderTimetable();
    renderLeaves();
    renderNotifications();
    updateOverview();
}

document.addEventListener("DOMContentLoaded", () => {
    initializeTheme();
    initializeSidebar();
    renderDashboard();
    bindActions();
});
