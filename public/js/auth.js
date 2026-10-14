/*=========================================================
    Smart Classroom & Timetable Scheduler
    auth.js
    Part 1

    ✓ Authentication State
    ✓ Login
    ✓ Signup
    ✓ Logout
    ✓ Current User
    ✓ Session Management
=========================================================*/

"use strict";

/*=========================================================
    AUTH STATE
=========================================================*/

const Auth = {

    user: null,

    isAuthenticated: false,

    role: null

};


/*=========================================================
    SET USER
=========================================================*/

function setCurrentUser(user){

    Auth.user = user;

    Auth.role = user.role;

    Auth.isAuthenticated = true;

}


/*=========================================================
    CLEAR USER
=========================================================*/

function clearCurrentUser(){

    Auth.user = null;

    Auth.role = null;

    Auth.isAuthenticated = false;

}


/*=========================================================
    LOGIN
=========================================================*/

async function login(email,password){

    try{

        Shared.showLoader();

        const response = await API.login({

            email,

            password

        });

        API.setAccessToken(response.accessToken);

        setCurrentUser(response.user);

        Shared.showToast(

            "Login Successful",

            "success"

        );

        redirectAfterLogin(response.user);

    }

    catch(error){

        Shared.showToast(

            error.message,

            "danger"

        );

    }

    finally{

        Shared.hideLoader();

    }

}


/*=========================================================
    SIGNUP
=========================================================*/

async function signup(userData){

    try{

        Shared.showLoader();

        const response = await API.signup(userData);

        Shared.showToast(

            response.message ||

            "Registration Successful",

            "success"

        );

        window.location.href="/login.html";

    }

    catch(error){

        Shared.showToast(

            error.message,

            "danger"

        );

    }

    finally{

        Shared.hideLoader();

    }

}


/*=========================================================
    LOGOUT
=========================================================*/

async function logout(){

    clearCurrentUser();

    window.DemoStore?.clearSession?.();

    API.clearAccessToken();

    try{

        await API.logoutUser();

    }

    catch(error){

        console.warn("Server logout failed; local session was cleared.", error);

    }

    finally{

        window.location.replace("/login.html");

    }

}


/*=========================================================
    GET CURRENT USER
=========================================================*/

function currentUser(){

    return Auth.user;

}

function isLoggedIn(){

    return Auth.isAuthenticated;

}


/*=========================================================
    REDIRECT AFTER LOGIN
=========================================================*/

function redirectAfterLogin(user){

    if(user.role==="admin"){

        window.location.href="/admin/dashboard.html";

        return;

    }

    if(user.role==="faculty"){

        window.location.href="/faculty/dashboard.html";

        return;

    }

    if(user.role==="student"){

        if(user.isProfileComplete){

            window.location.href="/student/dashboard.html";

        }

        else{

            window.location.href="/student/onboarding.html";

        }

    }

}


/*=========================================================
    EXPORT
=========================================================*/

window.Auth={

    login,

    signup,

    logout,

    currentUser,

    isLoggedIn,

    setCurrentUser,

    clearCurrentUser

};


/*=========================================================
    End Part 1
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    auth.js
    Part 2

    ✓ Login Form Handler
    ✓ Signup Form Handler
    ✓ Password Visibility Toggle
    ✓ Remember Me
    ✓ Forgot Password Placeholder
    ✓ Client-side Validation
    ✓ Live Form Validation
=========================================================*/


/*=========================================================
    LOGIN FORM
=========================================================*/

function initializeLoginForm() {

    const form = document.querySelector("#loginForm");

    if (!form) return;

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!validateLoginForm()) return;

        const email =
            form.email.value.trim();

        const password =
            form.password.value;

        await Auth.login(email, password);

    });

}


/*=========================================================
    SIGNUP FORM
=========================================================*/

function initializeSignupForm() {

    const form = document.querySelector("#signupForm");

    if (!form) return;

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!validateSignupForm()) return;

        const data = {

            name:
                form.name.value.trim(),

            email:
                form.email.value.trim(),

            rollNumber:
                form.rollNumber
                    ? form.rollNumber.value.trim()
                    : undefined,

            password:
                form.password.value,

            role:
                form.role.value

        };

        await Auth.signup(data);

    });

}


/*=========================================================
    PASSWORD TOGGLE
=========================================================*/

function initializePasswordToggle() {

    document.querySelectorAll(".toggle-password")

        .forEach(button => {

            button.addEventListener("click", () => {

                const input =

                    document.querySelector(

                        button.dataset.target

                    );

                if (!input) return;

                if (input.type === "password") {

                    input.type = "text";

                    button.innerHTML =
                        '<i class="fas fa-eye-slash"></i>';

                }

                else {

                    input.type = "password";

                    button.innerHTML =
                        '<i class="fas fa-eye"></i>';

                }

            });

        });

}


/*=========================================================
    REMEMBER ME
=========================================================*/

function initializeRememberMe() {

    const remember =
        document.querySelector("#rememberMe");

    const email =
        document.querySelector("#email");

    if (!remember || !email) return;

    const savedEmail =
        localStorage.getItem("rememberEmail");

    if (savedEmail) {

        email.value = savedEmail;

        remember.checked = true;

    }

    remember.addEventListener("change", () => {

        if (remember.checked) {

            localStorage.setItem(

                "rememberEmail",

                email.value

            );

        }

        else {

            localStorage.removeItem(

                "rememberEmail"

            );

        }

    });

    email.addEventListener("input", () => {

        if (remember.checked) {

            localStorage.setItem(

                "rememberEmail",

                email.value

            );

        }

    });

}


/*=========================================================
    FORGOT PASSWORD
=========================================================*/

function initializeForgotPassword() {

    const button =
        document.querySelector("#forgotPassword");

    if (!button) return;

    button.addEventListener("click", () => {

        Shared.showToast(

            "Forgot Password module will be connected with backend.",

            "info"

        );

    });

}


/*=========================================================
    LOGIN VALIDATION
=========================================================*/

function validateLoginForm() {

    const form =
        document.querySelector("#loginForm");

    if (!form) return false;

    if (!Shared.validateForm("#loginForm")) {

        Shared.showToast(

            "Please fill all required fields.",

            "warning"

        );

        return false;

    }

    const email =
        form.email.value.trim();

    if (!Shared.validateEmail(email)) {

        Shared.showToast(

            "Invalid email address.",

            "danger"

        );

        return false;

    }

    return true;

}


/*=========================================================
    SIGNUP VALIDATION
=========================================================*/

function validateSignupForm() {

    const form =
        document.querySelector("#signupForm");

    if (!form) return false;

    if (!Shared.validateForm("#signupForm")) {

        Shared.showToast(

            "Complete all required fields.",

            "warning"

        );

        return false;

    }

    if (

        !Shared.validateEmail(

            form.email.value.trim()

        )

    ) {

        Shared.showToast(

            "Invalid Email",

            "danger"

        );

        return false;

    }

    if (

        !Shared.validatePassword(

            form.password.value

        )

    ) {

        Shared.showToast(

            "Password must contain at least 8 characters.",

            "danger"

        );

        return false;

    }

    return true;

}


/*=========================================================
    LIVE VALIDATION
=========================================================*/

function initializeLiveValidation() {

    document.querySelectorAll(

        "input[required], select[required]"

    ).forEach(field => {

        field.addEventListener("input", () => {

            if (field.value.trim() !== "") {

                field.classList.remove("input-error");

            }

        });

    });

}


/*=========================================================
    INITIALIZE
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    () => {

        initializeLoginForm();

        initializeSignupForm();

        initializePasswordToggle();

        initializeRememberMe();

        initializeForgotPassword();

        initializeLiveValidation();

    }

);


/*=========================================================
    EXPORT
=========================================================*/

Object.assign(window.Auth, {

    validateLoginForm,

    validateSignupForm,

    initializeLoginForm,

    initializeSignupForm

});


/*=========================================================
    End Part 2
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    auth.js
    Part 3

    ✓ Session Restore on Page Reload
    ✓ Auto Login Check
    ✓ Get Current User from Backend
    ✓ Refresh Access Token Integration
    ✓ Profile Loader
    ✓ Role Detection
    ✓ Authentication Event Listeners
=========================================================*/


/*=========================================================
    SESSION RESTORE
=========================================================*/

async function restoreSession() {

    try {

        const refreshed = await API.refreshAccessToken();

        if (!refreshed) {

            clearCurrentUser();

            return false;

        }

        const user = await fetchCurrentUser();

        if (user) {

            setCurrentUser(user);

            return true;

        }

        return false;

    }

    catch (error) {

        console.error("Session Restore Failed", error);

        clearCurrentUser();

        return false;

    }

}


/*=========================================================
    CURRENT USER
=========================================================*/

async function fetchCurrentUser() {

    try {

        const response = await API.get("/auth/me");

        if (response.user) {

            setCurrentUser(response.user);

            return response.user;

        }

        return null;

    }

    catch (error) {

        console.error(error);

        return null;

    }

}


/*=========================================================
    AUTO LOGIN CHECK
=========================================================*/

async function checkAuthentication() {

    if (Auth.isAuthenticated) {

        return true;

    }

    return await restoreSession();

}


/*=========================================================
    PROFILE LOADER
=========================================================*/

async function loadUserProfile() {

    try {

        const user = await fetchCurrentUser();

        if (!user) return;

        const name = document.querySelector("#profileName");

        const email = document.querySelector("#profileEmail");

        const avatar = document.querySelector("#profileAvatar");

        if (name) {

            name.textContent = user.name;

        }

        if (email) {

            email.textContent = user.email;

        }

        if (avatar) {

            avatar.textContent =

                user.name.charAt(0).toUpperCase();

        }

    }

    catch (error) {

        console.error(error);

    }

}


/*=========================================================
    ROLE DETECTION
=========================================================*/

function getUserRole() {

    return Auth.role;

}

function isAdmin() {

    return getUserRole() === "admin";

}

function isFaculty() {

    return getUserRole() === "faculty";

}

function isStudent() {

    return getUserRole() === "student";

}


/*=========================================================
    AUTH EVENT SYSTEM
=========================================================*/

const authEvents = new EventTarget();

function dispatchAuthEvent(type, detail = {}) {

    authEvents.dispatchEvent(

        new CustomEvent(type, {

            detail

        })

    );

}

function onAuthEvent(type, callback) {

    authEvents.addEventListener(

        type,

        callback

    );

}


/*=========================================================
    SESSION EVENTS
=========================================================*/

window.addEventListener("focus", async () => {

    await checkAuthentication();

});

document.addEventListener("visibilitychange", async () => {

    if (!document.hidden) {

        await checkAuthentication();

    }

});


/*=========================================================
    INITIALIZATION
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        await checkAuthentication();

        if (Auth.isAuthenticated) {

            loadUserProfile();

            dispatchAuthEvent(

                "authenticated",

                {

                    user: currentUser()

                }

            );

        }

    }

);


/*=========================================================
    EXPORTS
=========================================================*/

Object.assign(window.Auth, {

    restoreSession,

    checkAuthentication,

    fetchCurrentUser,

    loadUserProfile,

    getUserRole,

    isAdmin,

    isFaculty,

    isStudent,

    dispatchAuthEvent,

    onAuthEvent

});


/*=========================================================
    End Part 3
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    auth.js
    Part 4

    ✓ Role-Based Route Protection
    ✓ Onboarding Check
    ✓ Student First Login Redirect
    ✓ Faculty Approval Check
    ✓ Admin Access Validation
    ✓ Unauthorized Redirect
    ✓ Session Timeout Warning
    ✓ Auto Logout Timer
=========================================================*/


/*=========================================================
    ROUTE PROTECTION
=========================================================*/

function requireRole(allowedRoles = []) {

    if (!Auth.isAuthenticated) {

        window.location.href = "/login.html";
        return false;

    }

    if (!allowedRoles.includes(Auth.role)) {

        Shared.showToast(
            "Access Denied",
            "danger"
        );

        window.location.href = "/login.html";

        return false;

    }

    return true;

}


/*=========================================================
    ADMIN ONLY
=========================================================*/

function requireAdmin() {

    return requireRole(["admin"]);

}


/*=========================================================
    FACULTY ONLY
=========================================================*/

function requireFaculty() {

    return requireRole(["faculty", "admin"]);

}


/*=========================================================
    STUDENT ACCESS
=========================================================*/

function requireStudent() {

    return requireRole([

        "student",

        "faculty",

        "admin"

    ]);

}


/*=========================================================
    STUDENT ONBOARDING CHECK
=========================================================*/

function checkStudentOnboarding() {

    if (Auth.role !== "student") return;

    if (!Auth.user) return;

    const onboardingPage =

        window.location.pathname.includes(

            "onboarding"

        );

    if (

        !Auth.user.isProfileComplete &&

        !onboardingPage

    ) {

        window.location.href =

            "/student/onboarding.html";

    }

}


/*=========================================================
    FIRST LOGIN REDIRECT
=========================================================*/

function redirectStudent() {

    if (

        Auth.role !== "student"

    ) return;

    if (

        Auth.user.isProfileComplete

    ) {

        window.location.href =

            "/student/dashboard.html";

    }

    else {

        window.location.href =

            "/student/onboarding.html";

    }

}


/*=========================================================
    FACULTY APPROVAL
=========================================================*/

function facultyApprovalCheck() {

    if (

        Auth.role !== "faculty"

    ) return true;

    if (

        Auth.user.isApproved

    ) {

        return true;

    }

    Shared.showToast(

        "Waiting for Admin Approval",

        "warning"

    );

    logout();

    return false;

}


/*=========================================================
    ADMIN VALIDATION
=========================================================*/

function validateAdminAccess() {

    if (

        Auth.role !== "admin"

    ) {

        Shared.showToast(

            "Administrator Only",

            "danger"

        );

        window.location.href =

            "/login.html";

        return false;

    }

    return true;

}


/*=========================================================
    UNAUTHORIZED PAGE
=========================================================*/

function redirectUnauthorized() {

    window.location.href =

        "/403.html";

}


/*=========================================================
    SESSION TIMEOUT
=========================================================*/

let sessionTimer;

const SESSION_TIMEOUT =

    30 * 60 * 1000;


/*=========================================================
    START TIMER
=========================================================*/

function startSessionTimer() {

    clearTimeout(sessionTimer);

    sessionTimer = setTimeout(

        showSessionWarning,

        SESSION_TIMEOUT - 60000

    );

}


/*=========================================================
    WARNING
=========================================================*/

function showSessionWarning() {

    Shared.showToast(

        "Session expires in 1 minute.",

        "warning",

        6000

    );

    setTimeout(

        autoLogout,

        60000

    );

}


/*=========================================================
    AUTO LOGOUT
=========================================================*/

function autoLogout() {

    Shared.showToast(

        "Session Expired",

        "danger"

    );

    logout();

}


/*=========================================================
    RESET TIMER
=========================================================*/

function resetSessionTimer() {

    startSessionTimer();

}


/*=========================================================
    USER ACTIVITY
=========================================================*/

[

    "mousemove",

    "keydown",

    "click",

    "scroll",

    "touchstart"

].forEach(event => {

    document.addEventListener(

        event,

        resetSessionTimer

    );

});


/*=========================================================
    INITIALIZE
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    () => {

        if (

            Auth.isAuthenticated

        ) {

            startSessionTimer();

            checkStudentOnboarding();

            facultyApprovalCheck();

        }

    }

);


/*=========================================================
    EXPORT
=========================================================*/

Object.assign(window.Auth, {

    requireRole,

    requireAdmin,

    requireFaculty,

    requireStudent,

    checkStudentOnboarding,

    redirectStudent,

    facultyApprovalCheck,

    validateAdminAccess,

    redirectUnauthorized,

    startSessionTimer,

    resetSessionTimer,

    autoLogout

});


/*=========================================================
    End Part 4
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    auth.js
    Part 5 (Final)

    ✓ Refresh Token Auto Scheduler
    ✓ Authentication Event Bus
    ✓ Login History Tracking
    ✓ Device Information
    ✓ Remember Last Route
    ✓ Authentication Debug Logger
    ✓ Complete Initialization
    ✓ Final Global Auth API
    ✓ Production Cleanup
=========================================================*/


/*=========================================================
    REFRESH TOKEN SCHEDULER
=========================================================*/

let refreshInterval = null;

function startTokenRefresh() {

    stopTokenRefresh();

    // Refresh every 14 minutes (access token assumed 15 min)
    refreshInterval = setInterval(async () => {

        try {

            await API.refreshAccessToken();

            debug("Access token refreshed");

        }

        catch (error) {

            console.error(error);

        }

    }, 14 * 60 * 1000);

}

function stopTokenRefresh() {

    if (refreshInterval) {

        clearInterval(refreshInterval);

        refreshInterval = null;

    }

}


/*=========================================================
    AUTHENTICATION EVENT BUS
=========================================================*/

const AuthBus = new EventTarget();

function emit(event, payload = {}) {

    AuthBus.dispatchEvent(

        new CustomEvent(event, {

            detail: payload

        })

    );

}

function on(event, callback) {

    AuthBus.addEventListener(

        event,

        callback

    );

}


/*=========================================================
    LOGIN HISTORY
=========================================================*/

function saveLoginHistory() {

    const history =

        JSON.parse(

            localStorage.getItem("loginHistory")

        ) || [];

    history.unshift({

        time: new Date().toISOString(),

        role: Auth.role,

        user:

            Auth.user?.email || ""

    });

    localStorage.setItem(

        "loginHistory",

        JSON.stringify(

            history.slice(0,20)

        )

    );

}

function getLoginHistory() {

    return JSON.parse(

        localStorage.getItem(

            "loginHistory"

        )

    ) || [];

}


/*=========================================================
    DEVICE INFORMATION
=========================================================*/

function getDeviceInfo() {

    return {

        browser:

            navigator.userAgent,

        language:

            navigator.language,

        platform:

            navigator.platform,

        online:

            navigator.onLine,

        width:

            window.innerWidth,

        height:

            window.innerHeight

    };

}


/*=========================================================
    LAST ROUTE
=========================================================*/

function rememberRoute() {

    sessionStorage.setItem(

        "lastRoute",

        location.pathname

    );

}

function restoreRoute() {

    return sessionStorage.getItem(

        "lastRoute"

    );

}


/*=========================================================
    DEBUG LOGGER
=========================================================*/

const DEBUG = true;

function debug(...args) {

    if (!DEBUG) return;

    console.log(

        "[AUTH]",

        ...args

    );

}


/*=========================================================
    AUTH LIFECYCLE
=========================================================*/

function loginSuccess(user) {

    setCurrentUser(user);

    saveLoginHistory();

    startTokenRefresh();

    emit("login", {

        user

    });

    debug("User logged in");

}

function logoutSuccess() {

    stopTokenRefresh();

    clearCurrentUser();

    emit("logout");

    debug("User logged out");

}


/*=========================================================
    PAGE EVENTS
=========================================================*/

window.addEventListener(

    "beforeunload",

    rememberRoute

);

window.addEventListener(

    "online",

    () => {

        debug("Connection Restored");

    }

);

window.addEventListener(

    "offline",

    () => {

        debug("Offline Mode");

    }

);


/*=========================================================
    INITIALIZATION
=========================================================*/

async function initializeAuth() {

    debug("Initializing Auth Module");

    const authenticated =

        await restoreSession();

    if (authenticated) {

        startTokenRefresh();

        saveLoginHistory();

        emit(

            "authenticated",

            {

                user: currentUser()

            }

        );

    }

}

document.addEventListener(

    "DOMContentLoaded",

    initializeAuth

);


/*=========================================================
    EXPORT
=========================================================*/

Object.assign(window.Auth, {

    startTokenRefresh,

    stopTokenRefresh,

    saveLoginHistory,

    getLoginHistory,

    getDeviceInfo,

    rememberRoute,

    restoreRoute,

    debug,

    loginSuccess,

    logoutSuccess,

    emit,

    on,

    initializeAuth

});


/*=========================================================
    VERSION
=========================================================*/

window.Auth.version = "1.0.0";

debug(

    "Authentication Module Loaded",

    window.Auth.version

);


/*=========================================================
    END auth.js
=========================================================*/