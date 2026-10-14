const loginForm = document.getElementById("loginForm");

function destinationFor(user) {
    if (user.role === "admin") return "admin/dashboard.html";
    if (user.role === "faculty") return "faculty/dashboard.html";
    if (user.isProfileComplete) return "student/dashboard.html";
    return "student/onboarding.html";
}

if (loginForm) {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const roleInput = document.getElementById("role");
    const rememberCheck = document.getElementById("rememberMe");
    const loginButton = loginForm.querySelector(".login-btn");
    const message = document.getElementById("loginMessage");

    const showMessage = (text) => {
        message.textContent = text;
        message.hidden = false;
    };

    const saved = localStorage.getItem("rememberEmail");
    if (saved && emailInput) emailInput.value = saved;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.hidden = true;
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const role = roleInput.value;
        if (!email || !password) {
            showMessage("Enter your email or roll number and password.");
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";
        try {
            let user = null;
            try {
                const result = await API.login({ email, password, role });
                if (result.accessToken) API.setAccessToken(result.accessToken);
                user = result.user || result;
                DemoStore.setSession(user);
            } catch (error) {
                if (error.status) throw error;
                user = DemoStore.login(email, password, role);
            }
            if (rememberCheck.checked) localStorage.setItem("rememberEmail", email);
            else localStorage.removeItem("rememberEmail");
            window.location.replace(destinationFor(user));
        } catch (error) {
            showMessage(error.message || "Unable to sign in.");
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "Login";
        }
    });
}
