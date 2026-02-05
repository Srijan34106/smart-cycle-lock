// Shared logic
const API_URL = '/api';

function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

async function initDashboard() {
    const lockStatusEl = document.getElementById('lock-status');
    const timerEl = document.getElementById('timer');
    const rideInfoEl = document.getElementById('ride-info');
    const bookBtn = document.getElementById('book-btn');
    const endRideBtn = document.getElementById('end-ride-btn');
    const historyList = document.getElementById('history-list');
    const progressBarFill = document.getElementById('progress-bar-fill');

    // Modal elements
    const modal = document.getElementById('booking-modal');
    const closeModal = document.querySelector('.close-modal');
    const payBtn = document.getElementById('pay-btn');
    const durationInput = document.getElementById('duration-input');
    const costDisplay = document.getElementById('cost-display');

    // --- State Polling ---
    async function updateStatus() {
        try {
            const res = await fetch(`${API_URL}/status`);
            const data = await res.json();

            // Update Lock Status
            if (data.isLocked) {
                lockStatusEl.className = 'status-badge status-locked';
                lockStatusEl.innerHTML = 'LOCKED 🔒';
                rideInfoEl.classList.add('hidden');

                // Explicitly Reset Timer UI
                timerEl.innerText = "00:00:00";
                if (progressBarFill) progressBarFill.style.width = '0%';

                bookBtn.style.display = 'block';
                endRideBtn.style.display = 'none';

                // Allow booking when locked
                bookBtn.disabled = false;
                bookBtn.style.opacity = '1';
                bookBtn.innerText = "Book a Ride";
            } else {
                lockStatusEl.className = 'status-badge status-unlocked';
                lockStatusEl.innerHTML = 'UNLOCKED 🔓';
                rideInfoEl.classList.remove('hidden');

                bookBtn.style.display = 'none';
                endRideBtn.style.display = 'block';

                // Calculate remaining time
                const now = new Date();
                const endTime = new Date(data.endTime);
                const startTime = new Date(data.startTime);

                let remainingMs = endTime - now;
                if (remainingMs < 0) remainingMs = 0;

                timerEl.innerText = formatTime(remainingMs);

                // Update Progress Bar
                if (progressBarFill && startTime && endTime) {
                    const totalDuration = endTime - startTime;
                    const elapsed = now - startTime;
                    const percentage = Math.max(0, Math.min(100, (remainingMs / totalDuration) * 100));
                    progressBarFill.style.width = `${percentage}%`;

                    // Color shift based on urgency
                    if (percentage < 20) {
                        progressBarFill.style.backgroundColor = 'var(--danger)';
                    } else {
                        progressBarFill.style.backgroundColor = 'var(--accent)';
                    }
                }

                // Disable booking while unlocked
                bookBtn.disabled = true;
                bookBtn.style.opacity = '0.5';
                bookBtn.innerText = "Ride in Progress";
            }

            // Update History
            updateHistory(data.rideHistory);

        } catch (err) {
            console.error("Status fetch error", err);
        }
    }

    function updateHistory(history) {
        if (!history || history.length === 0) return;

        historyList.innerHTML = history.map(ride => `
            <div class="history-item">
                <span>${new Date(ride.startTime).toLocaleTimeString()}</span>
                <span style="color: var(--success);">₹${ride.amount}</span>
            </div>
        `).join('');
    }

    // Poll every 1 second
    setInterval(updateStatus, 1000);
    updateStatus(); // Initial call

    // --- End Ride Flow ---
    endRideBtn.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to end your ride?")) return;

        try {
            const res = await fetch(`${API_URL}/end-ride`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert("Ride ended.");
                // Immediate UI update before poll
                timerEl.innerText = "00:00:00";
                if (progressBarFill) progressBarFill.style.width = '0%';
                rideInfoEl.classList.add('hidden');

                updateStatus();
            } else {
                alert("Error ending ride: " + data.message);
            }
        } catch (err) {
            console.error("Error ending ride", err);
        }
    });

    // --- Booking Flow ---
    bookBtn.addEventListener('click', () => {
        modal.classList.add('active');
        calculateCost();
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Cost Calculation
    durationInput.addEventListener('input', calculateCost);

    function calculateCost() {
        let mins = parseInt(durationInput.value);
        if (isNaN(mins) || mins < 1) mins = 0;

        // Pricing Logic: ₹10 per 30 mins or part thereof
        let amount = Math.ceil(mins / 30) * 10;
        if (amount === 0 && mins > 0) amount = 10;

        costDisplay.innerText = `₹${amount}`;
    }

    // Payment Simulation
    payBtn.addEventListener('click', async () => {
        const mins = parseInt(durationInput.value);
        if (!mins || mins <= 0) {
            alert("Please enter a valid duration");
            return;
        }

        payBtn.innerText = "Processing...";
        payBtn.disabled = true;

        // Simulate 2 sec delay
        setTimeout(async () => {
            try {
                const res = await fetch(`${API_URL}/payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ durationMinutes: mins })
                });
                const data = await res.json();

                if (data.success) {
                    // Success!
                    modal.classList.remove('active');
                    alert("Payment Successful! Cycle Unlocked.");
                    updateStatus();
                } else {
                    alert("Payment Failed");
                }
            } catch (err) {
                alert("Error processing payment");
            } finally {
                payBtn.innerText = "Pay Now & Unlock";
                payBtn.disabled = false;
            }
        }, 1500);
    });
}
