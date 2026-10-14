/* ==========================================
   Student Onboarding
   Smart Classroom Scheduler
========================================== */

const onboardingForm = document.getElementById("onboardingForm");

if (onboardingForm) {
    const photoInput = document.getElementById("photo");

    if (photoInput) {
        photoInput.addEventListener("change", function () {
            const file = this.files[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                alert("Please upload an image file.");
                this.value = "";
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                alert("Image size should be less than 2MB.");
                this.value = "";
            }
        });
    }

    const phoneInput = document.getElementById("phone");
    if (phoneInput) {
        phoneInput.addEventListener("input", () => {
            const phone = phoneInput.value;
            const regex = /^[0-9]{10}$/;
            phoneInput.style.border = regex.test(phone) ? "2px solid green" : "2px solid red";
        });
    }

    const emailInput = document.getElementById("email");
    if (emailInput) {
        emailInput.addEventListener("input", () => {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            emailInput.style.border = regex.test(emailInput.value) ? "2px solid green" : "2px solid red";
        });
    }

    const rollInput = document.getElementById("rollNumber");
    if (rollInput) {
        rollInput.addEventListener("input", () => {
            rollInput.style.border = rollInput.value.length >= 5 ? "2px solid green" : "2px solid red";
        });
    }

    onboardingForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const studentData = {
            fullName: document.getElementById("fullName").value.trim(),
            rollNumber: document.getElementById("rollNumber").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            gender: document.getElementById("gender").value,
            dob: document.getElementById("dob").value,
            department: document.getElementById("department").value,
            semester: document.getElementById("semester").value,
            section: document.getElementById("section").value,
            academicYear: document.getElementById("academicYear").value,
            language: document.getElementById("language").value
        };

        for (const key in studentData) {
            if (studentData[key] === "") {
                alert("Please fill all required fields.");
                return;
            }
        }

        const submitBtn = document.querySelector(".button-area button");
        if (!submitBtn) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = "Saving...";

        try {
            const response = await fetch("/api/student/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(studentData)
            });

            const result = await response.json();
            if (!response.ok) {
                alert(result.message || "Unable to save profile.");
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Save & Continue";
                return;
            }

            alert("Profile Completed Successfully!");
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error(error);
            alert("Server Error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Save & Continue";
        }
    });

    window.addEventListener("load", () => {
        const progress = document.querySelector(".progress-fill");
        if (progress) {
            progress.style.width = "33%";
        }

        const fullName = document.getElementById("fullName");
        if (fullName) {
            fullName.focus();
        }
    });
}
