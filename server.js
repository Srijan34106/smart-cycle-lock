const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Logging middleware for Vercel debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Data Store
let lockState = {
    isLocked: true,
    startTime: null,
    endTime: null,
    durationMinutes: 0
};

let rideHistory = []; // { startTime, endTime, amount }

// Helper to check if ride has expired
const checkExpiration = () => {
    if (!lockState.isLocked && lockState.endTime) {
        const now = new Date();
        if (now > new Date(lockState.endTime)) {
            console.log("Ride expired. Locking...");
            lockState.isLocked = true;
            lockState.startTime = null;
            lockState.endTime = null;
            lockState.durationMinutes = 0;
        }
    }
};

// Helper to check if scheduled ride should start
const checkActivation = () => {
    if (lockState.isLocked && lockState.startTime) {
        const now = new Date();
        const start = new Date(lockState.startTime);
        // If now is past start time (and assume not yet past end time, though expiration handles that)
        if (now >= start) {
            console.log("Scheduled ride starting. Unlocking...");
            lockState.isLocked = false;
        }
    }
};

// --- API Routes ---

// Login Simulation
app.post('/api/login', (req, res) => {
    try {
        const body = req.body || {};
        const { username } = body;

        if (!username) {
            return res.status(400).json({ success: false, message: "Username required" });
        }

        // Accept any login
        res.json({ success: true, message: "Logged in", user: username });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server error during login" });
    }
});

// Get System Status (for Dashboard)
app.get('/api/status', (req, res) => {
    checkActivation();
    checkExpiration();
    const remainingMs = lockState.endTime ? new Date(lockState.endTime) - new Date() : 0;

    res.json({
        isLocked: lockState.isLocked,
        rideActive: !lockState.isLocked,
        startTime: lockState.startTime,
        endTime: lockState.endTime,
        remainingMinutes: Math.max(0, Math.floor(remainingMs / 60000)),
        remainingSeconds: Math.max(0, Math.floor((remainingMs % 60000) / 1000)),
        rideHistory
    });
});

// ESP32 Endpoint Simulation
app.get('/api/lock-status', (req, res) => {
    checkExpiration();
    // Simplified response for ESP32
    res.json({
        unlock: !lockState.isLocked,
        // Optional info for debugging/display on ESP32 if needed
        timeLeft: lockState.endTime ? Math.max(0, Math.floor((new Date(lockState.endTime) - new Date()) / 1000)) : 0
    });
});

// End Ride Manually
app.post('/api/end-ride', (req, res) => {
    if (lockState.isLocked) {
        return res.status(400).json({ success: false, message: "Ride not active" });
    }

    // Force lock
    console.log("Ride ended manually by user.");
    lockState.isLocked = true;
    lockState.startTime = null;
    lockState.endTime = null;
    lockState.durationMinutes = 0;

    res.json({ success: true, message: "Ride ended successfully" });
});

// Process Payment & Start Ride
app.post('/api/payment', (req, res) => {
    const { bookingDate, hours, minutes } = req.body;

    if (!bookingDate) {
        return res.status(400).json({ success: false, message: "Booking date is required" });
    }

    // Validate booking date (must be within next 5 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(bookingDate);
    selectedDate.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(selectedDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 5) {
        return res.status(400).json({ success: false, message: "Booking date must be within the next 5 days" });
    }

    // Calculate total duration in minutes
    const totalMinutes = (parseInt(hours || 0) * 60) + parseInt(minutes || 0);

    if (totalMinutes <= 0) {
        return res.status(400).json({ success: false, message: "Invalid duration" });
    }

    // Simulate Payment delay (logic handled in frontend mostly, this just commits the transaction)
    // const now = new Date(); // Removed to avoid conflict and unused var 

    // For this prototype, we assume immediate start for simplicity, or we could schedule it.
    // However, the prompt implies "booking" which usually means future, but the current system
    // locks/unlocks based on "now". Let's stick to "immediate unlock" logic for now but validate the date input as requested.
    // If the user meant "Schedule for later", that would require a scheduler.
    // Given "Stay in booking dashboard" and "unlock", it likely means "Book & Unlock Now" but with a date check?
    // Actually, "book the cycle between any day...".
    // If I select tomorrow, does it unlock NOW? 
    // The prompt says "after that another dashboard should pop which will take time...".
    // Let's assume for this prototype that the "Booking Date" is just a constraint check, 
    // and the ride starts *now* or at the *selected date*.
    // The current system logic `lockState` is very simple (isLocked true/false). 
    // If I book for tomorrow, it shouldn't unlock NOW. 
    // But the prompt says "enable the user to close the current display page and stay in the booking dashboard".
    // And "Stay in booking dashboard". 
    // Let's implement the constraint check. 
    // *Critical*: If I book for tomorrow, the `lockState` shouldn't change to `isLocked: false` immediately?
    // The current system is a simple "Unlock Now" flow. 
    // I will implement it such that it simulates a booking. 
    // But if the user selects *Today*, it unlocks. 
    // Implementation Detail: The prompt asks for *Booking*. 
    // "backend constraint such that the user can book the cycle between any day from the current date to a maximum of next 5 days."
    // I will store the start time as the *Booking Date + Current Time* (or 00:00?).
    // Actually, if it's a future booking, we probably shouldn't unlock immediately. 
    // BUT, the existing logic is `lockState`. 
    // Let's stick to the current "Unlock Now" behavior but *force* the user to pick a date.
    // If they pick a future date, we might just set the `startTime` to that date.
    // But then `checkExpiration` checks `now > endTime`.
    // If `startTime` is tomorrow, `endTime` is tomorrow + duration.
    // `now` is today. `now < endTime`. So it would be "active". 
    // We might need a `status` in `lockState` like 'scheduled' vs 'active'.
    // However, to keep it simple and compatible with existing "Unlock" button:
    // I will treat it as "Unlock Now" but we validate the date is "Today" or just valid.
    // Wait, if I book for *tomorrow*, surely I can't ride *today*.
    // The prompt might imply a "Reservation" system. 
    // "After that another dashboard should pop...". 
    // Let's assume the user wants to book *for a slot*.
    // But the simplest interpretation that fits the current "Smart Lock" (which usually unlocks immediately) 
    // is that we are just adding a Date Input step.
    // I made a decision: I will calculate `startTime` based on the selected `bookingDate`.
    // If `bookingDate` is today, use `new Date()`.
    // If `bookingDate` is future, use that date + current time (or 00:00).
    // Let's use `bookingDate` at current time of day for simplicity, or just set it.

    // Logic: 
    // Start Time = Booking Date set to current timestamps time? Or just 00:00?
    // Let's assume Start Time = Moment of booking if Today. 
    // If future: Start Time = Booking Date @ 00:00 (or user selected time? User only selects duration).
    // Let's use "Now" if today, or "Date @ Now's Time" if future. 

    let startTimestamp = new Date();
    if (diffDays > 0) { // Future date
        const bookingTime = new Date(bookingDate);
        const current = new Date();
        bookingTime.setHours(current.getHours(), current.getMinutes(), current.getSeconds());
        startTimestamp = bookingTime;
    }

    const endTime = new Date(startTimestamp.getTime() + totalMinutes * 60000);
    const amount = Math.ceil(totalMinutes / 30) * 100; // 100 Rs per 30 mins

    const now = new Date();
    const isFuture = startTimestamp > now;

    lockState = {
        isLocked: isFuture, // Lock if future, Unlock if now
        startTime: startTimestamp.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: totalMinutes
    };

    // Add to history
    rideHistory.unshift({
        startTime: startTimestamp.toISOString(),
        endTime: endTime.toISOString(),
        amount: amount
    });
    // Keep only last 3
    if (rideHistory.length > 3) rideHistory.pop();

    res.json({
        success: true,
        message: isFuture ? "Booking Scheduled." : "Payment Successful. Unlocking...",
        unlock: !isFuture,
        startTime: lockState.startTime,
        endTime: lockState.endTime,
        durationMinutes: totalMinutes,
        isFuture: isFuture
    });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`ESP32 Endpoint: http://localhost:${PORT}/api/lock-status`);
    });
}

module.exports = app;
