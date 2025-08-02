const toggleButton = document.querySelector('.dark-light');
var isButtonPressed = false;
var usdtSelected = false;

(async function () {
  const second = 1000,
        minute = second * 60,
        hour = minute * 60,
        day = hour * 24;

  const countdownEl = document.getElementById("countdown");

  async function fetchPresaleTime() {
    try {
      const response = await fetch('https://funs-coin-timer-dashboard-backend.vercel.app/api/presale');
      const data = await response.json();
      return new Date(data.presaleEndTime).getTime();
    } catch (error) {
      console.error('Error fetching presale time:', error);
      return new Date("Jan 14, 2025 16:00:00").getTime(); // Fallback
    }
  }

  function showCountdown(distance) {
    document.getElementById("days").innerText = Math.floor(distance / day);
    document.getElementById("hours").innerText = Math.floor((distance % day) / hour);
    document.getElementById("minutes").innerText = Math.floor((distance % hour) / minute);
    document.getElementById("seconds").innerText = Math.floor((distance % minute) / second);
  }

  function showSaleEnded() {
    // document.getElementById("countdown-headline").innerText = "The Sale has now Started!";
    // countdownEl.style.display = "none";
    // document.getElementById("ctd-end-content").style.display = "block";
  }

  async function startCountdown() {
    const countDownDate = await fetchPresaleTime();

    const x = setInterval(function() {
      const now = new Date().getTime();
      const distance = countDownDate - now;

      if (distance < 0) {
        showSaleEnded();
        clearInterval(x);
      } else {
        showCountdown(distance);
      }
    }, second);
  }

  startCountdown();
})();