Here is the comprehensive **Master Prompt** for the TORC project. You can save this file as `MASTER_PROMPT.md` or `README.md` to share with other developers or AI assistants to instantly load the full context of the project.

---

# TORC: The Operations Research Challenge - Project Master File

## 1. Project Overview

**TORC** is a full-stack, real-time business simulation platform designed to test engineering students on Operations Research concepts. Participants act as CEOs of a pharmaceutical company, making decisions across three phases (Production, Investment, IPO).

The core differentiator is the **Realistic Market Simulator**: Unlike static quizzes, user decisions feed into a "Random Walk" algorithm that generates a live, ticking stock/sales graph via WebSockets, mimicking the volatility and trends of a real financial market.

## 2. Technical Stack

* **Runtime:** Node.js (v14+)
* **Frontend:** React (Vite), Recharts (Data Viz), Axios
* **Backend:** Express.js, `ws` (WebSocket), `sqlite3` (In-memory session store)
* **Styling:** Pure CSS (Custom "Bloomberg Terminal" Dark Theme)
* **DevOps:** Concurrent execution via `start.sh`

## 3. Core Algorithms & Logic

### A. The "Performance" Metric

Every user input is compared against a hidden `OPTIMAL_ANSWERS` configuration.

* **0.0 - 0.5:** Poor Strategy (Market Flatlines)
* **0.5 - 1.0:** Effective Strategy (Market Grows)

### B. The Market Simulator (Random Walk)

The backend runs a `setInterval` loop (1000ms tick) for every active session. The sales curve is generated using a modified Random Walk with Drift.

**Logic:**
$$Error = \frac{|Actual - Expected|}{Expected}$$

$$Performance = \max(0.1, 1 - \text{TotalError})$$
1. **Condition Check:** If `Performance < 0.5`:
* **Volatility:** 0.05% (Extremely low)
* **Drift:** 0.0% (Stagnant)
* *Result:* The graph looks "dead" or flat.


2. **Condition Check:** If `Performance ≥ 0.5`:
* **Volatility:** 3.0% (Healthy market noise)
* **Drift:** +0.5% per tick (Positive growth trend)
* *Result:* The graph ticks upward with realistic jagged edges.



**Formula:**
$$Noise = (\text{Random}(0,1) \times 2 - 1) \times Volatility$$
$$NewValue = OldValue \times (1 + Drift + Noise)$$

### C. Net Worth & Profit

Net Worth does not fluctuate wildly like the stock price. It accumulates linearly based on the company's output.
$$NetWorth_{new} = NetWorth_{old} + (CurrentSales \times 0.02)$$
* **Cost Deduction:** Occurs **once** when the user clicks "Launch Strategy".
* **Profit Accumulation:** Occurs every second inside the loop.

*(Profit is only generated if Performance > 0.5)*

## 4. Architecture & Data Flow

### Phase 1: The "Wizard" UI

1. **Step-by-Step:** Users answer questions sequentially (Q1 -> Q2).
2. **Navigation:** "Previous" and "Next" buttons allow review.
3. **No-Cost Navigation:** Moving between questions does **not** trigger the backend calculation or cost deduction.
4. **The Trigger:** The final button is **"Launch Strategy"**.

### Phase 2: The "Launch" Event

When "Launch Strategy" is clicked:

1. Frontend sends `POST /api/update-answers` with `{ launch: true }`.
2. Backend calculates total cost (e.g., $3000 for 30 people) and deducts it from Net Worth immediately.
3. Backend sets `market_active = 1` in the database.
4. The Simulation Loop detects `market_active` and begins generating data.

### Phase 3: Real-Time Feedback

1. **WebSocket:** Backend emits `liveUpdate` events containing `{ salesData, netWorth }`.
2. **Frontend:**
* Graph: Recharts updates the line chart dynamically.
* Net Worth: Updates in the header.
* UI State: Inputs lock, and a "Redo" button appears.



### Phase 4: Redo / Adjust

1. User clicks "Redo".
2. Inputs unlock.
3. Market **continues running** (it does not reset history).
4. User modifies answers and clicks "Launch" again to update the volatility/drift parameters of the live market.

## 5. API Reference

### REST

* `POST /api/init`: Creates session, returns `sessionId`.
* `GET /api/questions/:phase`: Returns questions and **Video URL**.
* `POST /api/update-answers`:
* Body: `{ sessionId, phase, answers, launch: boolean }`
* Logic: Only deducts cost and starts market if `launch === true`.


* `POST /api/advance-phase`: Moves user to Phase 2/3.

### WebSocket

* **Client -> Server:** `{ type: 'register', sessionId }`
* **Server -> Client:** `{ type: 'liveUpdate', salesData: {...}, netWorth: 12500 }`

## 6. Key Files

* `backend/server.js`: Contains all simulation math, random walk logic, and WebSocket handling.
* `frontend/src/phases/Phase1.jsx`: Handles the Wizard UI, video embedding, and the critical "Launch" vs "Next" logic.
* `frontend/src/App.jsx`: Manages the global WebSocket connection and routes traffic.
* `frontend/src/phases/Phase.css`: Contains styles for the enlarged video, pulse animations, and "Bloomberg" buttons.

## 7. Configuration (`backend/config.js`)

* **Optimal Answers:** Defined in the `OPTIMAL_ANSWERS` constant. Change these values to alter the difficulty of the simulation without changing code.

## 8. Deployment Notes

* **Database:** Currently In-Memory SQLite. For production, switch the connection string in `server.js` to a file path or PostgreSQL instance.
* **Scaling:** The `setInterval` approach works for ~50-100 concurrent users. For higher loads, move the simulation loop to a Redis-backed worker process.