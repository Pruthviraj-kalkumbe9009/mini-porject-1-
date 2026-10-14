/*=========================================================
    Smart Classroom & Timetable Scheduler
    guard.js
    Part 1

    ✓ Route Detection
    ✓ Authentication Check
    ✓ Public Routes
    ✓ Protected Routes
    ✓ Current Page Detection
    ✓ Route Configuration
=========================================================*/

"use strict";

/*=========================================================
    ROUTE CONFIGURATION
=========================================================*/

const Guard = {

    publicRoutes: [

        "/",

        "/index.html",

        "/login.html",

        "/signup.html",

        "/forgot-password.html"

    ],

    studentRoutes: [

        "/student/"

    ],

    facultyRoutes: [

        "/faculty/"

    ],

    adminRoutes: [

        "/admin/"

    ]

};


/*=========================================================
    CURRENT PATH
=========================================================*/

function currentPath() {

    return window.location.pathname;

}


/*=========================================================
    PUBLIC ROUTE
=========================================================*/

function isPublicRoute() {

    return Guard.publicRoutes.includes(

        currentPath()

    );

}


/*=========================================================
    STUDENT ROUTE
=========================================================*/

function isStudentRoute() {

    return currentPath()

        .startsWith("/student/");

}


/*=========================================================
    FACULTY ROUTE
=========================================================*/

function isFacultyRoute() {

    return currentPath()

        .startsWith("/faculty/");

}


/*=========================================================
    ADMIN ROUTE
=========================================================*/

function isAdminRoute() {

    return currentPath()

        .startsWith("/admin/");

}


/*=========================================================
    AUTH CHECK
=========================================================*/

async function checkAuthentication() {

    if (isPublicRoute())

        return true;

    const authenticated =

        await Auth.checkAuthentication();

    if (!authenticated) {

        redirectLogin();

        return false;

    }

    return true;

}


/*=========================================================
    LOGIN REDIRECT
=========================================================*/

function redirectLogin() {

    sessionStorage.setItem(

        "redirectAfterLogin",

        currentPath()

    );

    window.location.href =

        "/login.html";

}


/*=========================================================
    EXPORT
=========================================================*/

window.Guard = {

    currentPath,

    isPublicRoute,

    isStudentRoute,

    isFacultyRoute,

    isAdminRoute,

    checkAuthentication,

    redirectLogin

};


/*=========================================================
    End Part 1
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    guard.js
    Part 2

    ✓ Role-Based Route Protection
    ✓ Student Access Check
    ✓ Faculty Access Check
    ✓ Admin Access Check
    ✓ Unauthorized Redirect
    ✓ Route Middleware
    ✓ Dashboard Redirect Logic
=========================================================*/


/*=========================================================
    ACCESS DENIED PAGE
=========================================================*/

function redirectUnauthorized() {

    window.location.href = "/403.html";

}


/*=========================================================
    STUDENT ACCESS
=========================================================*/

function validateStudentAccess() {

    if (!isStudentRoute()) return true;

    // Admin and faculty may open student pages; students cannot open admin/faculty.
    if (!(Auth.isStudent() || Auth.isFaculty() || Auth.isAdmin())) {

        Shared.showToast(

            "Student Access Only",

            "danger"

        );

        redirectUnauthorized();

        return false;

    }

    return true;

}


/*=========================================================
    FACULTY ACCESS
=========================================================*/

function validateFacultyAccess() {

    if (!isFacultyRoute()) return true;

    if (

        !(Auth.isFaculty() || Auth.isAdmin())

    ) {

        Shared.showToast(

            "Faculty Access Only",

            "danger"

        );

        redirectUnauthorized();

        return false;

    }

    return true;

}


/*=========================================================
    ADMIN ACCESS
=========================================================*/

function validateAdminAccess() {

    if (!isAdminRoute()) return true;

    if (!Auth.isAdmin()) {

        Shared.showToast(

            "Administrator Access Required",

            "danger"

        );

        redirectUnauthorized();

        return false;

    }

    return true;

}


/*=========================================================
    ROLE VALIDATOR
=========================================================*/

function validateRoleAccess() {

    if (!validateStudentAccess())

        return false;

    if (!validateFacultyAccess())

        return false;

    if (!validateAdminAccess())

        return false;

    return true;

}


/*=========================================================
    DASHBOARD REDIRECT
=========================================================*/

function redirectDashboard() {

    if (!Auth.isLoggedIn())

        return;

    switch (Auth.getUserRole()) {

        case "admin":

            window.location.href =

                "/admin/dashboard.html";

            break;

        case "faculty":

            window.location.href =

                "/faculty/dashboard.html";

            break;

        case "student":

            if (

                Auth.currentUser()?.isProfileComplete

            ) {

                window.location.href =

                    "/student/dashboard.html";

            }

            else {

                window.location.href =

                    "/student/onboarding.html";

            }

            break;

    }

}


/*=========================================================
    ROUTE MIDDLEWARE
=========================================================*/

async function routeMiddleware() {

    const authenticated =

        await checkAuthentication();

    if (!authenticated)

        return;

    if (!validateRoleAccess())

        return;

}


/*=========================================================
    LOGIN PAGE CHECK
=========================================================*/

function preventLoginForAuthenticatedUsers() {

    if (!isPublicRoute())

        return;

    if (

        currentPath() === "/login.html" ||

        currentPath() === "/signup.html"

    ) {

        if (Auth.isLoggedIn()) {

            redirectDashboard();

        }

    }

}


/*=========================================================
    PAGE GUARD
=========================================================*/

async function initializeGuard() {

    await routeMiddleware();

    preventLoginForAuthenticatedUsers();

}


/*=========================================================
    INITIALIZATION
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    initializeGuard

);


/*=========================================================
    EXPORTS
=========================================================*/

Object.assign(window.Guard, {

    validateStudentAccess,

    validateFacultyAccess,

    validateAdminAccess,

    validateRoleAccess,

    redirectDashboard,

    routeMiddleware,

    initializeGuard,

    redirectUnauthorized

});


/*=========================================================
    End Part 2
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    guard.js
    Part 3

    ✓ Student Onboarding Route Guard
    ✓ Faculty Approval Guard
    ✓ Profile Completion Guard
    ✓ Session Expiry Handling
    ✓ Redirect After Login
    ✓ Return URL Support
    ✓ Route History Tracking
=========================================================*/


/*=========================================================
    ROUTE HISTORY
=========================================================*/

const RouteHistory = [];

function saveRoute() {

    const path = location.pathname;

    if (RouteHistory[RouteHistory.length - 1] !== path) {

        RouteHistory.push(path);

    }

    if (RouteHistory.length > 30) {

        RouteHistory.shift();

    }

}


/*=========================================================
    RETURN URL
=========================================================*/

function saveReturnUrl() {

    sessionStorage.setItem(

        "returnUrl",

        location.pathname

    );

}

function getReturnUrl() {

    return sessionStorage.getItem(

        "returnUrl"

    );

}

function clearReturnUrl() {

    sessionStorage.removeItem(

        "returnUrl"

    );

}


/*=========================================================
    REDIRECT AFTER LOGIN
=========================================================*/

function redirectAfterLogin() {

    const returnUrl = getReturnUrl();

    if (returnUrl) {

        clearReturnUrl();

        window.location.href = returnUrl;

        return;

    }

    Guard.redirectDashboard();

}


/*=========================================================
    STUDENT PROFILE CHECK
=========================================================*/

function checkProfileCompletion() {

    if (!Auth.isStudent()) {

        return true;

    }

    const user = Auth.currentUser();

    if (!user) {

        return false;

    }

    const onboardingPage =

        location.pathname.includes(

            "onboarding"

        );

    if (

        !user.isProfileComplete &&

        !onboardingPage

    ) {

        window.location.href =

            "/student/onboarding.html";

        return false;

    }

    if (

        user.isProfileComplete &&

        onboardingPage

    ) {

        window.location.href =

            "/student/dashboard.html";

        return false;

    }

    return true;

}


/*=========================================================
    FACULTY APPROVAL
=========================================================*/

function checkFacultyApproval() {

    if (!Auth.isFaculty()) {

        return true;

    }

    const user = Auth.currentUser();

    if (!user) {

        return false;

    }

    if (user.isApproved) {

        return true;

    }

    Shared.showToast(

        "Faculty account is awaiting administrator approval.",

        "warning"

    );

    Auth.logout();

    return false;

}


/*=========================================================
    SESSION EXPIRY
=========================================================*/

function handleExpiredSession() {

    Shared.showToast(

        "Your session has expired. Please login again.",

        "danger"

    );

    saveReturnUrl();

    Auth.logout();

}


/*=========================================================
    TOKEN CHECK
=========================================================*/

async function verifySession() {

    try {

        const authenticated =

            await Auth.checkAuthentication();

        if (!authenticated) {

            handleExpiredSession();

            return false;

        }

        return true;

    }

    catch (error) {

        console.error(error);

        handleExpiredSession();

        return false;

    }

}


/*=========================================================
    PAGE VALIDATION
=========================================================*/

async function validateCurrentPage() {

    const sessionValid =

        await verifySession();

    if (!sessionValid) {

        return;

    }

    if (!checkFacultyApproval()) {

        return;

    }

    if (!checkProfileCompletion()) {

        return;

    }

}


/*=========================================================
    ROUTE CHANGES
=========================================================*/

window.addEventListener(

    "popstate",

    saveRoute

);

window.addEventListener(

    "hashchange",

    saveRoute

);


/*=========================================================
    INITIALIZATION
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        saveRoute();

        await validateCurrentPage();

    }

);


/*=========================================================
    EXPORT
=========================================================*/

Object.assign(window.Guard, {

    saveRoute,

    saveReturnUrl,

    getReturnUrl,

    clearReturnUrl,

    redirectAfterLogin,

    checkProfileCompletion,

    checkFacultyApproval,

    handleExpiredSession,

    verifySession,

    validateCurrentPage,

    RouteHistory

});


/*=========================================================
    End Part 3
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    guard.js
    Part 4

    ✓ Permission Helper Functions
    ✓ Page Access Matrix
    ✓ Automatic Role Redirects
    ✓ Navigation Guard
    ✓ Browser Back Protection
    ✓ Inactivity Detection
    ✓ Route Transition Events
    ✓ Access Logging
=========================================================*/


/*=========================================================
    PAGE ACCESS MATRIX
=========================================================*/

const AccessMatrix = {

    admin: {

        "/admin/": true,
        "/faculty/": true,
        "/student/": true

    },

    faculty: {

        "/admin/": false,
        "/faculty/": true,
        "/student/": true

    },

    student: {

        "/admin/": false,
        "/faculty/": false,
        "/student/": true

    }

};


/*=========================================================
    PERMISSION HELPERS
=========================================================*/

function hasPermission(path = currentPath()) {

    if (!Auth.isLoggedIn())

        return false;

    const role = Auth.getUserRole();

    if (!role)

        return false;

    if (path.startsWith("/admin/"))

        return AccessMatrix[role]["/admin/"];

    if (path.startsWith("/faculty/"))

        return AccessMatrix[role]["/faculty/"];

    if (path.startsWith("/student/"))

        return AccessMatrix[role]["/student/"];

    return true;

}


function canAccessAdmin() {

    return hasPermission("/admin/");

}

function canAccessFaculty() {

    return hasPermission("/faculty/");

}

function canAccessStudent() {

    return hasPermission("/student/");

}


/*=========================================================
    ROLE REDIRECT
=========================================================*/

function redirectToRoleHome() {

    if (!Auth.isLoggedIn())

        return;

    switch (Auth.getUserRole()) {

        case "admin":

            location.replace(

                "/admin/dashboard.html"

            );

            break;

        case "faculty":

            location.replace(

                "/faculty/dashboard.html"

            );

            break;

        case "student":

            location.replace(

                Auth.currentUser()

                    ?.isProfileComplete

                    ? "/student/dashboard.html"

                    : "/student/onboarding.html"

            );

            break;

    }

}


/*=========================================================
    NAVIGATION GUARD
=========================================================*/

function guardNavigation(url) {

    if (!hasPermission(url)) {

        Shared.showToast(

            "You don't have permission to access this page.",

            "danger"

        );

        redirectToRoleHome();

        return false;

    }

    return true;

}


/*=========================================================
    BROWSER BACK PROTECTION
=========================================================*/

window.addEventListener(

    "popstate",

    () => {

        if (

            !hasPermission(

                location.pathname

            )

        ) {

            history.forward();

            redirectToRoleHome();

        }

    }

);


/*=========================================================
    INACTIVITY DETECTION
=========================================================*/

let inactivityTimer;

const INACTIVITY_LIMIT =

    20 * 60 * 1000;

function resetInactivityTimer() {

    clearTimeout(

        inactivityTimer

    );

    inactivityTimer = setTimeout(

        () => {

            Shared.showToast(

                "Logged out due to inactivity.",

                "warning"

            );

            Auth.logout();

        },

        INACTIVITY_LIMIT

    );

}


[

    "mousemove",

    "keydown",

    "mousedown",

    "touchstart",

    "scroll"

].forEach(event => {

    document.addEventListener(

        event,

        resetInactivityTimer

    );

});


/*=========================================================
    ROUTE TRANSITION EVENTS
=========================================================*/

const RouteEvents =

    new EventTarget();

function emitRouteChange(path) {

    RouteEvents.dispatchEvent(

        new CustomEvent(

            "routechange",

            {

                detail: {

                    path

                }

            }

        )

    );

}

function onRouteChange(callback) {

    RouteEvents.addEventListener(

        "routechange",

        callback

    );

}


/*=========================================================
    ACCESS LOGGING
=========================================================*/

const AccessLogs = [];

function logAccess(result) {

    AccessLogs.push({

        path: location.pathname,

        role: Auth.getUserRole(),

        result,

        time: new Date()

            .toISOString()

    });

    if (

        AccessLogs.length > 100

    ) {

        AccessLogs.shift();

    }

}


function getAccessLogs() {

    return AccessLogs;

}


/*=========================================================
    ROUTE WATCHER
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    () => {

        resetInactivityTimer();

        emitRouteChange(

            location.pathname

        );

        logAccess(

            hasPermission()

                ? "ALLOWED"

                : "DENIED"

        );

    }

);


/*=========================================================
    EXPORT
=========================================================*/

Object.assign(window.Guard, {

    AccessMatrix,

    hasPermission,

    canAccessAdmin,

    canAccessFaculty,

    canAccessStudent,

    redirectToRoleHome,

    guardNavigation,

    resetInactivityTimer,

    emitRouteChange,

    onRouteChange,

    getAccessLogs

});


/*=========================================================
    End Part 4
=========================================================*/
/*=========================================================
    Smart Classroom & Timetable Scheduler
    guard.js
    Part 5 (Final)

    ✓ Refresh Token Route Sync
    ✓ Online/Offline Route Handling
    ✓ Unsaved Changes Navigation Guard
    ✓ Global Route Error Handler
    ✓ Route Performance Monitoring
    ✓ Guard Initialization
    ✓ Final Cleanup
    ✓ Version Information
    ✓ Complete Global Guard API
=========================================================*/


/*=========================================================
    REFRESH TOKEN ROUTE SYNC
=========================================================*/

let refreshRouteInterval = null;

function startRouteSync() {

    stopRouteSync();

    refreshRouteInterval = setInterval(async () => {

        try {

            await Auth.checkAuthentication();

        }

        catch (error) {

            console.error(error);

        }

    }, 5 * 60 * 1000);

}

function stopRouteSync() {

    if (refreshRouteInterval) {

        clearInterval(refreshRouteInterval);

        refreshRouteInterval = null;

    }

}


/*=========================================================
    ONLINE / OFFLINE HANDLING
=========================================================*/

function handleOnline() {

    Shared.showToast(

        "Internet connection restored.",

        "success"

    );

}

function handleOffline() {

    Shared.showToast(

        "You are currently offline.",

        "warning"

    );

}

window.addEventListener(

    "online",

    handleOnline

);

window.addEventListener(

    "offline",

    handleOffline

);


/*=========================================================
    UNSAVED CHANGES
=========================================================*/

let hasUnsavedChanges = false;

function enableUnsavedChanges() {

    hasUnsavedChanges = true;

}

function disableUnsavedChanges() {

    hasUnsavedChanges = false;

}

window.addEventListener(

    "beforeunload",

    function(event){

        if(!hasUnsavedChanges)

            return;

        event.preventDefault();

        event.returnValue="";

    }

);


/*=========================================================
    GLOBAL ROUTE ERROR HANDLER
=========================================================*/

function handleRouteError(error){

    console.error(

        "Route Error",

        error

    );

    Shared.showToast(

        "Navigation Error",

        "danger"

    );

}


/*=========================================================
    PERFORMANCE MONITOR
=========================================================*/

const RoutePerformance = {

    start:0,

    end:0

};

function startRoutePerformance(){

    RoutePerformance.start=

        performance.now();

}

function endRoutePerformance(){

    RoutePerformance.end=

        performance.now();

    console.log(

        "Route Time:",

        (

            RoutePerformance.end-

            RoutePerformance.start

        ).toFixed(2),

        "ms"

    );

}


/*=========================================================
    ROUTE OBSERVER
=========================================================*/

function observeNavigation(){

    startRoutePerformance();

    window.addEventListener(

        "load",

        endRoutePerformance

    );

}


/*=========================================================
    INITIALIZATION
=========================================================*/

async function initializeGuardSystem(){

    try{

        await Guard.checkAuthentication();

        Guard.validateRoleAccess();

        Guard.checkProfileCompletion();

        Guard.checkFacultyApproval();

        startRouteSync();

        observeNavigation();

    }

    catch(error){

        handleRouteError(error);

    }

}


/*=========================================================
    CLEANUP
=========================================================*/

function destroyGuard(){

    stopRouteSync();

    window.removeEventListener(

        "online",

        handleOnline

    );

    window.removeEventListener(

        "offline",

        handleOffline

    );

}


/*=========================================================
    VERSION
=========================================================*/

const GUARD_VERSION="1.0.0";


/*=========================================================
    EXPORT
=========================================================*/

Object.assign(

    window.Guard,

    {

        startRouteSync,

        stopRouteSync,

        enableUnsavedChanges,

        disableUnsavedChanges,

        handleRouteError,

        startRoutePerformance,

        endRoutePerformance,

        initializeGuardSystem,

        destroyGuard,

        GUARD_VERSION

    }

);


/*=========================================================
    START
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    initializeGuardSystem

);

console.log(

    "Guard Module Loaded",

    GUARD_VERSION

);


/*=========================================================
    End guard.js
=========================================================*/