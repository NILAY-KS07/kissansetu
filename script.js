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
        return Object.fromEntries(
            [...formData.entries()].filter(([, value]) => value !== "")
        );
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
function replaceDashPlaceholders() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    textNodes.forEach(textNode => {
        if (textNode.nodeValue.includes("—")) {
            textNode.nodeValue = textNode.nodeValue.replaceAll("—", "Loading...");
        }
    });
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
        element.textContent = user.role || `Farmer ID: ${user.mobile || "Registered"}`;
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
function initNotifications() {
    document.querySelectorAll(".notification-btn").forEach(button => {
        button.type = "button";
        button.addEventListener("click", () => {
            const existing = button.parentElement.querySelector(".notification-panel");
            if (existing) {
                existing.remove();
                return;
            }
            const panel = document.createElement("div");
            panel.className = "notification-panel";
            panel.innerHTML = "<strong>Notifications</strong><p>Your latest booking and queue updates will appear here.</p><a href=\"my-bookings.html\">View my bookings</a>";
            button.parentElement.style.position = "relative";
            button.parentElement.appendChild(panel);
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
if (redirect) {
                    window.location.href = redirect;
                }
            } catch {
                return;
            }
        });
    });
}
async function initBookingPage() {
    if (getCurrentPage() !== "book-slot.html") return;
    const centreSelect = document.querySelector("#centre");
    const dateInput = document.querySelector("#date");
    const slotSelect = document.querySelector("#slot");
    if (!centreSelect || !dateInput || !slotSelect) return;

    const today = new Date();
    dateInput.value = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    dateInput.min = dateInput.value;

    try {
        const response = await api.get(`/slots?date=${encodeURIComponent(dateInput.value)}`);
        response.centres.forEach(centre => {
            const option = document.createElement("option");
            option.value = centre.id;
            option.textContent = `${centre.name} · ${centre.load_percent}% loaded`;
            option.dataset.tat = centre.estimated_tat_hours;
            centreSelect.appendChild(option);
        });
    } catch (error) {
        ui.showError(error.message);
    }

    const refreshSlots = async () => {
        if (!centreSelect.value || !dateInput.value) return;
        slotSelect.disabled = true;
        slotSelect.innerHTML = "<option value=\"\">Loading available times...</option>";
        try {
            const response = await api.get(`/slots?centre_id=${encodeURIComponent(centreSelect.value)}&date=${encodeURIComponent(dateInput.value)}`);
            slotSelect.innerHTML = "<option value=\"\">Select an available time</option>";
            response.items.filter(item => item.available).forEach(item => {
                const option = document.createElement("option");
                option.value = item.slot_start;
                option.textContent = item.label;
                slotSelect.appendChild(option);
            });
            slotSelect.disabled = response.items.every(item => !item.available);
            const panel = document.querySelector("#tat-panel");
            const tat = response.centre.estimated_tat_hours;
            document.querySelector("#tat-value").textContent = `${tat} hours`;
            document.querySelector("#tat-note").textContent = response.centre.tat_note;
            panel.hidden = false;
            initIcons();
        } catch (error) {
            ui.showError(error.message);
        }
    };
    centreSelect.addEventListener("change", refreshSlots);
    dateInput.addEventListener("change", refreshSlots);
}
function initCropQualityCheck() {
    const input = document.querySelector("#crop-image");
    if (!input) return;
    input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        const result = document.querySelector("#quality-result");
        result.hidden = false;
        result.className = "quality-result";
        result.textContent = "Checking crop sample...";
        const formData = new FormData();
        formData.append("image", file);
        try {
            const response = await fetch(`${API_BASE_URL}/crop-quality-check`, {
                method: "POST",
                headers: { Authorization: `Bearer ${auth.getToken()}` },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Quality check failed.");
            result.classList.add(data.fit_to_sell ? "quality-good" : "quality-review");
            result.textContent = `${data.fit_to_sell ? "Fit to sell" : "Needs review"} · ${data.confidence}% confidence. ${data.message}`;
            document.querySelector("#quality-status").value = data.status;
            document.querySelector("#quality-score").value = data.confidence;
        } catch (error) {
            result.classList.add("quality-review");
            result.textContent = error.message;
        }
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
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        "\"": "&quot;"
    }[character]));
}
function formatBookingDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}
function isUpcomingBooking(booking) {
    const slotTime = new Date(booking.slot_start).getTime();
    const createdTime = new Date(booking.created_at).getTime();
    const slotVisibleUntil = slotTime + (2 * 60 * 60 * 1000);
    const bookingVisibleUntil = createdTime + (2 * 60 * 60 * 1000);
    const visibleUntil = Math.max(slotVisibleUntil, bookingVisibleUntil);
    return visibleUntil >= Date.now() && booking.status !== "completed";
}
function centreName(centreId) {
    return {
        "jaipur-north": "Jaipur North Procurement Centre",
        "jaipur-east": "Jaipur East Procurement Centre",
        "jaipur-rural": "Jaipur Rural Procurement Centre"
    }[centreId] || centreId || "Centre unavailable";
}
function renderBookingHistory(bookings, filter) {
    const container = document.querySelector("#booking-history-body");
    if (!container) return;
    container.style.display = "";
    const visible = bookings.filter(booking => filter === "upcoming" ? isUpcomingBooking(booking) : !isUpcomingBooking(booking));
    if (!visible.length) {
        container.innerHTML = `<div class="empty-state"><i data-lucide="calendar-plus"></i><strong>No ${filter} bookings</strong><p>${filter === "upcoming" ? "Choose a procurement centre and reserve your first slot." : "Completed and earlier bookings will appear here."}</p>${filter === "upcoming" ? '<a class="btn btn-primary" href="book-slot.html">Book a slot</a>' : ""}</div>`;
        initIcons();
        return;
    }
    container.innerHTML = `<div class="booking-history-list">${visible.map(booking => `
        <div class="booking-history-row">
            <div><strong>${escapeHtml(booking.crop)}</strong><span>${escapeHtml(booking.token_label || booking.id)}</span></div>
            <span>${escapeHtml(centreName(booking.centre_id))}</span>
            <span>${escapeHtml(formatBookingDate(booking.slot_start))}</span>
            <span class="status-badge ${booking.status === "completed" ? "success" : "info"}">${escapeHtml(booking.status)}</span>
            <strong>${escapeHtml(booking.quantity)} qtl</strong>
        </div>`).join("")}</div>`;
}
function renderPrimaryBooking(bookings) {
    const card = document.querySelector("#booking-primary-card");
    if (!card) return;
    card.style.display = "";
    const booking = bookings.find(isUpcomingBooking);
    if (!booking) {
        card.innerHTML = `<div class="card-body empty-state"><i data-lucide="calendar-plus"></i><strong>No upcoming booking</strong><p>Reserve a procurement slot to see your token and expected turn here.</p><a class="btn btn-primary" href="book-slot.html">Book a slot</a></div>`;
        initIcons();
        return;
    }
    const setText = (element, value) => {
        if (element) element.textContent = value;
    };
    setText(card.querySelector("h3"), booking.crop);
    setText(card.querySelector("h3 + p"), formatBookingDate(booking.slot_start));
    const bookingReference = [...card.querySelectorAll("span")].find(element => element.textContent.includes("Booking #"));
    setText(bookingReference, `Booking #${booking.id}`);
    const values = card.querySelectorAll("strong");
    setText(values[0], centreName(booking.centre_id));
    setText(values[1], booking.crop);
    setText(values[2], `${booking.quantity} qtl`);
    setText(values[3], booking.token_label || "Pending");
    setText(values[4], queueWaitLabel(booking));
    const main = card.closest("main");
    const history = main?.querySelector("#booking-history-section");
    let sibling = main?.querySelector(".dashboard-content")?.nextElementSibling;
    while (sibling && sibling !== history) {
        const nextSibling = sibling.nextElementSibling;
        const siblingValues = sibling.querySelectorAll("strong");
        if (siblingValues.length >= 4) {
            setText(siblingValues[0], centreName(booking.centre_id));
            setText(siblingValues[1], booking.crop);
            setText(siblingValues[2], `${booking.quantity} qtl`);
            setText(siblingValues[3], booking.token_label || "Pending");
        }
        if (siblingValues.length >= 1 && sibling.innerText.includes("LIVE PROCUREMENT STATUS")) {
            setText(siblingValues[0], queueWaitLabel(booking));
            const waitText = [...sibling.querySelectorAll("span")].find(element => element.textContent.includes("approx."));
            setText(waitText, `· approx. ${booking.estimated_wait_minutes ?? 0} min wait`);
        }
        sibling = nextSibling;
    }
}
function queueWaitLabel(booking) {
    return booking.people_ahead === 0 ? "You are #1 and waiting" : "Waiting for your turn";
}
async function initBookingsPage() {
    if (getCurrentPage() !== "my-bookings.html") return;
    const upcomingTab = document.querySelector("#upcoming-bookings-tab");
    const pastTab = document.querySelector("#past-bookings-tab");
    if (!upcomingTab || !pastTab) return;
    const historySection = document.querySelector("#booking-history-section");
    const filterButton = [...(historySection?.querySelectorAll("button") || [])].find(button => button.textContent.trim() === "Filter");
    filterButton?.remove();
    const paginationButton = historySection?.querySelector("button:disabled");
    paginationButton?.parentElement?.parentElement?.remove();
    let bookings = [];
    let filter = "upcoming";
    const selectTab = selected => {
        filter = selected;
        upcomingTab.classList.toggle("active", selected === "upcoming");
        pastTab.classList.toggle("active", selected === "past");
        renderBookingHistory(bookings, filter);
    };
    upcomingTab.addEventListener("click", () => selectTab("upcoming"));
    pastTab.addEventListener("click", () => selectTab("past"));
    try {
        const [bookingResponse, queueResponse] = await Promise.all([
            api.get("/bookings"),
            api.get("/queue")
        ]);
        bookings = bookingResponse.items || [];
        const currentBooking = bookings.find(isUpcomingBooking);
        if (currentBooking) {
            currentBooking.people_ahead = queueResponse.people_ahead;
            currentBooking.estimated_wait_minutes = queueResponse.estimated_wait_minutes;
        }
        renderPrimaryBooking(bookings);
        selectTab(filter);
    } catch (error) {
        renderPrimaryBooking([]);
        renderBookingHistory([], filter);
        ui.showError(error.message);
    }
}
function renderEmptyDashboardBooking() {
    const card = document.querySelector("#dashboard-booking-card");
    if (!card) return;
    card.innerHTML = `<div class="booking-hero empty-state"><i data-lucide="calendar-plus"></i><strong>No active booking</strong><p>Reserve a procurement slot to see your token, queue position, and expected turn here.</p><a class="btn btn-primary" href="book-slot.html">Book a slot</a></div>`;
    initIcons();
}
function renderDashboardBooking(booking, queue) {
    const card = document.querySelector("#dashboard-booking-card");
    if (!card || !booking) return;
    const peopleAhead = Number.isFinite(Number(queue?.people_ahead)) ? queue.people_ahead : 0;
    card.innerHTML = `<div class="booking-hero"><div class="booking-hero-top"><div><div class="booking-label">ACTIVE PROCUREMENT</div><div class="booking-title">${escapeHtml(booking.crop)}</div><div class="booking-date">${escapeHtml(formatBookingDate(booking.slot_start))}</div></div><span class="status-badge success"><span class="status-dot"></span>Waiting</span></div><div class="token-box"><div><div class="token-label">YOUR TOKEN</div><div class="token-number">${escapeHtml(booking.token || booking.token_label || "Pending")}</div><div class="token-caption">${escapeHtml(centreName(booking.centre_id))}</div></div><div><div class="token-label">PEOPLE AHEAD</div><div class="token-number">${escapeHtml(peopleAhead)}</div></div></div><div class="card-body"><div class="form-row"><div><span class="stat-label">Quantity</span><strong>${escapeHtml(booking.quantity)} qtl</strong></div><div><span class="stat-label">Expected turn</span><strong>Approx. 24 hours</strong></div></div><p class="form-help">Your booking remains visible for at least two hours after the slot starts. Queue timing may change with centre load.</p><a class="btn btn-secondary" href="my-bookings.html">View booking details</a></div></div>`;
    initIcons();
}
function renderQueuePage(queue) {
    const card = document.querySelector("#live-queue-card");
    if (!card) return;
    if (!queue?.your_token) {
        card.innerHTML = `<div class="card-body empty-state"><i data-lucide="calendar-plus"></i><strong>No active queue booking</strong><p>Book a procurement slot to receive a token and track your place here.</p><a class="btn btn-primary" href="book-slot.html">Book a slot</a></div>`;
        initIcons();
        return;
    }
    const peopleAhead = Number(queue.people_ahead || 0);
    card.innerHTML = `<div class="booking-hero"><div class="booking-label">YOUR ACTIVE TOKEN</div><div class="token-number">${escapeHtml(queue.your_token)}</div><p>${escapeHtml(centreName(queue.centre_id))} · ${escapeHtml(queue.date)}</p><div class="card-body"><strong>${peopleAhead === 0 ? "You are #1 and waiting" : `${peopleAhead} people ahead of you`}</strong><p class="form-help">Your booking remains active for at least two hours after the slot starts. Queue timing may change with centre load.</p></div></div>`;
    initIcons();
}
function renderPaymentsPage(response) {
    const summary = response.summary || {};
    const items = response.items || [];
    const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
    const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
    };
    setText("#payment-total-received", money(summary.total_received));
    setText("#payment-pending", money(summary.pending_amount));
    setText("#payment-completed-count", summary.transaction_count || "0");
    const latest = items[0];
    if (latest) {
        setText("#latest-payment-amount", money(latest.amount));
        setText("#latest-payment-id", latest.id);
        setText("#latest-booking-id", latest.booking_id);
        setText("#latest-payment-date", formatBookingDate(latest.date));
        const latestCard = document.querySelector("#latest-payment-card");
        if (latestCard) latestCard.dataset.paymentId = latest.id;
    } else {
        const latestCard = document.querySelector("#latest-payment-card");
        if (latestCard) latestCard.innerHTML = '<div class="card-body empty-state"><i data-lucide="indian-rupee"></i><strong>No payment received yet</strong><p>Payment details will appear here after a completed procurement.</p></div>';
        initIcons();
    }
    const body = document.querySelector("#payment-history-body");
    if (!body) return;
    body.innerHTML = items.length ? items.map(item => `<tr data-payment-year="${new Date(item.date).getFullYear()}" style="border-bottom:1px solid var(--border-light)"><td style="padding:16px 10px"><strong>${escapeHtml(item.id)}</strong><div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:2px">${escapeHtml(item.booking_id)}</div></td><td style="padding:16px 10px">${escapeHtml(item.crop)}</td><td style="padding:16px 10px">${escapeHtml(formatBookingDate(item.date))}</td><td style="padding:16px 10px"><strong>${money(item.amount)}</strong></td><td style="padding:16px 10px"><span class="status-badge ${item.status === "Completed" ? "success" : "warning"}">${escapeHtml(item.status)}</span></td></tr>`).join("") : '<tr><td colspan="5"><div class="empty-state"><strong>No payment records</strong><p>Your payment details will appear after procurement.</p></div></td></tr>';
    const yearFilter = document.querySelector("#payment-year-filter");
    yearFilter?.addEventListener("change", () => {
        body.querySelectorAll("tr[data-payment-year]").forEach(row => {
            row.hidden = row.dataset.paymentYear !== yearFilter.value;
        });
    });
}
function initMspFilters() {
    if (getCurrentPage() !== "msp-rates.html") return;
    const season = document.querySelector("#msp-season");
    const search = document.querySelector("#crop-search");
    const rows = [...document.querySelectorAll("#msp-table tbody tr")];
    const apply = () => {
        const seasonValue = season?.value || "all";
        const searchValue = (search?.value || "").trim().toLowerCase();
        rows.forEach(row => {
            const matchesSeason = seasonValue === "all" || row.dataset.season === seasonValue;
            const matchesSearch = !searchValue || row.dataset.crop.includes(searchValue) || row.textContent.toLowerCase().includes(searchValue);
            row.hidden = !(matchesSeason && matchesSearch);
        });
    };
    season?.addEventListener("change", apply);
    search?.addEventListener("input", apply);
}
function renderDashboardData(response) {
    const stats = response.stats || {};
    const queue = response.queue || {};
    const active = response.active_booking && isUpcomingBooking(response.active_booking) ? response.active_booking : null;
    const user = response.user || {};
    const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
    };
    setText("#dashboard-greeting", `Good morning, ${user.name || "Farmer"}`);
    setText("#dashboard-subtitle", active ? "Your active procurement booking and latest updates" : "Book a procurement slot to begin your journey");
    setText("#dashboard-active-count", active ? "1" : "0");
    setText("#dashboard-active-meta", active ? `${active.crop} · ${formatBookingDate(active.slot_start)}` : "No active booking");
    setText("#dashboard-queue-position", queue.people_ahead === null || queue.people_ahead === undefined ? "-" : `#${Number(queue.people_ahead) + 1}`);
    setText("#dashboard-queue-meta", queue.your_token ? `${queue.your_token} · ${queue.people_ahead || 0} ahead` : "Book a slot to join");
    setText("#dashboard-produce", active?.crop || "None");
    setText("#dashboard-produce-meta", active ? `${active.quantity} qtl reserved` : "No produce booked");
    setText("#dashboard-payment-status", stats.pending_amount ? "Pending" : "Clear");
    setText("#dashboard-payment-meta", stats.pending_amount ? `₹${Number(stats.pending_amount).toLocaleString("en-IN")} pending` : "No pending payment");
    const mspRates = { wheat: 2585, mustard: 6200 };
    setText("#dashboard-wheat-rate", `₹${mspRates.wheat.toLocaleString("en-IN")} / Q`);
    setText("#dashboard-mustard-rate", `₹${mspRates.mustard.toLocaleString("en-IN")} / Q`);
    if (!active) renderEmptyDashboardBooking();
    const activity = document.querySelector("#dashboard-activity-list");
    if (activity) {
        const items = response.recent_activity || [];
        activity.innerHTML = items.length ? items.slice(0, 3).map(item => `<a href="my-bookings.html" class="activity-item" style="text-decoration:none"><div class="activity-icon">✓</div><div class="activity-content"><strong>Slot ${item.status === "completed" ? "completed" : "confirmed"}</strong><p>${escapeHtml(item.crop)} · ${escapeHtml(formatBookingDate(item.slot_start))}</p></div></a>`).join("") : '<div class="empty-state"><strong>No recent activity</strong><p>Your booking updates will appear here.</p><a class="btn btn-primary btn-sm" href="book-slot.html">Book a slot</a></div>';
    }
    return response;
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
    if (!endpoint) return;
    try {
        const response = await api.get(endpoint);
        if (page === "live-queue.html") {
            renderQueuePage(response);
            return;
        }
        if (page === "payments.html") {
            renderPaymentsPage(response);
            return;
        }
        if (page === "dashboard.html") {
            renderDashboardData(response);
            if (response.active_booking && isUpcomingBooking(response.active_booking)) {
                renderDashboardBooking(response.active_booking, response.queue);
            } else {
                renderEmptyDashboardBooking();
            }
        }
        if (page === "msp-rates.html" && Array.isArray(response.items)) {
            response.items.forEach(item => {
                const field = document.querySelector(`[data-field="msp-${item.crop.toLowerCase()}"]`);
                if (field) field.textContent = `₹${Number(item.rate).toLocaleString("en-IN")}`;
            });
            document.querySelectorAll("[data-field='rate']").forEach((field, index) => {
                const item = response.items[index];
                if (item) field.textContent = `₹${Number(item.rate).toLocaleString("en-IN")}`;
            });
            const year = document.querySelector("[data-field='msp-year']");
            const updated = document.querySelector("[data-field='msp-last-updated']");
            if (year) year.textContent = "Kharif & Rabi 2026-27";
            if (updated) updated.textContent = "Hardcoded reference rates for procurement planning";
            return;
        }
        document.querySelectorAll("[data-field]").forEach(element => {
            const value = readValue(response, element.dataset.field);
            if (value !== undefined && value !== null) element.textContent = value;
        });
    } catch (error) {
        if (page === "dashboard.html") renderEmptyDashboardBooking();
        document.querySelectorAll("[data-field]").forEach(element => {
            element.textContent = "Unavailable";
        });
        ui.showError(error.message);
    }
}
function init() {
    initAccessGuard();
    replaceDashPlaceholders();
    initIcons();
    initNavigation();
    initUserInterface();
    initPasswordToggles();
    initLogout();
    initNotifications();
    initForms();
    initBookingPage();
    initCropQualityCheck();
    initApiActions();
    initBookingsPage();
    initMspFilters();
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
