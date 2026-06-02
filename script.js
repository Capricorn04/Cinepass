let MOVIES = [];

const THEATERS = [
    { name: "Cinepolis: Nexus Seawoods", times: ["08:45 AM", "11:40 AM", "05:50 PM"] },
    { name: "INOX: R-City, Ghatkopar", times: ["10:45 AM", "04:20 PM", "10:20 PM"] }
];

let activeMovie = null;
let activeTheater = null;
let activeTime = null;
let maxTicketsAllowed = 0;
let tempQuantity = 0;
let selectedSeats = [];
let serverSeats = [];

// CRITICAL: Track the city to prevent cross-city clashing
let selectedCity = 'Hyderabad'; 

let currentTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.getElementById('theme-toggle').innerHTML = currentTheme === 'light' ? '<span class="icon">🌙</span>' : '<span class="icon">☀️</span>';
    
    fetchMoviesFromDB(); 
    renderDates();
    renderQuantities();
});

// --- API FETCH ---
// --- API FETCH (WITH AUTO-RETRY) ---
async function fetchMoviesFromDB(retries = 2) {
    const list = document.getElementById("movie-list");
    
    // Show the loading animation
    if (retries === 2) {
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 40px; display: inline-block; animation: pulse 1.5s infinite;">🍿</div>
                <h3 style="margin-top: 15px; color: var(--text-primary);">Waking up database servers...</h3>
                <p style="color: var(--text-secondary); font-size: 14px; margin-top: 5px;">This may take a few seconds.</p>
            </div>
        `;
    }

    try {
        const res = await fetch('http://localhost:5000/api/movies');
        const data = await res.json();
        
        if (data.success) {
            MOVIES = data.movies;
            renderMovies(); 
        } else {
            throw new Error("Backend returned false success flag.");
        }
    } catch (err) {
        console.warn(`Fetch failed. Retries left: ${retries}. Error:`, err);
        
        if (retries > 0) {
            // Wait 3 seconds, then try again automatically
            setTimeout(() => {
                fetchMoviesFromDB(retries - 1);
            }, 3000);
        } else {
            // We are out of retries, show the error
            list.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #e11d48;'>Error: Server is still asleep or unreachable. Please refresh the page.</p>";
        }
    }
}

// --- THEME & CITY MODAL ---
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.getElementById('theme-toggle').innerHTML = currentTheme === 'light' ? '<span class="icon">🌙</span>' : '<span class="icon">☀️</span>';
}

function openCityModal() {
    document.getElementById("city-modal-overlay").classList.remove("hidden");
}

function closeCityModal(event) {
    if (event.target.id === "city-modal-overlay") {
        document.getElementById("city-modal-overlay").classList.add("hidden");
    }
}

// CRITICAL: Update the selectedCity variable when a user picks a city
function selectCity(city) {
    selectedCity = city; 
    document.getElementById("city-btn").innerHTML = `${city} <span class="arrow">▼</span>`;
    document.getElementById("city-modal-overlay").classList.add("hidden");
}

function filterCities() {
    const query = document.getElementById("city-search-input").value.toLowerCase();
    const cities = document.querySelectorAll(".city-item");
    
    cities.forEach(city => {
        const cityName = city.innerText.toLowerCase();
        if (cityName.includes(query)) {
            city.style.display = "";
        } else {
            city.style.display = "none";
        }
    });
}

// --- RENDERERS ---
function renderMovies() {
    const list = document.getElementById("movie-list");
    list.innerHTML = "";
    MOVIES.forEach(movie => {
        const div = document.createElement("div");
        div.className = "movie-card";
        div.onclick = () => openMovieBanner(movie);
        div.innerHTML = `<img src="${movie.image}"><h3>${movie.title}</h3><p>${movie.genre}</p>`;
        list.appendChild(div);
    });
}

function renderDates() {
    const dateList = document.getElementById("date-list");
    const today = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    
    for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const btn = document.createElement("button");
        btn.className = i === 0 ? "date-btn active" : "date-btn";
        btn.innerHTML = `
            <div class="month">${months[d.getMonth()]}</div>
            <div class="day">${String(d.getDate()).padStart(2, '0')}</div>
        `;
        btn.onclick = () => {
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        dateList.appendChild(btn);
    }
}

function renderTheaters() {
    const list = document.getElementById("theater-list");
    list.innerHTML = "";
    THEATERS.forEach(theater => {
        const row = document.createElement("div");
        row.className = "theater-row";
        let timesHTML = theater.times.map(t => `
            <div class="time-btn-container">
                <button class="time-btn" onclick="openQtyModal('${theater.name}', '${t}')">${t}</button>
                <span class="cancellation-text">Cancellation available</span>
            </div>
        `).join('');
        row.innerHTML = `<div class="theater-info">${theater.name}</div><div class="showtimes">${timesHTML}</div>`;
        list.appendChild(row);
    });
}

function renderQuantities() {
    const list = document.getElementById("qty-list");
    list.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement("button");
        btn.className = "qty-btn";
        btn.innerText = i;
        btn.onclick = () => {
            document.querySelectorAll('.qty-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tempQuantity = i;
            document.getElementById("confirm-qty-btn").disabled = false;
            
            const illustration = document.getElementById('qty-illustration');
            if(i <= 2) illustration.innerText = "🛵";
            else if(i <= 4) illustration.innerText = "🍿";
            else if(i <= 7) illustration.innerText = "🚗";
            else illustration.innerText = "🚌";
        };
        list.appendChild(btn);
    }
}

// --- NAVIGATION ---
history.replaceState({ view: 'home-view' }, '', '');

window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view) {
        hideAllViews();
        document.getElementById(event.state.view).classList.remove("hidden");
    } else {
        goHome(false);
    }
});

function hideAllViews() { 
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden')); 
}

function goHome(pushHistory = true) { 
    hideAllViews(); 
    document.getElementById("home-view").classList.remove("hidden"); 
    if (pushHistory) history.pushState({ view: 'home-view' }, '', '#home');
}

function openMovieBanner(movie) {
    activeMovie = movie;
    hideAllViews();
    document.getElementById("movie-detail-view").classList.remove("hidden");
    history.pushState({ view: 'movie-detail-view' }, '', `#movie-${movie.id}`);
    
    document.getElementById("hero-title").innerText = movie.title;
    document.getElementById("hero-rating").innerText = movie.rating;
    document.getElementById("hero-votes").innerText = movie.votes;
    document.getElementById("hero-duration-genre").innerText = `${movie.duration} • ${movie.genre} • UA13+`;
    document.getElementById("hero-desc").innerText = movie.description;
    document.getElementById("hero-poster").src = movie.image;
    document.getElementById("hero-bg-img").style.backgroundImage = `url(${movie.image})`;
    document.getElementById("hero-tags").innerText = movie.tags;
}

function openTheaterList() {
    hideAllViews();
    document.getElementById("theater-list-view").classList.remove("hidden");
    history.pushState({ view: 'theater-list-view' }, '', `#theaters`);
    
    document.getElementById("theater-movie-title").innerText = activeMovie.title;
    renderTheaters();
}

function openQtyModal(theater, time) {
    activeTheater = theater;
    activeTime = time;
    document.getElementById("qty-modal-overlay").classList.remove("hidden");
    document.getElementById("confirm-qty-btn").disabled = true;
    document.querySelectorAll('.qty-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('qty-illustration').innerText = "🍿";
}

function closeQtyModal() { 
    document.getElementById("qty-modal-overlay").classList.add("hidden"); 
}

async function confirmQuantity() {
    maxTicketsAllowed = tempQuantity;
    selectedSeats = [];
    closeQtyModal();
    
    hideAllViews();
    document.getElementById("seat-map-view").classList.remove("hidden");
    history.pushState({ view: 'seat-map-view' }, '', `#seats`);
    
    document.getElementById("seat-movie-title").innerText = activeMovie.title;
    document.getElementById("seat-theater-info").innerText = `${activeTheater} | Today, ${activeTime}`;
    
    // CRITICAL: Includes selectedCity to isolate database rows!
    const currentShowId = `${activeMovie.id}-${selectedCity}-${activeTheater}-${activeTime}`;
    
    await fetchSeatsFromDB(currentShowId);
    renderSeats();
    updateCheckout();
}

function backToTheaters() { 
    history.back(); 
}

// --- SEAT LOGIC ---
async function fetchSeatsFromDB(showId) {
    try {
        const res = await fetch(`http://localhost:5000/api/seats/${showId}`);
        const data = await res.json();
        
        if (data.success) {
            serverSeats = data.seats.map(s => {
                if (s.status === 'aisle') return { id: s.seat_id, isAisle: true };
                
                const row = s.seat_id.charAt(0);
                const number = parseInt(s.seat_id.substring(1));
                
                let uiStatus = s.status;
                if (s.status === 'locked') {
                    uiStatus = 'booked';
                }
                
                return { id: s.seat_id, row, number, status: uiStatus, isAisle: false };
            });
        }
    } catch (err) {
        console.error("Failed to fetch seats from DB", err);
    }
}

function renderSeats() {
    const layout = document.querySelector(".theater-layout");
    layout.innerHTML = "";
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    
    rows.forEach(rowLabel => {
        const rowWrapper = document.createElement("div");
        rowWrapper.className = "seat-row-wrapper";
        
        const labelStr = document.createElement("div");
        labelStr.className = "row-label";
        labelStr.innerText = rowLabel;
        rowWrapper.appendChild(labelStr);
        
        const grid = document.createElement("div");
        grid.className = "seat-grid";
        
        const rowSeats = serverSeats.filter(s => s.id.includes(rowLabel) || (s.isAisle && s.id.includes(`-${rowLabel}-`)));
        
        rowSeats.sort((a, b) => {
            const getCol = (seat) => seat.isAisle ? parseInt(seat.id.split('-')[2]) : seat.number;
            return getCol(a) - getCol(b);
        });
        
        rowSeats.forEach(seat => {
            const div = document.createElement("div");
            if (seat.isAisle) {
                div.className = "seat invisible";
            } else {
                div.innerText = seat.number;
                let classes = `seat ${seat.status}`;
                if (selectedSeats.includes(seat.id)) classes += " selected";
                div.className = classes;
                div.onclick = () => toggleSeat(seat);
            }
            grid.appendChild(div);
        });
        
        rowWrapper.appendChild(grid);
        layout.appendChild(rowWrapper);
    });
}

function toggleSeat(seat) {
    if (seat.status !== "available" || seat.isAisle) return;
    const index = selectedSeats.indexOf(seat.id);
    
    if (index > -1) {
        selectedSeats.splice(index, 1);
    } else {
        if (selectedSeats.length >= maxTicketsAllowed) selectedSeats.shift();
        selectedSeats.push(seat.id);
    }
    renderSeats();
    updateCheckout();
}

function updateCheckout() {
    const btn = document.getElementById("checkout-btn");
    const display = document.getElementById("selected-count-display");
    const priceDisplay = document.getElementById("price-display");
    
    const count = selectedSeats.length;
    display.innerText = `${count} Ticket${count !== 1 ? 's' : ''}`;
    priceDisplay.innerText = `₹${count * 300}`;
    
    if(count === maxTicketsAllowed) {
        btn.disabled = false;
        btn.innerText = `Pay ₹${count * 300}`;
    } else {
        btn.disabled = true;
        btn.innerText = "Select Seats";
    }
}

// --- TWO-PHASE CHECKOUT LOGIC ---
let checkoutTimer = null;
let activeUserId = null; 

async function simulateCheckout() {
    const btn = document.getElementById("checkout-btn");
    btn.innerText = "Holding Seats...";
    btn.disabled = true;

    // CRITICAL: Includes selectedCity!
    const currentShowId = `${activeMovie.id}-${selectedCity}-${activeTheater}-${activeTime}`;

    try {
        const response = await fetch('http://localhost:5000/api/hold-seats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ show_id: currentShowId, seat_ids: selectedSeats })
        });

        const data = await response.json();

        if (data.success) {
            activeUserId = data.user_id; 
            
            hideAllViews();
            document.getElementById("checkout-view").classList.remove("hidden");
            history.pushState({ view: 'checkout-view' }, '', `#checkout`);
            
            const totalPrice = selectedSeats.length * 300;
            document.getElementById("checkout-final-price").innerText = totalPrice;
            document.getElementById("summary-movie-title").innerText = activeMovie.title;
            document.getElementById("summary-details").innerText = `${activeTheater} | Today, ${activeTime}`;
            document.getElementById("summary-seats").innerText = selectedSeats.join(", ");
            document.getElementById("summary-total-price").innerText = `₹${totalPrice}`;
            
            startTimer(2 * 60); // 2 Minute Timer
        } else {
            alert(`❌ Booking Failed:\n${data.message}`);
            btn.innerText = `Pay ₹${selectedSeats.length * 300}`;
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Server error. Ensure your backend is running.");
        btn.innerText = `Pay ₹${selectedSeats.length * 300}`;
        btn.disabled = false;
    }
}

function startTimer(durationInSeconds) {
    let timer = durationInSeconds;
    const display = document.getElementById('countdown-timer');
    
    clearInterval(checkoutTimer);
    checkoutTimer = setInterval(() => {
        let minutes = parseInt(timer / 60, 10);
        let seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(checkoutTimer);
            alert("⏳ Session Expired! Your seats have been released. Please try again.");
            goHome(); 
        }
    }, 1000);
}

async function processPayment(event) {
    event.preventDefault(); 
    
    const btn = document.getElementById("pay-now-btn");
    btn.innerText = "Processing Payment...";
    btn.disabled = true;

    // CRITICAL: Includes selectedCity!
    const currentShowId = `${activeMovie.id}-${selectedCity}-${activeTheater}-${activeTime}`;

    try {
        const response = await fetch('http://localhost:5000/api/book-seats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                show_id: currentShowId, 
                seat_ids: selectedSeats,
                user_id: activeUserId 
            })
        });

        const data = await response.json();

        if (data.success) {
            clearInterval(checkoutTimer); 
            
            hideAllViews();
            document.getElementById("ticket-view").classList.remove("hidden");
            history.pushState({ view: 'ticket-view' }, '', `#ticket`);
            
            document.getElementById("ticket-poster").src = activeMovie.image;
            document.getElementById("ticket-movie-title").innerText = activeMovie.title;
            document.getElementById("ticket-theater").innerText = activeTheater;
            document.getElementById("ticket-time").innerText = `Today, ${activeTime}`;
            document.getElementById("ticket-seats").innerText = selectedSeats.join(", ");
            document.getElementById("ticket-price").innerText = `₹${selectedSeats.length * 300}`;
            
            const randomId = "BMS" + Math.floor(100000 + Math.random() * 900000);
            document.getElementById("booking-id").innerText = randomId;
        } else {
            clearInterval(checkoutTimer);
            alert(`❌ Payment Failed:\n${data.message}`);
            goHome(); 
        }

    } catch (error) {
        console.error("Error:", error);
        alert("Payment Gateway Error. Please try again.");
        btn.innerText = `Pay ₹${selectedSeats.length * 300}`;
        btn.disabled = false;
    }
}