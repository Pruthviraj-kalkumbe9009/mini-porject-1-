/* ==========================================
   Smart Classroom & Timetable Scheduler
   UI Helper Functions
   Author: Member 1
========================================== */

// ===============================
// Smooth Scrolling
// ===============================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function (e) {

        e.preventDefault();

        const target = document.querySelector(this.getAttribute("href"));

        if (target) {

            target.scrollIntoView({

                behavior: "smooth"

            });

        }

    });

});


// ===============================
// Header Scroll Effect
// ===============================

const header = document.querySelector("header");

if (header) {
    window.addEventListener("scroll", () => {

        if (window.scrollY > 50) {

            header.classList.add("scrolled");

        } else {

            header.classList.remove("scrolled");

        }

    });
}


// ===============================
// Mobile Navigation
// ===============================

const menuBtn = document.querySelector(".menu-toggle");

const navLinks = document.querySelector(".nav-links");

if (menuBtn) {

    menuBtn.addEventListener("click", () => {

        if (!navLinks) return;

        const isOpen = navLinks.classList.toggle("active");
        menuBtn.classList.toggle("active");
        menuBtn.setAttribute("aria-expanded", String(isOpen));

    });

}


// ===============================
// Close Mobile Menu
// ===============================

document.querySelectorAll(".nav-links a").forEach(link => {

    link.addEventListener("click", () => {

        if (navLinks) {

            navLinks.classList.remove("active");

        }

        if (menuBtn) {

            menuBtn.classList.remove("active");
            menuBtn.setAttribute("aria-expanded", "false");

        }

    });

});

document.querySelectorAll("[data-logout]").forEach(link => {

    link.addEventListener("click", async event => {

        event.preventDefault();
        window.DemoStore?.clearSession?.();
        window.API?.clearAccessToken?.();

        try {

            if (window.API?.logoutUser) {
                await window.API.logoutUser();
            } else {
                const response = await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include"
                });

                if (!response.ok) {
                    throw new Error(`Logout request failed (${response.status}).`);
                }
            }

        } catch (error) {

            console.warn("Server logout failed; local session was cleared.", error);

        } finally {

            window.location.replace(link.href);

        }

    });

});


// ===============================
// Scroll Animation
// ===============================

const revealElements = document.querySelectorAll(".card, .step, .hero-content, .hero-image");

const revealOnScroll = () => {

    revealElements.forEach(item => {

        const top = item.getBoundingClientRect().top;

        const visible = 150;

        if (top < window.innerHeight - visible) {

            item.classList.add("show");

        }

    });

};

window.addEventListener("scroll", revealOnScroll);

window.addEventListener("load", revealOnScroll);


// ===============================
// Counter Animation
// ===============================

const counters = document.querySelectorAll(".counter");

counters.forEach(counter => {

    counter.innerText = "0";

    const updateCounter = () => {

        const target = +counter.getAttribute("data-target");

        const current = +counter.innerText;

        const increment = target / 80;

        if (current < target) {

            counter.innerText = `${Math.ceil(current + increment)}`;

            setTimeout(updateCounter, 20);

        } else {

            counter.innerText = target;

        }

    };

    updateCounter();

});


// ===============================
// Notification Toast
// ===============================

function showToast(message, type = "success") {

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;

    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("visible");

    }, 100);

    setTimeout(() => {

        toast.classList.remove("visible");

        setTimeout(() => {

            toast.remove();

        }, 400);

    }, 3000);

}


// ===============================
// Loading Spinner
// ===============================

function showLoader() {

    const loader = document.createElement("div");

    loader.id = "loader";

    loader.innerHTML = `

        <div class="spinner"></div>

    `;

    document.body.appendChild(loader);

}

function hideLoader() {

    const loader = document.getElementById("loader");

    if (loader) {

        loader.remove();

    }

}


// ===============================
// Back To Top Button
// ===============================

const topBtn = document.getElementById("backToTop");

if (topBtn) {

    window.addEventListener("scroll", () => {

        if (window.scrollY > 400) {

            topBtn.style.display = "flex";

        } else {

            topBtn.style.display = "none";

        }

    });

    topBtn.addEventListener("click", () => {

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    });

}


// ===============================
// Current Year
// ===============================

const year = document.getElementById("currentYear");

if (year) {

    year.textContent = new Date().getFullYear();

}


// ===============================
// Export Functions
// ===============================

window.showToast = showToast;

window.showLoader = showLoader;

window.hideLoader = hideLoader;