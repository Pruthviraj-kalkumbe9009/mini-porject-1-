const signupForm = document.getElementById("signupForm");

if (signupForm) {
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const submitButton = signupForm.querySelector(".signup-btn");
    const message = document.getElementById("signupMessage");

    const showMessage = (text) => {
        message.textContent = text;
        message.hidden = false;
    };

    function addPasswordToggle(input) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "password-toggle";
        toggle.textContent = "Show";
        toggle.setAttribute("aria-label", `Show ${input.id === "password" ? "password" : "confirm password"}`);
        input.insertAdjacentElement("afterend", toggle);
        toggle.addEventListener("click", () => {
            const reveal = input.type === "password";
            input.type = reveal ? "text" : "password";
            toggle.textContent = reveal ? "Hide" : "Show";
            toggle.setAttribute("aria-label", `${reveal ? "Hide" : "Show"} ${input.id === "password" ? "password" : "confirm password"}`);
            input.focus();
        });
    }

    addPasswordToggle(passwordInput);
    addPasswordToggle(confirmPasswordInput);

    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.hidden = true;
        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim();
        const rollNo = document.getElementById("rollNo").value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const role = document.getElementById("role").value;

        if (fullName.length < 3) {
            showMessage("Please enter your full name (at least 3 characters).");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage("Please enter a valid email address.");
            return;
        }
        if (password.length < 6) {
            showMessage("Password should contain at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            showMessage("Passwords do not match.");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Creating Account...";
        try {
            try {
                await API.signup({ name: fullName, email, rollNumber: rollNo, password, role });
                showMessage(role === "faculty"
                    ? "Faculty account created. Wait for admin approval, then sign in."
                    : "Account created. Sign in — students complete academics on first login.");
                message.classList.add("success");
                await new Promise((resolve) => window.setTimeout(resolve, 700));
                window.location.href = "login.html";
                return;
            } catch (error) {
                if (error.status) throw error;
            }
            DemoStore.signup({ name: fullName, email, rollNumber: rollNo, password, role });
            showMessage(role === "faculty"
                ? "Faculty account created. Wait for admin approval, then sign in."
                : "Account created. Sign in — students complete academics on first login.");
            message.classList.add("success");
            await new Promise((resolve) => window.setTimeout(resolve, 800));
            window.location.href = "login.html";
        } catch (error) {
            console.error(error);
            showMessage(error.message || "Unable to connect to the server. Please try again.");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Create Account";
        }
    });

    passwordInput.addEventListener("input", () => {
        passwordInput.style.borderColor = passwordInput.value.length >= 6 ? "green" : "red";
    });
    confirmPasswordInput.addEventListener("input", () => {
        confirmPasswordInput.style.borderColor =
            passwordInput.value === confirmPasswordInput.value ? "green" : "red";
    });
}
