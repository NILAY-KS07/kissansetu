const API_BASE_URL = window.KISSANSETU_API_URL || "http://127.0.0.1:5000/api";
const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem("kissansetu_token");
const config = {
            method: options.method || "GET",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        };
if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
if (options.body !== undefined) {
            config.body = JSON.stringify(options.body);
        }
const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
let data = null;
try {
            data = await response.json();
        } catch {
            data = null;
        }
if (!response.ok) {
            const message = data?.message || data?.error || `Request failed with status ${response.status}`;
            const error = new Error(message);
            error.status = response.status;
            error.data = data;
            throw error;
        }
return data;
    },
get(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "GET"
        });
    },
post(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "POST",
            body
        });
    },
put(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "PUT",
            body
        });
    },
delete(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "DELETE"
        });
    }
};
const auth = {
    getToken() {
        return localStorage.getItem("kissansetu_token");
    },
setToken(token) {
        if (token) {
            localStorage.setItem("kissansetu_token", token);
        }
    },
clear() {
        localStorage.removeItem("kissansetu_token");
        localStorage.removeItem("kissansetu_user");
    },
getUser() {
        const user = localStorage.getItem("kissansetu_user");
if (!user) {
            return null;
        }
try {
            return JSON.parse(user);
        } catch {
            return null;
        }
    },
setUser(user) {
        localStorage.setItem("kissansetu_user", JSON.stringify(user));
    },
isAuthenticated() {
        return Boolean(this.getToken());
    },
logout() {
        this.clear();
        window.location.href = "auth.html";
    }
};
const ui = {
    setLoading(element, loading, text = "Loading...") {
        if (!element) return;
if (loading) {
            element.dataset.originalText = element.textContent;
            element.disabled = true;
            element.textContent = text;
            element.classList.add("is-loading");
        } else {
            element.disabled = false;
            element.textContent = element.dataset.originalText || element.textContent;
            element.classList.remove("is-loading");
        }
    },
showError(message, container = null) {
        const target = container || document.querySelector(".form-error");
if (target) {
            target.textContent = message;
            target.hidden = false;
            return;
        }
console.error(message);
    },
clearError(container = null) {
        const target = container || document.querySelector(".form-error");
if (target) {
            target.textContent = "";
            target.hidden = true;
        }
    },
redirect(url) {
        window.location.href = url;
    }
};
const storage = {
    get(key, fallback = null) {
        const value = localStorage.getItem(key);
if (value === null) {
            return fallback;
        }
try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },
set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
remove(key) {
        localStorage.removeItem(key);
    }
};
const forms = {
    getData(form) {
        const formData = new FormData(form);
        return Object.fromEntries(formData.entries());
    },
async submit(form, endpoint, options = {}) {
        const submitButton = form.querySelector('[type="submit"]');
        const data = this.getData(form);
ui.clearError();
try {
            ui.setLoading(submitButton, true);
const response = await api.request(endpoint, {
                method: options.method || "POST",
                body: data
            });
if (typeof options.onSuccess === "function") {
                await options.onSuccess(response, data);
            }
return response;
        } catch (error) {
            ui.showError(error.message);
            throw error;
        } finally {
            ui.setLoading(submitButton, false);
        }
    }
};
function validateForm(form) {
    const fields = [...form.querySelectorAll("[required]")];
    const password = form.querySelector("[name='password']");
    const confirmation = form.querySelector("[name='confirm_password']");
    if (password && confirmation && password.value !== confirmation.value) {
        confirmation.setCustomValidity("Passwords must match.");
    } else if (confirmation) {
        confirmation.setCustomValidity("");
    }
    const validatedInvalid = fields.find(field => !field.value.trim() || !field.checkValidity());
    if (validatedInvalid) {
        validatedInvalid.focus();
        ui.showError(validatedInvalid.validationMessage || "Please check the form fields.", form.querySelector(".form-error"));
        return false;
    }
    return true;
}
function getCurrentPage() {
    return window.location.pathname.split("/").pop() || "index.html";
}
function initNavigation() {
    const currentPage = getCurrentPage();
document.querySelectorAll(".sidebar-link").forEach(link => {
        const targetPage = link.getAttribute("href");
if (targetPage === currentPage) {
            link.classList.add("active");
        }
    });
}
function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
function initPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach(button => {
        button.addEventListener("click", () => {
            const input = button.closest(".input-wrapper")?.querySelector("input");
            const icon = button.querySelector("[data-lucide]");
            if (!input) return;
            const visible = input.type === "text";
            input.type = visible ? "password" : "text";
            button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
            if (icon) {
                icon.setAttribute("data-lucide", visible ? "eye" : "eye-off");
                initIcons();
            }
        });
    });
}
function initUserInterface() {
    const user = auth.getUser();
if (!user) return;
document.querySelectorAll(".user-info strong").forEach(element => {
        if (user.name) {
            element.textContent = user.name;
        }
    });
document.querySelectorAll(".user-info span").forEach(element => {
        if (user.role) {
            element.textContent = user.role;
        }
    });
document.querySelectorAll(".avatar").forEach(element => {
        if (user.name) {
            element.textContent = getInitials(user.name);
        }
    });
}
function getInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}
function requireAuth() {
    if (!auth.isAuthenticated()) {
        window.location.href = "auth.html";
        return false;
    }
return true;
}
function initAccessGuard() {
    const protectedPage = document.body.dataset.requireAuth === "true";
    if (protectedPage && requireAuth()) {
        document.body.classList.add("is-authorized");
    }
}
function initLogout() {
    document.querySelectorAll("[data-action='logout']").forEach(element => {
        element.addEventListener("click", event => {
            event.preventDefault();
            auth.logout();
        });
    });
}
function initForms() {
    document.querySelectorAll("form[data-api]").forEach(form => {
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (!validateForm(form)) return;
const endpoint = form.dataset.api;
            const redirect = form.dataset.redirect;
try {
                const response = await forms.submit(form, endpoint);
if (response?.token) {
                    auth.setToken(response.token);
                }
if (response?.user) {
                    auth.setUser(response.user);
                }
                if (response?.verification_required && response.challenge?.challenge_id) {
                    localStorage.setItem("kissansetu_otp_challenge", JSON.stringify(response.challenge));
                    window.location.href = "otp.html";
                    return;
                }
if (redirect) {
                    window.location.href = redirect;
                }
            } catch {
                return;
            }
        });
    });
}
function initApiActions() {
    document.querySelectorAll("[data-api-action]").forEach(element => {
        element.addEventListener("click", async event => {
            event.preventDefault();
const endpoint = element.dataset.apiAction;
            const method = element.dataset.apiMethod || "POST";
            const redirect = element.dataset.redirect;
try {
                ui.setLoading(element, true);
await api.request(endpoint, {
                    method
                });
if (redirect) {
                    window.location.href = redirect;
                }
            } catch (error) {
                ui.showError(error.message);
            } finally {
                ui.setLoading(element, false);
            }
        });
    });
}
function readValue(source, path) {
    return path.split(".").reduce((value, key) => value?.[key], source);
}
async function initPageData() {
    const page = getCurrentPage();
    const endpoints = {
        "dashboard.html": "/dashboard",
        "my-bookings.html": "/bookings",
        "live-queue.html": "/queue",
        "payments.html": "/payments",
        "msp-rates.html": "/msp-rates"
    };
    const endpoint = endpoints[page];
    if (!endpoint || !document.querySelector("[data-field]")) return;
    try {
        const response = await api.get(endpoint);
        document.querySelectorAll("[data-field]").forEach(element => {
            const value = readValue(response, element.dataset.field);
            if (value !== undefined && value !== null) element.textContent = value;
        });
    } catch (error) {
        document.querySelectorAll("[data-field]").forEach(element => {
            element.textContent = "—";
        });
        ui.showError(error.message);
    }
}
function init() {
    initAccessGuard();
    initIcons();
    initNavigation();
    initUserInterface();
    initPasswordToggles();
    initLogout();
    initForms();
    initApiActions();
    initPageData();
}
document.addEventListener("DOMContentLoaded", init);
window.KissanSetu = {
    api,
    auth,
    ui,
    storage,
    forms,
    requireAuth,
    validateForm
};
