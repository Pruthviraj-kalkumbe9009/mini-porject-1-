/*=========================================================
    Smart Classroom & Timetable Scheduler
    shared.js
    Part 1

    ✓ DOM Ready
    ✓ Sidebar Toggle
    ✓ Mobile Sidebar
    ✓ Dark Mode
    ✓ Theme Persistence
==========================================================*/

"use strict";

/*=========================================================
    DOM Ready
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    initializeShared();

});

/*=========================================================
    Initialize Shared Components
=========================================================*/

function initializeShared(){

    initSidebar();

    initMobileSidebar();

}

/*=========================================================
    Sidebar Toggle
=========================================================*/

function initSidebar(){

    const sidebar = document.querySelector(".sidebar");

    const toggleBtn = document.querySelector("#sidebarToggle");

    if(!sidebar || !toggleBtn) return;

    toggleBtn.addEventListener("click",()=>{

        sidebar.classList.toggle("collapsed");

        document.body.classList.toggle("sidebar-collapsed");

        localStorage.setItem(

            "sidebar",

            sidebar.classList.contains("collapsed")
                ? "collapsed"
                : "expanded"

        );

    });

    const state = localStorage.getItem("sidebar");

    if(state==="collapsed"){

        sidebar.classList.add("collapsed");

        document.body.classList.add("sidebar-collapsed");

    }

}

/*=========================================================
    Mobile Sidebar
=========================================================*/

function initMobileSidebar(){

    const sidebar = document.querySelector(".sidebar");

    const mobileBtn = document.querySelector("#mobileMenu");

    const overlay = document.querySelector(".sidebar-overlay");

    if(!sidebar || !mobileBtn) return;

    mobileBtn.addEventListener("click",()=>{

        sidebar.classList.toggle("mobile-open");

        if(overlay){

            overlay.classList.toggle("active");

        }

    });

    if(overlay){

        overlay.addEventListener("click",()=>{

            sidebar.classList.remove("mobile-open");

            overlay.classList.remove("active");

        });

    }

    document.addEventListener("keydown",(e)=>{

        if(e.key==="Escape"){

            sidebar.classList.remove("mobile-open");

            if(overlay){

                overlay.classList.remove("active");

            }

        }

    });

}

/*=========================================================
    Utility Helpers
=========================================================*/

function hasDarkMode(){

    return document.body.classList.contains("dark");

}

function toggleDarkMode(){
    if (window.Theme) {
        window.Theme.toggle();
        return;
    }
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
}

/*=========================================================
    Global Access
=========================================================*/

window.Shared={

    toggleDarkMode,

    hasDarkMode

};

/*=========================================================
    End of Part 1
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    shared.js
    Part 2

    ✓ Dropdown Menu
    ✓ User Profile Menu
    ✓ Modal Open / Close
    ✓ Confirmation Modal
    ✓ Toast Notification System
    ✓ Loading Spinner Utilities
=========================================================*/


/*=========================================================
    Dropdown Menu
=========================================================*/

function initDropdowns() {

    const dropdowns = document.querySelectorAll(".dropdown");

    dropdowns.forEach(dropdown => {

        const toggle = dropdown.querySelector(".dropdown-toggle");

        if (!toggle) return;

        toggle.addEventListener("click", (e) => {

            e.stopPropagation();

            document.querySelectorAll(".dropdown.active").forEach(item => {

                if (item !== dropdown) {

                    item.classList.remove("active");

                }

            });

            dropdown.classList.toggle("active");

        });

    });

    document.addEventListener("click", () => {

        document.querySelectorAll(".dropdown.active").forEach(item => {

            item.classList.remove("active");

        });

    });

}


/*=========================================================
    User Profile Menu
=========================================================*/

function initUserMenu() {

    const profile = document.querySelector(".user-menu");

    if (!profile) return;

    profile.addEventListener("click", () => {

        profile.parentElement.classList.toggle("active");

    });

}


/*=========================================================
    Modal Helpers
=========================================================*/

function openModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.add("active");

    document.body.classList.add("overflow-hidden");

}

function closeModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.remove("active");

    document.body.classList.remove("overflow-hidden");

}

function initModals() {

    document.querySelectorAll("[data-open-modal]").forEach(button => {

        button.addEventListener("click", () => {

            openModal(button.dataset.openModal);

        });

    });

    document.querySelectorAll("[data-close-modal]").forEach(button => {

        button.addEventListener("click", () => {

            const modal = button.closest(".modal-overlay");

            if (modal) {

                modal.classList.remove("active");

            }

            document.body.classList.remove("overflow-hidden");

        });

    });

    document.querySelectorAll(".modal-overlay").forEach(modal => {

        modal.addEventListener("click", (e) => {

            if (e.target === modal) {

                modal.classList.remove("active");

                document.body.classList.remove("overflow-hidden");

            }

        });

    });

}


/*=========================================================
    Confirmation Modal
=========================================================*/

function showConfirm(options = {}) {

    return new Promise(resolve => {

        const confirmed = window.confirm(

            options.message || "Are you sure?"

        );

        resolve(confirmed);

    });

}


/*=========================================================
    Toast Notification System
=========================================================*/

function showToast(

    message,

    type = "info",

    duration = 3000

) {

    let container = document.querySelector(".toast-container");

    if (!container) {

        container = document.createElement("div");

        container.className = "toast-container";

        document.body.appendChild(container);

    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;

    toast.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = message;
    toast.append(span);

    container.appendChild(toast);

    setTimeout(() => {

        toast.style.opacity = "0";

        toast.style.transform = "translateX(100px)";

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, duration);

}


/*=========================================================
    Loading Spinner
=========================================================*/

function showLoader() {

    let loader = document.querySelector(".loading-overlay");

    if (!loader) {

        loader = document.createElement("div");

        loader.className = "loading-overlay";

        loader.innerHTML = `

            <div class="loader"></div>

        `;

        document.body.appendChild(loader);

    }

    loader.classList.remove("hidden");

}

function hideLoader() {

    const loader = document.querySelector(".loading-overlay");

    if (loader) {

        loader.classList.add("hidden");

    }

}


/*=========================================================
    Auto Initialize
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    initDropdowns();

    initUserMenu();

    initModals();

});


/*=========================================================
    Export Helpers
=========================================================*/

Object.assign(window.Shared, {

    openModal,

    closeModal,

    showConfirm,

    showToast,

    showLoader,

    hideLoader

});


/*=========================================================
    End of Part 2
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    shared.js
    Part 3

    ✓ Search Filter
    ✓ Table Search
    ✓ Form Validation
    ✓ Debounce
    ✓ Throttle
    ✓ Date Formatter
    ✓ Time Formatter
    ✓ Number Formatter
=========================================================*/


/*=========================================================
    Search Filter
=========================================================*/

function filterElements(searchInput, itemsSelector) {

    const input = document.querySelector(searchInput);

    if (!input) return;

    input.addEventListener("keyup", () => {

        const keyword = input.value.toLowerCase();

        document.querySelectorAll(itemsSelector).forEach(item => {

            const text = item.textContent.toLowerCase();

            item.style.display = text.includes(keyword)
                ? ""
                : "none";

        });

    });

}


/*=========================================================
    Table Search
=========================================================*/

function tableSearch(inputSelector, tableSelector) {

    const input = document.querySelector(inputSelector);

    const table = document.querySelector(tableSelector);

    if (!input || !table) return;

    input.addEventListener("keyup", () => {

        const keyword = input.value.toLowerCase();

        const rows = table.querySelectorAll("tbody tr");

        rows.forEach(row => {

            const text = row.textContent.toLowerCase();

            row.style.display = text.includes(keyword)
                ? ""
                : "none";

        });

    });

}


/*=========================================================
    Form Validation
=========================================================*/

function validateForm(formSelector) {

    const form = document.querySelector(formSelector);

    if (!form) return true;

    let valid = true;

    form.querySelectorAll("[required]").forEach(field => {

        field.classList.remove("input-error");

        if (field.value.trim() === "") {

            field.classList.add("input-error");

            valid = false;

        }

    });

    return valid;

}

function validateEmail(email) {

    const regex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);

}

function validatePassword(password) {

    return password.length >= 8;

}


/*=========================================================
    Debounce
=========================================================*/

function debounce(callback, delay = 300) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(() => {

            callback.apply(this, args);

        }, delay);

    };

}


/*=========================================================
    Throttle
=========================================================*/

function throttle(callback, delay = 300) {

    let waiting = false;

    return (...args) => {

        if (waiting) return;

        callback.apply(this, args);

        waiting = true;

        setTimeout(() => {

            waiting = false;

        }, delay);

    };

}


/*=========================================================
    Date Formatter
=========================================================*/

function formatDate(date) {

    return new Date(date).toLocaleDateString("en-IN", {

        day: "2-digit",

        month: "short",

        year: "numeric"

    });

}


/*=========================================================
    Time Formatter
=========================================================*/

function formatTime(time) {

    return new Date(time).toLocaleTimeString("en-IN", {

        hour: "2-digit",

        minute: "2-digit"

    });

}


/*=========================================================
    Date & Time Formatter
=========================================================*/

function formatDateTime(date) {

    return new Date(date).toLocaleString("en-IN", {

        day: "2-digit",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit"

    });

}


/*=========================================================
    Number Formatter
=========================================================*/

function formatNumber(number) {

    return new Intl.NumberFormat("en-IN").format(number);

}


/*=========================================================
    Currency Formatter
=========================================================*/

function formatCurrency(amount) {

    return new Intl.NumberFormat("en-IN", {

        style: "currency",

        currency: "INR"

    }).format(amount);

}


/*=========================================================
    Percentage Formatter
=========================================================*/

function formatPercent(value) {

    return `${Number(value).toFixed(1)}%`;

}


/*=========================================================
    Export Helpers
=========================================================*/

Object.assign(window.Shared, {

    filterElements,

    tableSearch,

    validateForm,

    validateEmail,

    validatePassword,

    debounce,

    throttle,

    formatDate,

    formatTime,

    formatDateTime,

    formatNumber,

    formatCurrency,

    formatPercent

});


/*=========================================================
    End of Part 3
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    shared.js
    Part 4

    ✓ Copy to Clipboard
    ✓ Print Helper
    ✓ Export Table to CSV
    ✓ Export JSON
    ✓ Local Storage Helper
    ✓ Session Storage Helper
    ✓ Download File Helper
    ✓ File Upload Preview
=========================================================*/


/*=========================================================
    Copy to Clipboard
=========================================================*/

async function copyToClipboard(text) {

    try {

        await navigator.clipboard.writeText(text);

        if (window.Shared?.showToast) {

            Shared.showToast("Copied to clipboard", "success");

        }

    }

    catch (error) {

        console.error(error);

    }

}


/*=========================================================
    Print Helper
=========================================================*/

function printPage() {

    window.print();

}

function printElement(selector) {

    const element = document.querySelector(selector);

    if (!element) return;

    const popup = window.open("", "_blank");

    popup.document.write(`

        <html>

        <head>

        <title>Print</title>

        <link rel="stylesheet" href="../css/shared.css">

        </head>

        <body>

        ${element.outerHTML}

        </body>

        </html>

    `);

    popup.document.close();

    popup.focus();

    popup.print();

    popup.close();

}


/*=========================================================
    Export Table To CSV
=========================================================*/

function exportTableToCSV(tableSelector, filename = "table.csv") {

    const table = document.querySelector(tableSelector);

    if (!table) return;

    let csv = [];

    table.querySelectorAll("tr").forEach(row => {

        let data = [];

        row.querySelectorAll("th,td").forEach(cell => {

            data.push(`"${cell.innerText.replace(/"/g,'""')}"`);

        });

        csv.push(data.join(","));

    });

    downloadFile(csv.join("\n"), filename, "text/csv");

}


/*=========================================================
    Export JSON
=========================================================*/

function exportJSON(data, filename = "data.json") {

    downloadFile(

        JSON.stringify(data, null, 4),

        filename,

        "application/json"

    );

}


/*=========================================================
    Download File Helper
=========================================================*/

function downloadFile(content, filename, mimeType) {

    const blob = new Blob(

        [content],

        { type: mimeType }

    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}


/*=========================================================
    Local Storage Helper
=========================================================*/

const StorageHelper = {

    set(key, value) {

        localStorage.setItem(

            key,

            JSON.stringify(value)

        );

    },

    get(key) {

        const value = localStorage.getItem(key);

        return value

            ? JSON.parse(value)

            : null;

    },

    remove(key) {

        localStorage.removeItem(key);

    },

    clear() {

        localStorage.clear();

    }

};


/*=========================================================
    Session Storage Helper
=========================================================*/

const SessionHelper = {

    set(key, value) {

        sessionStorage.setItem(

            key,

            JSON.stringify(value)

        );

    },

    get(key) {

        const value = sessionStorage.getItem(key);

        return value

            ? JSON.parse(value)

            : null;

    },

    remove(key) {

        sessionStorage.removeItem(key);

    },

    clear() {

        sessionStorage.clear();

    }

};


/*=========================================================
    File Upload Preview
=========================================================*/

function previewImage(inputSelector, imageSelector) {

    const input = document.querySelector(inputSelector);

    const image = document.querySelector(imageSelector);

    if (!input || !image) return;

    input.addEventListener("change", e => {

        const file = e.target.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = event => {

            image.src = event.target.result;

        };

        reader.readAsDataURL(file);

    });

}


/*=========================================================
    Export Helpers
=========================================================*/

Object.assign(window.Shared, {

    copyToClipboard,

    printPage,

    printElement,

    exportTableToCSV,

    exportJSON,

    downloadFile,

    previewImage,

    StorageHelper,

    SessionHelper

});


/*=========================================================
    End of Part 4
=========================================================*/

/*=========================================================
    Smart Classroom & Timetable Scheduler
    shared.js
    Part 5 (Final)

    ✓ Event Helper Functions
    ✓ Confirm Dialog Utility
    ✓ Keyboard Shortcuts
    ✓ Smooth Scroll Helper
    ✓ Scroll-to-Top Button
    ✓ Network Status Detection
    ✓ Online / Offline Notifications
    ✓ Global Error Handler
    ✓ Shared Initialization
    ✓ Final Global API
=========================================================*/


/*=========================================================
    Event Helpers
=========================================================*/

function on(selector, event, handler) {

    document.querySelectorAll(selector).forEach(element => {

        element.addEventListener(event, handler);

    });

}

function once(selector, event, handler) {

    document.querySelectorAll(selector).forEach(element => {

        element.addEventListener(event, handler, {

            once: true

        });

    });

}


/*=========================================================
    Confirm Dialog Utility
=========================================================*/

async function confirmDialog(message = "Are you sure?") {

    return window.confirm(message);

}


/*=========================================================
    Keyboard Shortcuts
=========================================================*/

document.addEventListener("keydown", (event) => {

    /* ESC → Close Modal */

    if (event.key === "Escape") {

        document.querySelectorAll(".modal-overlay.active")

            .forEach(modal => {

                modal.classList.remove("active");

            });

    }

    /* Ctrl + P */

    if (event.ctrlKey && event.key.toLowerCase() === "p") {

        event.preventDefault();

        printPage();

    }

    /* Ctrl + / */

    if (event.ctrlKey && event.key === "/") {

        event.preventDefault();

        console.log("Shortcut activated");

    }

});


/*=========================================================
    Smooth Scroll
=========================================================*/

function smoothScroll(selector) {

    const element = document.querySelector(selector);

    if (!element) return;

    element.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


/*=========================================================
    Scroll To Top
=========================================================*/

function createScrollTopButton() {

    const button = document.createElement("button");

    button.id = "scrollTopButton";

    button.innerHTML = "↑";

    button.className = "scroll-top";

    document.body.appendChild(button);

    window.addEventListener("scroll", () => {

        if (window.scrollY > 300) {

            button.classList.add("show");

        }

        else {

            button.classList.remove("show");

        }

    });

    button.addEventListener("click", () => {

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });

}


/*=========================================================
    Network Status
=========================================================*/

function updateNetworkStatus() {

    if (navigator.onLine) {

        if (window.Shared?.showToast) {

            Shared.showToast(

                "Internet Connected",

                "success",

                2500

            );

        }

    }

    else {

        if (window.Shared?.showToast) {

            Shared.showToast(

                "Internet Connection Lost",

                "danger",

                4000

            );

        }

    }

}

window.addEventListener("online", updateNetworkStatus);

window.addEventListener("offline", updateNetworkStatus);


/*=========================================================
    Global Error Handler
=========================================================*/

window.addEventListener("error", (event) => {

    console.error(event.error);

    if (window.Shared?.showToast) {

        Shared.showToast(

            "Unexpected Error",

            "danger",

            4000

        );

    }

});


window.addEventListener("unhandledrejection", (event) => {

    console.error(event.reason);

});


/*=========================================================
    Shared Initialization
=========================================================*/

function initializeSharedUtilities() {

    createScrollTopButton();

    updateNetworkStatus();

}

document.addEventListener(

    "DOMContentLoaded",

    initializeSharedUtilities

);


/*=========================================================
    Export Everything
=========================================================*/

Object.assign(window.Shared, {

    on,

    once,

    confirmDialog,

    smoothScroll,

    createScrollTopButton,

    updateNetworkStatus

});


/*=========================================================
    Version Information
=========================================================*/

window.Shared.version = "1.0.0";

console.log(

    "Shared Utilities Loaded",

    window.Shared.version

);


/*=========================================================
    End of shared.js
=========================================================*/