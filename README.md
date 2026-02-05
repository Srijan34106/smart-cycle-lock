# Smart Cycle Lock System

A web-based simulation of a Smart Bicycle Lock System with simulated payments and IoT integration.

## 📂 Project Structure
```
smart-cycle-lock/
├── public/              # Frontend Files
│   ├── index.html       # Login Page
│   ├── dashboard.html   # Main Dashboard
│   ├── style.css        # Dark Theme Styles
│   └── app.js           # Frontend Logic
├── server.js            # Backend (Node.js + Express)
├── package.json         # Dependencies
└── README.md            # Instructions
```

## 🚀 How to Install & Run

### 1. Install Node.js
If you don't have Node.js installed:
- Download it from [nodejs.org](https://nodejs.org/).
- Install the LTS version.
- Verify installation by running `node -v` in your terminal.

### 2. Setup the Project
Open your terminal (Command Prompt or PowerShell) and run:
```sh
cd "d:\antig\smart-cycle-lock"
npm install
```
This installs the required libraries (`express`, `cors`, etc).

### 3. Run the Server
Start the simulation backend:
```sh
npm start
```
You should see:
```
Server running on http://localhost:3000
ESP32 Endpoint: http://localhost:3000/api/lock-status
```

### 4. Access the Website
Open your browser and go to:
[http://localhost:3000](http://localhost:3000)

## 📡 API Documentation (For ESP32)

The ESP32 should poll the following endpoint to know if it should unlock.

**Endpoint:** `GET /api/lock-status`

**Response Example:**
```json
{
  "unlock": true,
  "timeLeft": 3540
}
```
- `unlock`: `true` (Unlock solenoid), `false` (Keep locked).
- `timeLeft`: Seconds remaining until auto-re-lock.

## 🧪 How to Demo (Viva Steps)
1. **Login**: Enter any username (e.g., "Student") and password.
2. **Dashboard**: Show "LOCKED" status.
3. **Book Ride**: Click "Book a Ride" -> Select "1 Minute (Demo)" -> "Pay Now".
4. **Unlock**: Show status changing to "UNLOCKED" and timer starting.
5. **ESP32 Check**: Open a new tab to `http://localhost:3000/api/lock-status` to show it returns `"unlock": true`.
6. **Wait**: After 1 minute, the system will auto-lock.

---
*Created for Academic Prototype demonstration.*
