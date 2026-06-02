# 🎟️ CinePass – High-Concurrency Premium Ticketing System

CinePass is a highly optimized, full-stack Single Page Application (SPA) that simulates an enterprise-grade movie ticket booking platform. The system is engineered to maintain **100% data integrity under heavy concurrent booking traffic** through a **2-Phase Atomic Checkout System**, **pessimistic database locking**, and **connection-pool armor**, even while running on free-tier cloud infrastructure.

---

## 🚀 Features

### ⚡ Single Page Application (SPA)

* Seamless navigation without full page reloads.
* Built using the native **HTML5 History API (`pushState`)**.
* Fast and responsive user experience.

### 🎫 Dynamic Lazy-Loading Seat Grid

* Theater seats are generated dynamically by the backend on the first request.
* Reduces unnecessary database storage and initialization overhead.

### 🔒 Two-Phase Seat Locking

* Selected seats are temporarily reserved for **2 minutes**.
* Real-time countdown timer displayed on the frontend.
* Prevents seat conflicts during checkout.

### ♻️ Self-Healing Database Design

* Expired seat locks automatically become available again.
* No cron jobs or background cleanup services required.
* Uses SQL timestamp comparisons for lock expiration management.

### 🛡️ Connection Pool Armor

* Tuned PostgreSQL connection pool settings.
* Handles Neon DB Scale-to-Zero wake-up delays gracefully.
* Prevents server crashes caused by dropped connections.

### 🔄 Recursive Auto-Retry Fallback

* Frontend automatically retries failed API requests caused by cold starts.
* Eliminates unnecessary user-facing errors during database wake-up periods.

---

## 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3

  * Custom Variables
  * Light/Dark Themes
  * Animations
* Vanilla JavaScript (ES6+)

  * Async/Await
  * DOM Manipulation
  * Fetch API

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL
* Neon Serverless Database
* Native `pg` Connection Pool

---

# 📐 System Architecture

```text
+-----------------------------------------------------------------+
|                          CLIENT TIER                            |
|                         (Web Browser)                           |
|                                                                 |
|  [ index.html ] <--> [ style.css ] <--> [ script.js ]           |
|  (SPA Layout)        (Glassmorphism UI) (DOM Logic, State, API) |
+-----------------------------------------------------------------+
                               |
                               | REST API (JSON Data)
                               v
+-----------------------------------------------------------------+
|                       APPLICATION TIER                          |
|                    (Node.js + Express.js)                       |
|                                                                 |
|  [ Process Armor ]   -> process.on('uncaughtException') catches |
|                         dropped sockets to prevent server crash |
|                                                                 |
|  [ Pool Armor ]      -> max: 10 connections, error listeners    |
+-----------------------------------------------------------------+
                               |
                               | TCP/IP (Atomic SQL Queries)
                               v
+-----------------------------------------------------------------+
|                          DATA TIER                              |
|                    (PostgreSQL / Neon DB)                       |
|                                                                 |
|  +-----------------+   +-----------------------------------+    |
|  |     movies      |   |            show_seats             |    |
|  |   Static Data   |   | Dynamic Pessimistic Row Locks     |    |
|  +-----------------+   +-----------------------------------+    |
+-----------------------------------------------------------------+
```

---

# 📊 Database Schema

## 1. Movies Table

Stores the static movie catalog used by the frontend dashboard.

```sql
CREATE TABLE IF NOT EXISTS movies (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(255),
    duration VARCHAR(50),
    image VARCHAR(500),
    description TEXT,
    rating VARCHAR(20),
    votes VARCHAR(50),
    tags VARCHAR(255)
);
```

---

## 2. Show Seats Table

Tracks seat availability, lock ownership, and booking state.

```sql
CREATE TABLE IF NOT EXISTS show_seats (
    id SERIAL PRIMARY KEY,
    show_id VARCHAR(100) NOT NULL,
    seat_id VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    locked_by VARCHAR(100),
    lock_expires_at TIMESTAMP,
    UNIQUE(show_id, seat_id)
);
```

### Performance Index

```sql
CREATE INDEX IF NOT EXISTS idx_show_status
ON show_seats(show_id, status);
```

---

# 🛡️ Concurrency & Engineering Optimizations

## The Deadlock Dilemma

Traditional ticketing systems often use:

```sql
BEGIN;
SELECT ...
UPDATE ...
COMMIT;
```

Under high traffic, these multi-step transactions keep cloud database connections occupied longer than necessary, increasing contention and risking deadlocks.

---

## The Atomic Locking Solution

CinePass eliminates transaction overhead by using a single atomic SQL operation.

```sql
UPDATE show_seats
SET status = 'locked',
    locked_by = $3,
    lock_expires_at = NOW() + INTERVAL '2 minutes'
WHERE show_id = $1
  AND seat_id = ANY($2)
  AND (
        status = 'available'
        OR (
            status = 'locked'
            AND lock_expires_at < NOW()
        )
      )
RETURNING seat_id;
```

### Benefits

* Atomic execution
* No race conditions
* No double booking
* Minimal lock duration
* Scales efficiently on free-tier infrastructure

---

## 🌍 Geographical Data Isolation

To ensure theaters in different cities never interfere with each other, CinePass generates a unique composite identifier for every show.

```javascript
const currentShowId =
`${activeMovie.id}-${selectedCity}-${activeTheater}-${activeTime}`;
```

### Example

```text
avengers-mumbai-pvr-lowerparel-7pm
avengers-delhi-pvr-saket-7pm
```

This guarantees complete row isolation between separate locations and showtimes.

---

# 🔧 Installation & Setup

## 1. Clone Repository

```bash
git clone https://github.com/your-username/cinepass-backend.git
cd cinepass-backend
```

---

## 2. Install Dependencies

```bash
npm install express cors pg dotenv
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://your_user:your_password@your_host/neondb?sslmode=require&uselibpqcompat=true&connect_timeout=15

PORT=5000
```

---

## 4. Database Setup

Execute the schema creation scripts and seed the movie catalog.

```sql
-- Run Movies Table Schema
-- Run Show Seats Table Schema
-- Insert Movie Seed Data
```

---

## 5. Start the Server

```bash
node server.js
```

Server will start on:

```text
http://localhost:5000
```

Open `index.html` in any modern browser to initialize the frontend booking experience.

---

# ⚙️ Reliability Features

### Process Armor

```javascript
process.on('uncaughtException', (err) => {
    console.error(err);
});
```

Protects the Node.js process from unexpected socket termination events.

### Pool Armor

```javascript
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
});
```

Handles Neon free-tier scale-to-zero behavior safely.

### Frontend Auto-Retry

```javascript
async function fetchWithRetry(url, retries = 3) {
    try {
        return await fetch(url);
    } catch (err) {
        if (retries > 0) {
            return fetchWithRetry(url, retries - 1);
        }
        throw err;
    }
}
```

Provides resilience against temporary database wake-up delays.

---

# 🎯 Project Goals

* Demonstrate enterprise-grade concurrency control.
* Prevent double bookings under simultaneous requests.
* Operate efficiently on free-tier cloud infrastructure.
* Showcase backend optimization techniques using PostgreSQL and Node.js.
* Build a production-style ticketing workflow without third-party frameworks.

---

# 📄 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

Built as a high-concurrency system design and backend engineering showcase project focused on:

* Atomic Database Operations
* Concurrency Control
* PostgreSQL Optimization
* Node.js Performance Engineering
* Cloud Resource Efficiency
