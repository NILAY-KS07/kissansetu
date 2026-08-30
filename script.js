// KissanSetu - National Smart Farmer Procurement & Mandi Logistics Portal
// 100% Dynamic State Management with Custom Crop & Mandi Entry (script.js)

// Central Application State
let appState = {
    currentUser: null,
    farmers: [],
    bookings: [],
    queue: [],
    qualityAssessments: [],
    weighments: [],
    procurements: [],
    payments: [],
    notifications: []
};

const MSP_RATES = {
    "Wheat": 2425,
    "Paddy (Grade A)": 2320,
    "Maize": 2225,
    "Mustard": 5650,
    "Gram": 5440
};

let mediaStream = null;
let activeTokenId = null;
let generatedOtp = null;
let pendingLoginFarmer = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    loadStateFromStorage();

    const dateInput = document.getElementById("booking-date");
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    document.querySelectorAll(".step-nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const step = parseInt(btn.getAttribute("data-step"));
            goToStep(step);
        });
    });

    initNavScrollHighlight();
    renderAllViews();
    initOpenAnimation();
});

// App Entrance Splash & Page Open Animation Sequence
function initOpenAnimation() {
    const splash = document.getElementById("app-entrance-splash");
    const progress = document.getElementById("splash-progress");
    const statusText = document.getElementById("splash-status-text");

    if (!splash) return;

    setTimeout(() => {
        if (progress) progress.style.width = "45%";
        if (statusText) statusText.innerText = "🌾 Connecting KissanSetu Procurement Hub...";
    }, 250);

    setTimeout(() => {
        if (progress) progress.style.width = "85%";
        if (statusText) statusText.innerText = "⚡ Loading AI Quality & Queue Engine...";
    }, 650);

    setTimeout(() => {
        if (progress) progress.style.width = "100%";
        if (statusText) statusText.innerText = "✓ System Ready! Welcome to KissanSetu.";
    }, 1050);

    setTimeout(() => {
        splash.classList.add("splash-hide");
        document.body.classList.add("page-open-animated");
    }, 1350);
}

// Storage Persistence & Migration
function saveStateToStorage() {
    localStorage.setItem("kissansetu_app_state", JSON.stringify(appState));
}

function loadStateFromStorage() {
    const saved = localStorage.getItem("kissansetu_app_state") || localStorage.getItem("anvaya_app_state");
    if (saved) {
        try { appState = JSON.parse(saved); } catch (e) { console.error("Failed to parse state:", e); }
    }
}

function resetDemo() {
    if (confirm("Reset all KissanSetu demo data back to ZERO initial state?")) {
        localStorage.removeItem("kissansetu_app_state");
        localStorage.removeItem("anvaya_app_state");
        appState = {
            currentUser: null,
            farmers: [],
            bookings: [],
            queue: [],
            qualityAssessments: [],
            weighments: [],
            procurements: [],
            payments: [],
            notifications: []
        };
        activeTokenId = null;
        if (window.kissanSetuWeighbridge) window.kissanSetuWeighbridge.disconnect();
        renderAllViews();
        alert("✓ System reset completed. All data returned to 0 / empty state.");
    }
}

// Navbar Highlight on Scroll
function initNavScrollHighlight() {
    const navLinks = document.querySelectorAll(".nav-link");
    window.addEventListener("scroll", () => {
        let fromTop = window.scrollY + 100;
        navLinks.forEach(link => {
            const section = document.querySelector(link.hash);
            if (section && section.offsetTop <= fromTop && section.offsetTop + section.offsetHeight > fromTop) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });
    });
}

// Master Render
function renderAllViews() {
    renderUserSession();
    renderDashboard();
    renderFarmersTable();
    renderBookingFarmerDropdown();
    renderBookingsTable();
    renderDigitalTokenPass();
    renderQueueView();
    renderAiQualityView();
    renderWeighbridgeView();
    renderMspView();
    renderProcurementsTable();
    renderPaymentView();
    renderPaymentsTable();
    renderSmsView();
    saveStateToStorage();
}

// Step Navigation
function goToStep(stepNumber) {
    document.querySelectorAll(".step-nav-btn").forEach(btn => {
        const step = parseInt(btn.getAttribute("data-step"));
        if (step === stepNumber) btn.classList.add("active");
        else btn.classList.remove("active");
    });

    document.querySelectorAll(".step-panel").forEach(panel => panel.classList.remove("active"));
    
    const targetPanel = document.getElementById(`panel-step-${stepNumber}`);
    if (targetPanel) {
        targetPanel.classList.add("active");
        targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 1. AUTH LANDING GATEKEEPER
function switchAuthMode(mode) {
    document.getElementById("tab-btn-login").classList.remove("active");
    document.getElementById("tab-btn-register").classList.remove("active");

    if (mode === 'login') {
        document.getElementById("tab-btn-login").classList.add("active");
        document.getElementById("auth-view-login").style.display = "block";
        document.getElementById("auth-view-register").style.display = "none";
    } else {
        document.getElementById("tab-btn-register").classList.add("active");
        document.getElementById("auth-view-login").style.display = "none";
        document.getElementById("auth-view-register").style.display = "block";
    }
}

function switchLoginMethod(method) {
    document.getElementById("sub-tab-phone").classList.remove("active");
    document.getElementById("sub-tab-aadhaar").classList.remove("active");

    if (method === 'phone') {
        document.getElementById("sub-tab-phone").classList.add("active");
        document.getElementById("group-phone-input").style.display = "flex";
        document.getElementById("group-aadhaar-input").style.display = "none";
    } else {
        document.getElementById("sub-tab-aadhaar").classList.add("active");
        document.getElementById("group-phone-input").style.display = "none";
        document.getElementById("group-aadhaar-input").style.display = "flex";
    }
}

function sendLandingOtp() {
    const isPhone = document.getElementById("sub-tab-phone").classList.contains("active");
    let inputVal = "";

    if (isPhone) {
        inputVal = document.getElementById("landing-phone-input").value.trim();
        if (!inputVal) { alert("Please enter your Mobile Phone Number."); return; }
    } else {
        inputVal = document.getElementById("landing-aadhaar-input").value.trim();
        if (!inputVal) { alert("Please enter your 12-digit Aadhaar Number."); return; }
    }

    let match = appState.farmers.find(f => f.phone.includes(inputVal) || (f.aadhaar && f.aadhaar.includes(inputVal)));

    if (!match) {
        const demoAadhaar = isPhone ? "1234 5678 9012" : inputVal;
        const demoPhone = isPhone ? inputVal : "+91 98765 43210";
        match = {
            farmerId: `FARM-${String(appState.farmers.length + 1).padStart(3, '0')}`,
            name: "Ramesh Kumar",
            phone: demoPhone,
            aadhaar: demoAadhaar,
            crop: "Wheat",
            quantity: 50,
            center: "Karnal Central Grain Mandi Hub #3",
            status: "REGISTERED"
        };
        appState.farmers.push(match);
    }

    pendingLoginFarmer = match;
    generatedOtp = String(Math.floor(1000 + Math.random() * 9000));

    addNotification(`[SMS GATEWAY] OTP sent to ${match.phone}: Your login OTP is ${generatedOtp}`);

    document.getElementById("group-otp-input").style.display = "flex";
    const hintText = document.getElementById("landing-otp-hint");
    if (hintText) {
        hintText.innerHTML = `📩 SMS OTP delivered to <strong>${match.phone}</strong>: <mark style="background:#A7F3D0; padding:2px 6px; border-radius:4px; font-weight:800;">${generatedOtp}</mark> <button type="button" onclick="autoFillLandingOtp('${generatedOtp}')" style="background:#0EA5E9; color:#FFF; border:none; padding:2px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer; margin-left:6px;">Auto-fill OTP</button>`;
    }

    document.getElementById("btn-landing-send-otp").style.display = "none";
    document.getElementById("btn-landing-verify-otp").style.display = "block";

    alert(`📱 SMS Sent to ${match.phone}!\nYour OTP code is: ${generatedOtp}`);
}

function autoFillLandingOtp(otp) {
    const input = document.getElementById("landing-otp-input");
    if (input) input.value = otp;
}

function verifyLandingOtp() {
    const enteredOtp = document.getElementById("landing-otp-input").value.trim();
    if (enteredOtp !== generatedOtp) {
        alert("Incorrect OTP code. Please enter the 4-digit OTP delivered to your phone.");
        return;
    }

    appState.currentUser = pendingLoginFarmer;
    addNotification(`[KISSANSETU AUTH] Farmer ${appState.currentUser.name} logged in successfully via ${appState.currentUser.phone}`);

    renderAllViews();
    alert(`✓ Authentication successful! Welcome ${appState.currentUser.name}. KissanSetu Portal unlocked.`);
}

function logoutFarmer() {
    if (appState.currentUser) {
        addNotification(`[KISSANSETU AUTH] Farmer ${appState.currentUser.name} logged out.`);
        appState.currentUser = null;
        renderAllViews();
    }
}

function renderUserSession() {
    const landingSection = document.getElementById("auth-landing-section");
    const mainAppContent = document.getElementById("main-app-content");
    const pill = document.getElementById("user-session-pill");
    const nameSpan = document.getElementById("session-user-name");
    const statusPill = document.getElementById("system-status-pill");

    if (appState.currentUser) {
        if (landingSection) landingSection.style.display = "none";
        if (mainAppContent) mainAppContent.style.display = "block";
        if (pill) pill.style.display = "flex";
        if (nameSpan) nameSpan.innerText = `👤 ${appState.currentUser.name} (${appState.currentUser.farmerId})`;
        if (statusPill) statusPill.style.display = "none";
    } else {
        if (landingSection) landingSection.style.display = "flex";
        if (mainAppContent) mainAppContent.style.display = "none";
        if (pill) pill.style.display = "none";
        if (statusPill) statusPill.style.display = "flex";
    }
}

// 2. DASHBOARD
function renderDashboard() {
    document.getElementById("stat-total-farmers").innerText = appState.farmers.length;
    document.getElementById("stat-todays-bookings").innerText = appState.bookings.length;
    
    const waitingCount = appState.queue.filter(q => q.status === "WAITING").length;
    document.getElementById("stat-waiting-farmers").innerText = waitingCount;

    const approvedProc = appState.procurements.filter(p => p.status === "APPROVED");
    document.getElementById("stat-completed-proc").innerText = approvedProc.length;

    const totalQty = approvedProc.reduce((sum, p) => sum + (p.netWeight || 0), 0);
    document.getElementById("stat-total-qty").innerText = `${totalQty.toFixed(1)} Q`;

    const successPayments = appState.payments.filter(p => p.status === "SUCCESS");
    document.getElementById("stat-completed-payments").innerText = successPayments.length;

    const totalValue = successPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    document.getElementById("stat-total-val").innerText = `₹${totalValue.toLocaleString()}`;
}

// 3. FARMER REGISTRATION WITH CUSTOM CROP & MANDI TOGGLES
function onCropSelectChange() {
    const select = document.getElementById("reg-farmer-crop");
    const customGroup = document.getElementById("group-custom-crop");
    if (select.value === "__custom__") {
        customGroup.style.display = "block";
        document.getElementById("reg-custom-crop-input").focus();
    } else {
        customGroup.style.display = "none";
    }
}

function onCenterSelectChange() {
    const select = document.getElementById("reg-farmer-center");
    const customGroup = document.getElementById("group-custom-center");
    if (select.value === "__custom__") {
        customGroup.style.display = "block";
        document.getElementById("reg-custom-center-input").focus();
    } else {
        customGroup.style.display = "none";
    }
}

function handleRegisterFarmer(event) {
    event.preventDefault();
    const name = document.getElementById("reg-farmer-name").value.trim();
    const phone = document.getElementById("reg-farmer-phone").value.trim();
    const aadhaar = document.getElementById("reg-farmer-aadhaar").value.trim();
    
    let crop = document.getElementById("reg-farmer-crop").value;
    if (crop === "__custom__") {
        crop = document.getElementById("reg-custom-crop-input").value.trim();
        if (!crop) { alert("Please type your Custom Crop name."); return; }
    }

    let center = document.getElementById("reg-farmer-center").value;
    if (center === "__custom__") {
        center = document.getElementById("reg-custom-center-input").value.trim();
        if (!center) { alert("Please type your Custom Mandi Procurement Center name."); return; }
    }

    const qty = parseFloat(document.getElementById("reg-farmer-qty").value) || 50;
    const farmerId = `FARM-${String(appState.farmers.length + 1).padStart(3, '0')}`;

    if (!MSP_RATES[crop]) {
        MSP_RATES[crop] = 2500;
    }

    const newFarmer = {
        farmerId,
        name,
        phone,
        aadhaar: aadhaar || "1234 5678 9012",
        crop,
        quantity: qty,
        center,
        status: "REGISTERED"
    };

    appState.farmers.push(newFarmer);
    appState.currentUser = newFarmer;
    addNotification(`[KISSANSETU] Farmer Registration successful. ID: ${farmerId}, Name: ${name}, Crop: ${crop}`);

    document.getElementById("reg-farmer-name").value = "";
    document.getElementById("reg-farmer-phone").value = "";
    document.getElementById("reg-farmer-aadhaar").value = "";
    document.getElementById("reg-custom-crop-input").value = "";
    document.getElementById("reg-custom-center-input").value = "";

    renderAllViews();
    alert(`✓ Farmer ${name} (${farmerId}) registered with crop '${crop}'! Portal unlocked.`);
}

function deleteFarmer(farmerId) {
    const farmer = appState.farmers.find(f => f.farmerId === farmerId);
    if (!farmer) return;

    if (confirm(`Are you sure you want to DELETE farmer ${farmer.name} (${farmerId})? This will remove their bookings and tokens.`)) {
        appState.farmers = appState.farmers.filter(f => f.farmerId !== farmerId);
        
        const removedBookings = appState.bookings.filter(b => b.farmerId === farmerId);
        const removedTokens = removedBookings.map(b => b.tokenId);
        
        appState.bookings = appState.bookings.filter(b => b.farmerId !== farmerId);
        appState.queue = appState.queue.filter(q => !removedTokens.includes(q.tokenId));

        if (activeTokenId && removedTokens.includes(activeTokenId)) {
            activeTokenId = null;
        }

        if (appState.currentUser && appState.currentUser.farmerId === farmerId) {
            appState.currentUser = null;
        }

        addNotification(`[KISSANSETU SYSTEM] Farmer ${farmer.name} (${farmerId}) deregistered & deleted.`);
        renderAllViews();
        alert(`✓ Farmer ${farmerId} deleted.`);
    }
}

function renderFarmersTable() {
    const tbody = document.getElementById("farmers-table-body");
    if (!tbody) return;

    if (appState.farmers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-table-msg">No farmers registered yet. Add your first farmer above to begin.</td></tr>`;
        return;
    }

    let html = "";
    appState.farmers.forEach(f => {
        html += `
            <tr>
                <td><strong>${f.farmerId}</strong></td>
                <td>${f.name}</td>
                <td>${f.phone}</td>
                <td>${f.aadhaar || "—"}</td>
                <td>${f.crop}</td>
                <td>${f.quantity} Quintals</td>
                <td>${f.center}</td>
                <td><span class="tag tag-green">${f.status}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteFarmer('${f.farmerId}')">🗑 Delete</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// 4. SLOT BOOKING
function renderBookingFarmerDropdown() {
    const select = document.getElementById("booking-farmer-select");
    const bookBtn = document.getElementById("btn-book-slot");
    if (!select) return;

    if (appState.farmers.length === 0) {
        select.innerHTML = `<option value="">No farmers available. Please register a farmer first.</option>`;
        select.disabled = true;
        if (bookBtn) bookBtn.disabled = true;
        document.getElementById("booking-crop").value = "";
        document.getElementById("booking-center").value = "";
        document.getElementById("booking-qty").value = "";
        return;
    }

    select.disabled = false;
    if (bookBtn) bookBtn.disabled = false;

    let html = `<option value="" disabled ${!appState.currentUser ? 'selected' : ''}>-- Select a Registered Farmer --</option>`;
    appState.farmers.forEach(f => {
        const isSelected = appState.currentUser && appState.currentUser.farmerId === f.farmerId ? 'selected' : '';
        html += `<option value="${f.farmerId}" ${isSelected}>${f.name} (${f.farmerId}) - ${f.crop}</option>`;
    });
    select.innerHTML = html;

    if (appState.currentUser) {
        onBookingFarmerChange();
    }
}

function onBookingFarmerChange() {
    const select = document.getElementById("booking-farmer-select");
    const selectedId = select.value;
    const farmer = appState.farmers.find(f => f.farmerId === selectedId);
    if (farmer) {
        document.getElementById("booking-crop").value = farmer.crop;
        document.getElementById("booking-qty").value = farmer.quantity;
        document.getElementById("booking-center").value = farmer.center;
    }
}

function handleBookSlot(event) {
    event.preventDefault();
    const farmerId = document.getElementById("booking-farmer-select").value;
    const farmer = appState.farmers.find(f => f.farmerId === farmerId);
    if (!farmer) {
        alert("Please select a valid registered farmer.");
        return;
    }

    const crop = document.getElementById("booking-crop").value;
    const qty = parseFloat(document.getElementById("booking-qty").value) || 5;
    const center = document.getElementById("booking-center").value;
    const date = document.getElementById("booking-date").value;
    const timeSlot = document.getElementById("booking-time").value;

    const tokenNum = appState.bookings.length + 1;
    const tokenId = `KST-${String(tokenNum).padStart(3, '0')}`;

    const newBooking = {
        tokenId,
        farmerId: farmer.farmerId,
        farmerName: farmer.name,
        farmerPhone: farmer.phone,
        crop,
        quantity: qty,
        center,
        date,
        timeSlot,
        status: "BOOKED"
    };

    farmer.status = "BOOKED";
    appState.bookings.push(newBooking);

    appState.queue.push({
        tokenId,
        farmerName: farmer.name,
        status: "WAITING"
    });

    activeTokenId = tokenId;
    addNotification(`[KISSANSETU] Slot confirmed for ${farmer.name}. Token: ${tokenId}, Date: ${date}, Slot: ${timeSlot}`);

    renderAllViews();
    goToStep(2);
}

function renderBookingsTable() {
    const tbody = document.getElementById("bookings-table-body");
    if (!tbody) return;

    if (appState.bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-table-msg">No bookings available. Book a procurement slot to generate tokens.</td></tr>`;
        return;
    }

    let html = "";
    appState.bookings.forEach(b => {
        html += `
            <tr>
                <td><strong style="color:var(--primary-dark);">${b.tokenId}</strong></td>
                <td>${b.farmerName}</td>
                <td>${b.crop}</td>
                <td>${b.quantity} Quintals</td>
                <td>${b.center}</td>
                <td>${b.date}, ${b.timeSlot}</td>
                <td><span class="tag tag-green">${b.status}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// DIGITAL TOKEN PASS
function renderDigitalTokenPass() {
    const container = document.getElementById("token-pass-container");
    if (!container) return;

    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];

    if (!activeBooking) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem 1rem; color:#64748B;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                <h3 style="margin-top:0.75rem;">No Token Generated Yet</h3>
                <p>Register a farmer and book a procurement slot to generate a digital pass.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="digital-pass-card">
            <div class="pass-header">
                <div class="pass-brand">KISSANSETU DIGITAL PASS</div>
                <span class="pass-type">✓ Verified Mandi Queue Authorization</span>
            </div>

            <div class="pass-token-display">
                <div class="pass-token-num">${activeBooking.tokenId}</div>
                <small style="color:var(--primary-dark); font-weight:700;">Present at Mandi Entry Gate Counter</small>
            </div>

            <div class="pass-qr-box">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                    <rect width="120" height="120" rx="8" fill="white"/>
                    <rect x="10" y="10" width="30" height="30" rx="4" fill="#0F172A"/>
                    <rect x="16" y="16" width="18" height="18" fill="white"/>
                    <rect x="20" y="20" width="10" height="10" fill="#059669"/>
                    <rect x="80" y="10" width="30" height="30" rx="4" fill="#0F172A"/>
                    <rect x="86" y="16" width="18" height="18" fill="white"/>
                    <rect x="90" y="20" width="10" height="10" fill="#059669"/>
                    <rect x="10" y="80" width="30" height="30" rx="4" fill="#0F172A"/>
                    <rect x="16" y="86" width="18" height="18" fill="white"/>
                    <rect x="20" y="90" width="10" height="10" fill="#059669"/>
                    <rect x="50" y="15" width="8" height="8" fill="#0EA5E9"/>
                    <rect x="50" y="45" width="25" height="25" fill="#0F172A"/>
                </svg>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; font-size:0.85rem; margin-bottom:1.5rem;">
                <div><span style="color:#64748B;">Farmer:</span> <strong style="display:block;">${activeBooking.farmerName}</strong></div>
                <div><span style="color:#64748B;">Center:</span> <strong style="display:block;">${activeBooking.center}</strong></div>
                <div><span style="color:#64748B;">Crop:</span> <strong style="display:block;">${activeBooking.crop} (${activeBooking.quantity} Q)</strong></div>
                <div><span style="color:#64748B;">Slot:</span> <strong style="display:block;">${activeBooking.date}, ${activeBooking.timeSlot}</strong></div>
            </div>

            <div style="display:flex; gap:0.75rem;">
                <button class="btn btn-outline btn-full" onclick="triggerPresetSms('STATUS')">📲 Send SMS Pass</button>
                <button class="btn btn-primary btn-full" onclick="goToStep(3)">Proceed to Queue →</button>
            </div>
        </div>
    `;
}

// REAL-TIME QUEUE
function renderQueueView() {
    const curTokenDisp = document.getElementById("queue-current-token");
    const yourTokenDisp = document.getElementById("queue-your-token");
    const peopleAheadDisp = document.getElementById("queue-people-ahead");
    const waitDisp = document.getElementById("queue-est-wait");
    const simBtn = document.getElementById("btn-call-next-queue");
    const demoSimBtn = document.getElementById("btn-demo-advance");
    const chipsContainer = document.getElementById("queue-line-chips");

    const servingItem = appState.queue.find(q => q.status === "NOW_SERVING");
    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];

    if (servingItem) curTokenDisp.innerText = servingItem.tokenId;
    else curTokenDisp.innerText = "—";

    if (activeBooking) yourTokenDisp.innerText = activeBooking.tokenId;
    else yourTokenDisp.innerText = "—";

    const waitingQueue = appState.queue.filter(q => q.status === "WAITING");
    
    if (simBtn) simBtn.disabled = appState.queue.length === 0;
    if (demoSimBtn) demoSimBtn.disabled = appState.queue.length === 0;

    let peopleAhead = 0;
    if (activeBooking) {
        const myIndex = waitingQueue.findIndex(q => q.tokenId === activeBooking.tokenId);
        if (myIndex !== -1) peopleAhead = myIndex;
    }
    peopleAheadDisp.innerText = peopleAhead;
    waitDisp.innerText = `${peopleAhead * 6} mins`;

    if (!chipsContainer) return;
    if (appState.queue.length === 0) {
        chipsContainer.innerHTML = `<span style="color:#94A3B8; font-style:italic;">No active queue items. Book a slot to enter queue.</span>`;
        return;
    }

    let html = "";
    appState.queue.forEach(q => {
        let badgeStyle = "background:#E2E8F0; color:#0F172A;";
        let badgeText = q.status;

        if (q.status === "NOW_SERVING") {
            badgeStyle = "background:#10B981; color:#FFFFFF; font-weight:800;";
            badgeText = "NOW SERVING";
        } else if (activeBooking && q.tokenId === activeBooking.tokenId) {
            badgeStyle = "background:#0EA5E9; color:#FFFFFF;";
            badgeText = "YOUR TOKEN";
        }

        html += `
            <div style="background:#FFFFFF; border:1px solid #E2E8F0; padding:0.6rem 1rem; border-radius:12px; display:inline-flex; align-items:center; gap:0.5rem; white-space:nowrap;">
                <strong>${q.tokenId}</strong>
                <span style="font-size:0.72rem; padding:2px 6px; border-radius:4px; ${badgeStyle}">${badgeText}</span>
            </div>
        `;
    });
    chipsContainer.innerHTML = html;
}

function advanceQueue() {
    if (appState.queue.length === 0) {
        alert("Queue is empty. Please book a slot first.");
        return;
    }

    const currentServingIndex = appState.queue.findIndex(q => q.status === "NOW_SERVING");
    if (currentServingIndex !== -1) {
        appState.queue[currentServingIndex].status = "COMPLETED";
    }

    const nextWaiting = appState.queue.find(q => q.status === "WAITING");
    if (nextWaiting) {
        nextWaiting.status = "NOW_SERVING";
        addNotification(`[KISSANSETU QUEUE] Token ${nextWaiting.tokenId} is NOW SERVING at Gate Counter #02.`);
    } else {
        addNotification(`[KISSANSETU QUEUE] All tokens serviced.`);
    }

    renderAllViews();
}

// CAMERA & AI CROP QUALITY
async function toggleWebcam() {
    const video = document.getElementById("webcam-video");
    const previewImg = document.getElementById("grain-preview-img");
    const sampleView = document.getElementById("sample-grain-view");
    const cameraBtn = document.getElementById("btn-camera-toggle");
    const snapBtn = document.getElementById("btn-snap-photo");
    const statusText = document.getElementById("camera-status-text");

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
        video.style.display = "none";
        snapBtn.style.display = "none";
        cameraBtn.innerText = "📷 Open Camera";
        statusText.innerText = "● Ready (Camera OFF)";
        return;
    }

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = mediaStream;
        video.style.display = "block";
        if (previewImg) previewImg.style.display = "none";
        if (sampleView) sampleView.style.display = "none";
        snapBtn.style.display = "inline-flex";
        cameraBtn.innerText = "🛑 Close Camera";
        statusText.innerText = "● LIVE CAMERA ACTIVE";
    } catch (err) {
        alert("Camera access permission denied or unavailable. Use '📁 Upload Sample Photo' to select a photo.");
        console.warn("Camera error:", err);
    }
}

function captureWebcamPhoto() {
    const video = document.getElementById("webcam-video");
    const canvas = document.getElementById("webcam-canvas");
    const previewImg = document.getElementById("grain-preview-img");
    const snapBtn = document.getElementById("btn-snap-photo");
    const statusText = document.getElementById("camera-status-text");

    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg");
    appState.capturedImageBase64 = dataUrl;

    if (previewImg) {
        previewImg.src = dataUrl;
        previewImg.style.display = "block";
    }
    video.style.display = "none";
    snapBtn.style.display = "none";

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    const cameraBtn = document.getElementById("btn-camera-toggle");
    if (cameraBtn) cameraBtn.innerText = "📷 Retake Photo";
    if (statusText) statusText.innerText = "✓ Photo Captured from Live Camera";
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        appState.capturedImageBase64 = dataUrl;

        const previewImg = document.getElementById("grain-preview-img");
        const video = document.getElementById("webcam-video");
        const sampleView = document.getElementById("sample-grain-view");
        const statusText = document.getElementById("camera-status-text");

        if (video) video.style.display = "none";
        if (sampleView) sampleView.style.display = "none";
        if (previewImg) {
            previewImg.src = dataUrl;
            previewImg.style.display = "block";
        }
        if (statusText) statusText.innerText = `✓ File Uploaded: ${file.name}`;
    };
    reader.readAsDataURL(file);
}

function handleModelChange() {
    const select = document.getElementById("ai-engine-select");
    const badge = document.getElementById("ai-model-badge");
    if (!select || !badge) return;

    if (select.value === "gpt4o") badge.innerText = "Model: ChatGPT (GPT-4o)";
    else if (select.value === "claude") badge.innerText = "Model: Claude 3.5 Sonnet";
    else badge.innerText = "Model: KissanSetu Agri Vision";
}

function runAiQualityAnalysis() {
    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];

    if (!activeBooking) {
        alert("Please register a farmer and book a slot before running AI Crop Assessment.");
        return;
    }

    const scanLine = document.getElementById("scan-line-anim");
    const btn = document.getElementById("btn-run-ai");

    if (scanLine) scanLine.classList.add("scanning");
    if (btn) btn.disabled = true;

    setTimeout(() => {
        if (scanLine) scanLine.classList.remove("scanning");
        if (btn) btn.disabled = false;

        const assessment = {
            tokenId: activeBooking.tokenId,
            farmerName: activeBooking.farmerName,
            crop: activeBooking.crop,
            grade: "Grade A",
            score: 94,
            moisture: "11.2% (Optimal)",
            foreignMatter: "0.3% (Low)",
            uniformity: "96.4%",
            eligibility: "Eligible for Full MSP Procurement",
            reasoning: `[KissanSetu Vision Model]: Sample analyzed for ${activeBooking.crop}. Superior grain lustre, optimal moisture (11.2%). Grade A rating (94/100).`
        };

        const existingIdx = appState.qualityAssessments.findIndex(a => a.tokenId === activeBooking.tokenId);
        if (existingIdx !== -1) {
            appState.qualityAssessments[existingIdx] = assessment;
        } else {
            appState.qualityAssessments.push(assessment);
        }

        renderAiQualityView();
        saveStateToStorage();
        alert(`✓ AI Quality Analysis complete for Token ${activeBooking.tokenId}: Grade A (94/100)`);
    }, 1000);
}

function renderAiQualityView() {
    const container = document.getElementById("ai-results-content");
    if (!container) return;

    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];
    const assessment = activeBooking ? appState.qualityAssessments.find(a => a.tokenId === activeBooking.tokenId) : null;

    if (!assessment) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem 1rem; color:#64748B;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line></svg>
                <p style="margin-top:0.5rem; font-weight:600;">No crop sample submitted yet.</p>
                <small>Open camera or upload photo and click "Analyze Crop Sample" to begin.</small>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:16px; padding:1.25rem; margin-bottom:1.25rem; display:flex; align-items:center; gap:1.25rem;">
            <div style="font-size:2.5rem; font-weight:800; color:#047857; line-height:1;">${assessment.score}<small style="font-size:1rem; color:#059669;">/100</small></div>
            <div>
                <span class="tag tag-green" style="font-size:0.85rem;">Quality Grade: ${assessment.grade}</span>
                <span style="display:block; font-size:0.82rem; font-weight:700; color:#047857; margin-top:0.25rem;">✓ ${assessment.eligibility}</span>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; font-size:0.85rem; margin-bottom:1.25rem;">
            <div style="background:#F8FAFC; padding:0.75rem; border-radius:8px;">Crop Verified: <strong>${assessment.crop}</strong></div>
            <div style="background:#F8FAFC; padding:0.75rem; border-radius:8px;">Moisture: <strong>${assessment.moisture}</strong></div>
            <div style="background:#F8FAFC; padding:0.75rem; border-radius:8px;">Foreign Matter: <strong>${assessment.foreignMatter}</strong></div>
            <div style="background:#F8FAFC; padding:0.75rem; border-radius:8px;">Uniformity: <strong>${assessment.uniformity}</strong></div>
        </div>

        <div style="background:#F1F5F9; padding:0.9rem; border-radius:12px; font-size:0.85rem;">
            <strong>AI Multimodal Analysis Rationale:</strong>
            <p style="margin-top:0.25rem; color:#334155;">${assessment.reasoning}</p>
        </div>
    `;
}

// WEIGHBRIDGE
function startWeighbridgeSimulator() {
    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];
    const initialGross = activeBooking ? activeBooking.quantity + 2.5 : 52.5;

    window.kissanSetuWeighbridge.startSimulator(initialGross, 2.5);
    renderWeighbridgeView();
}

async function connectPhysicalScale() {
    const res = await window.kissanSetuWeighbridge.connectPhysicalScale();
    alert(res.message);
    renderWeighbridgeView();
}

function adjustGrossWeight(delta) {
    if (window.kissanSetuWeighbridge.status === "OFFLINE") startWeighbridgeSimulator();
    const newGross = window.kissanSetuWeighbridge.grossWeight + delta;
    window.kissanSetuWeighbridge.setGrossWeight(newGross);
    renderWeighbridgeView();
}

function setTareWeight(val) {
    if (window.kissanSetuWeighbridge.status === "OFFLINE") startWeighbridgeSimulator();
    window.kissanSetuWeighbridge.setTareWeight(val);
    renderWeighbridgeView();
}

function renderWeighbridgeView() {
    const statusPill = document.getElementById("scale-status-pill");
    const statusText = document.getElementById("scale-status-text");
    const netDigits = document.getElementById("scale-net-digits");
    const wbGross = document.getElementById("wb-gross");
    const wbTare = document.getElementById("wb-tare");
    const wbNet = document.getElementById("wb-net");
    const confirmBtn = document.getElementById("btn-confirm-weighment");

    const wb = window.kissanSetuWeighbridge.getWeightData();

    if (wb.status !== "OFFLINE") {
        if (statusPill) statusPill.className = "scale-live-indicator online";
        if (statusText) statusText.innerText = `ONLINE — ${wb.status}`;
        if (confirmBtn) confirmBtn.disabled = wb.net <= 0;
    } else {
        if (statusPill) statusPill.className = "scale-live-indicator";
        if (statusText) statusText.innerText = "OFFLINE";
        if (confirmBtn) confirmBtn.disabled = true;
    }

    if (netDigits) netDigits.innerText = wb.net.toFixed(1);
    if (wbGross) wbGross.innerText = wb.gross.toFixed(1);
    if (wbTare) wbTare.innerText = wb.tare.toFixed(1);
    if (wbNet) wbNet.innerText = wb.net.toFixed(1);
}

function confirmWeighment() {
    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];

    if (!activeBooking) {
        alert("No active booking found for weighment.");
        return;
    }

    const wb = window.kissanSetuWeighbridge.getWeightData();
    if (wb.net <= 0) {
        alert("Net weight must be greater than 0 Quintals.");
        return;
    }

    const weighmentRecord = {
        tokenId: activeBooking.tokenId,
        farmerName: activeBooking.farmerName,
        crop: activeBooking.crop,
        gross: wb.gross,
        tare: wb.tare,
        netWeight: wb.net
    };

    appState.weighments.push(weighmentRecord);

    const rate = MSP_RATES[activeBooking.crop] || 2425;
    const totalAmt = wb.net * rate;

    const procId = `PROC-${String(appState.procurements.length + 1).padStart(3, '0')}`;
    const procRecord = {
        procId,
        tokenId: activeBooking.tokenId,
        farmerName: activeBooking.farmerName,
        crop: activeBooking.crop,
        netWeight: wb.net,
        mspRate: rate,
        amount: totalAmt,
        status: "PENDING"
    };

    appState.procurements.push(procRecord);
    addNotification(`[KISSANSETU WEIGHMENT] Net Weight ${wb.net.toFixed(1)} Q verified for Token ${activeBooking.tokenId}.`);

    renderAllViews();
    goToStep(6);
    alert(`✓ Weighment confirmed: Net ${wb.net.toFixed(1)} Quintals recorded for Procurement ${procId}`);
}

// MSP CALCULATOR & PROCUREMENT
function renderMspView() {
    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];
    const procRecord = activeBooking ? appState.procurements.find(p => p.tokenId === activeBooking.tokenId) : null;

    const calcCrop = document.getElementById("msp-calc-crop");
    const calcQty = document.getElementById("msp-calc-qty");
    const calcRate = document.getElementById("msp-calc-rate");
    const calcTotal = document.getElementById("msp-calc-total");
    const approveBtn = document.getElementById("btn-approve-proc");

    const ratesContainer = document.getElementById("msp-rates-list-container");
    if (ratesContainer) {
        let ratesHtml = "";
        for (const [cropName, rateVal] of Object.entries(MSP_RATES)) {
            ratesHtml += `
                <div class="rate-item">
                    <span class="r-crop">${cropName}</span>
                    <span class="r-price">₹${rateVal.toLocaleString()} / Quintal</span>
                </div>
            `;
        }
        ratesContainer.innerHTML = ratesHtml;
    }

    if (!procRecord) {
        if (calcCrop) calcCrop.innerText = "—";
        if (calcQty) calcQty.innerText = "0 Q";
        if (calcRate) calcRate.innerText = "₹0 / Quintal";
        if (calcTotal) calcTotal.innerText = "₹0";
        if (approveBtn) approveBtn.disabled = true;
        return;
    }

    if (calcCrop) calcCrop.innerText = procRecord.crop;
    if (calcQty) calcQty.innerText = `${procRecord.netWeight.toFixed(1)} Quintals`;
    if (calcRate) calcRate.innerText = `₹${procRecord.mspRate.toLocaleString()} / Quintal`;
    if (calcTotal) calcTotal.innerText = `₹${procRecord.amount.toLocaleString()}`;

    if (approveBtn) approveBtn.disabled = procRecord.status !== "PENDING";
}

function approveProcurement() {
    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];
    const procRecord = activeBooking ? appState.procurements.find(p => p.tokenId === activeBooking.tokenId) : null;

    if (!procRecord) return;

    procRecord.status = "APPROVED";

    const refId = `DBT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const payRecord = {
        refId,
        tokenId: procRecord.tokenId,
        farmerName: procRecord.farmerName,
        amount: procRecord.amount,
        method: "Aadhaar Direct Benefit Transfer",
        timestamp: new Date().toLocaleTimeString(),
        status: "PROCESSING"
    };

    appState.payments.push(payRecord);
    addNotification(`[KISSANSETU PROCUREMENT] Mandate ${procRecord.procId} APPROVED. Payment initiated (${refId}).`);

    renderAllViews();
    goToStep(7);

    setTimeout(() => {
        payRecord.status = "SUCCESS";
        addNotification(`[KISSANSETU DBT PAYMENT] ₹${procRecord.amount.toLocaleString()} credited successfully (Ref: ${refId}).`);
        renderAllViews();
    }, 1000);
}

function renderProcurementsTable() {
    const tbody = document.getElementById("procurement-table-body");
    if (!tbody) return;

    if (appState.procurements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-table-msg">No procurement records yet. Complete weighment to generate procurement mandate.</td></tr>`;
        return;
    }

    let html = "";
    appState.procurements.forEach(p => {
        html += `
            <tr>
                <td><strong>${p.procId}</strong></td>
                <td>${p.tokenId}</td>
                <td>${p.farmerName}</td>
                <td>${p.crop}</td>
                <td>${p.netWeight.toFixed(1)} Q</td>
                <td>₹${p.mspRate.toLocaleString()}</td>
                <td><strong>₹${p.amount.toLocaleString()}</strong></td>
                <td><span class="tag tag-green">${p.status}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// PAYMENT TRACKER
function renderPaymentView() {
    const trackerContainer = document.getElementById("payment-tracker-steps");
    const receiptContainer = document.getElementById("payment-receipt-box");
    if (!trackerContainer || !receiptContainer) return;

    const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];
    const procRecord = activeBooking ? appState.procurements.find(p => p.tokenId === activeBooking.tokenId) : null;
    const payRecord = activeBooking ? appState.payments.find(p => p.tokenId === activeBooking.tokenId) : null;

    if (!procRecord) {
        trackerContainer.innerHTML = `<p style="color:#64748B; font-style:italic;">No payment tracking records yet. Complete procurement approval to view live pipeline.</p>`;
        receiptContainer.innerHTML = `<p style="color:#64748B; font-style:italic; text-align:center;">No receipt available yet.</p>`;
        return;
    }

    const isPaySuccess = payRecord && payRecord.status === "SUCCESS";

    trackerContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
            <div style="background:#F0FDF4; border:1px solid #A7F3D0; padding:0.9rem; border-radius:12px; font-size:0.88rem;">
                <strong style="color:#065F46;">1. Mandi Gate Procurement Verified</strong>
                <p style="color:#047857; margin-top:2px;">Token ${procRecord.tokenId} verified at Mandi Hub</p>
            </div>
            <div style="background:#F0FDF4; border:1px solid #A7F3D0; padding:0.9rem; border-radius:12px; font-size:0.88rem;">
                <strong style="color:#065F46;">2. Digital Weighment Verified</strong>
                <p style="color:#047857; margin-top:2px;">Net Quantity: <strong>${procRecord.netWeight.toFixed(1)} Quintals</strong></p>
            </div>
            <div style="background:#E0F2FE; border:1px solid #7DD3FC; padding:0.9rem; border-radius:12px; font-size:0.88rem;">
                <strong style="color:#0369A1;">3. Direct Benefit Transfer Gateway</strong>
                <p style="color:#0284C7; margin-top:2px;">Processing credit to Aadhaar Linked Bank A/C</p>
            </div>
            <div style="background:${isPaySuccess ? '#F0FDF4' : '#FEF3C7'}; border:1px solid ${isPaySuccess ? '#A7F3D0' : '#FDE68A'}; padding:0.9rem; border-radius:12px; font-size:0.88rem;">
                <strong style="color:${isPaySuccess ? '#065F46' : '#B45309'};">4. Payment Status: ${isPaySuccess ? 'CREDITED ✓' : 'PROCESSING ⏳'}</strong>
                <p style="color:${isPaySuccess ? '#047857' : '#92400E'}; margin-top:2px;">Amount: <strong>₹${procRecord.amount.toLocaleString()}</strong></p>
                ${isPaySuccess ? `<small style="color:#059669; font-weight:700;">Ref ID: ${payRecord.refId}</small>` : ''}
            </div>
        </div>
    `;

    if (isPaySuccess) {
        receiptContainer.innerHTML = `
            <div style="border:2px dashed #059669; border-radius:16px; padding:1.5rem; background:#FFFFFF;">
                <div style="text-align:center; margin-bottom:1rem; border-bottom:1px solid #E2E8F0; padding-bottom:0.75rem;">
                    <h3 style="color:#047857; font-size:1.25rem;">KISSANSETU OFFICIAL VOUCHER</h3>
                    <span class="tag tag-green">DIRECT BENEFIT TRANSFER SUCCESSFUL</span>
                </div>

                <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.85rem; margin-bottom:1.25rem;">
                    <div style="display:flex; justify-space-between;"><span>Farmer Name:</span> <strong>${procRecord.farmerName}</strong></div>
                    <div style="display:flex; justify-space-between;"><span>Token Ref:</span> <strong>${procRecord.tokenId}</strong></div>
                    <div style="display:flex; justify-space-between;"><span>Crop & Weight:</span> <strong>${procRecord.crop} (${procRecord.netWeight.toFixed(1)} Q)</strong></div>
                    <div style="display:flex; justify-space-between;"><span>Official MSP Rate:</span> <strong>₹${procRecord.mspRate.toLocaleString()} / Q</strong></div>
                    <div style="display:flex; justify-space-between; font-size:1.05rem; font-weight:800; color:#047857; border-top:1px solid #E2E8F0; padding-top:0.5rem;"><span>Total Amount Paid:</span> <span>₹${procRecord.amount.toLocaleString()}</span></div>
                </div>

                <button class="btn btn-outline btn-full" onclick="alert('KissanSetu Official Receipt Voucher PDF downloaded!')">📥 Download Voucher (PDF)</button>
            </div>
        `;
    }
}

function renderPaymentsTable() {
    const tbody = document.getElementById("payments-table-body");
    if (!tbody) return;

    if (appState.payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-table-msg">No payment records yet. Payment records will appear after procurement approval.</td></tr>`;
        return;
    }

    let html = "";
    appState.payments.forEach(p => {
        html += `
            <tr>
                <td><strong>${p.refId}</strong></td>
                <td>${p.farmerName}</td>
                <td><strong>₹${p.amount.toLocaleString()}</strong></td>
                <td>${p.method}</td>
                <td>${p.timestamp}</td>
                <td><span class="tag tag-green">${p.status}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// SMS LOGS & SIMULATOR
function addNotification(text) {
    appState.notifications.unshift({
        text,
        time: new Date().toLocaleTimeString()
    });
    renderSmsView();
}

function renderSmsView() {
    const container = document.getElementById("sms-msg-container");
    if (!container) return;

    if (appState.notifications.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#94A3B8; font-style:italic; padding:2rem 0;">No SMS notifications yet. Perform an action to trigger alerts.</div>`;
        return;
    }

    let html = "";
    appState.notifications.slice(0, 8).forEach(n => {
        html += `<div class="sms-bubble in">${n.text} <small style="display:block; font-size:0.68rem; color:#64748B; margin-top:2px;">${n.time}</small></div>`;
    });
    container.innerHTML = html;
}

function sendSimulatedSms() {
    const input = document.getElementById("sms-input");
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    addNotification(`User SMS Request: "${userText}"`);

    input.value = "";
    setTimeout(() => {
        const activeBooking = appState.bookings.find(b => b.tokenId === activeTokenId) || appState.bookings[appState.bookings.length - 1];
        if (userText.toUpperCase().includes("STATUS")) {
            const tokenStr = activeBooking ? activeBooking.tokenId : "NONE";
            addNotification(`[KISSANSETU QUEUE] Current Active Token: ${tokenStr}. Total Queue Length: ${appState.queue.length}.`);
        } else if (userText.toUpperCase().includes("PAY")) {
            const totalVal = appState.payments.reduce((s, p) => s + p.amount, 0);
            addNotification(`[KISSANSETU PAYMENT] Total Completed Payments: ${appState.payments.length}. Total Value Credited: ₹${totalVal.toLocaleString()}`);
        } else {
            addNotification(`[KISSANSETU SMS] Command received. Reply STATUS for Queue info or PAY for Payment summary.`);
        }
    }, 400);
}

function triggerPresetSms(type) {
    const input = document.getElementById("sms-input");
    if (type === 'STATUS') input.value = "STATUS";
    else if (type === 'PAYMENT') input.value = "PAY STATUS";
    sendSimulatedSms();
}

// SIH DEMO SHORTCUT HELPERS
function demoCreateFarmer() {
    const farmerId = `FARM-${String(appState.farmers.length + 1).padStart(3, '0')}`;
    const names = ["Ramesh Kumar", "Suresh Patel", "Gurpreet Singh", "Anita Devi"];
    const crops = ["Wheat", "Paddy (Grade A)", "Maize", "Mustard"];
    const randomName = names[appState.farmers.length % names.length];
    const randomCrop = crops[appState.farmers.length % crops.length];

    const demoFarmer = {
        farmerId,
        name: randomName,
        phone: "+91 98765 43210",
        aadhaar: "1234 5678 9012",
        crop: randomCrop,
        quantity: 50,
        center: "Karnal Central Grain Mandi Hub #3",
        status: "REGISTERED"
    };

    appState.farmers.push(demoFarmer);
    addNotification(`[KISSANSETU] Demo Farmer Registered: ${randomName} (${farmerId})`);
    renderAllViews();
    alert(`✓ Demo Farmer created: ${randomName} (${farmerId})`);
}

function demoBookSlot() {
    if (appState.farmers.length === 0) {
        demoCreateFarmer();
    }
    const farmer = appState.farmers[appState.farmers.length - 1];

    const tokenNum = appState.bookings.length + 1;
    const tokenId = `KST-${String(tokenNum).padStart(3, '0')}`;

    const newBooking = {
        tokenId,
        farmerId: farmer.farmerId,
        farmerName: farmer.name,
        farmerPhone: farmer.phone,
        crop: farmer.crop,
        quantity: farmer.quantity,
        center: farmer.center,
        date: new Date().toISOString().split('T')[0],
        timeSlot: "10:00 AM - 11:00 AM",
        status: "BOOKED"
    };

    farmer.status = "BOOKED";
    appState.bookings.push(newBooking);
    appState.queue.push({
        tokenId,
        farmerName: farmer.name,
        status: "WAITING"
    });

    activeTokenId = tokenId;
    addNotification(`[KISSANSETU] Slot Booked. Token: ${tokenId} generated for ${farmer.name}`);
    renderAllViews();
    goToStep(2);
}
