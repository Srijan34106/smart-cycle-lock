const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
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

// --- API Routes ---

// Login Simulation
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    // Accept any login
    res.json({ success: true, message: "Logged in", user: username });
});

// Get System Status (for Dashboard)
app.get('/api/status', (req, res) => {
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
    const { durationMinutes } = req.body;

    if (!durationMinutes || durationMinutes <= 0) {
        return res.status(400).json({ success: false, message: "Invalid duration" });
    }

    // Simulate Payment delay (logic handled in frontend mostly, this just commits the transaction)
    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60000);
    const amount = Math.ceil(durationMinutes / 30) * 10; // 10 Rs per 30 mins

    lockState = {
        isLocked: false, // UNLOCK
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: durationMinutes
    };

    // Add to history
    rideHistory.unshift({
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        amount: amount
    });
    // Keep only last 3
    if (rideHistory.length > 3) rideHistory.pop();

    res.json({
        success: true,
        message: "Payment Successful. Unlocking...",
        unlock: true,
        startTime: lockState.startTime,
        endTime: lockState.endTime,
        durationMinutes: durationMinutes
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
