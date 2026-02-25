/* Custom admin behaviors: Chart.js init, live clock, and periodic refresh. */
(function () {
  function parseAnalyticsData() {
    var node = document.getElementById("ct-admin-analytics-data");
    if (!node) {
      return null;
    }

    try {
      return JSON.parse(node.textContent || "{}");
    } catch (_error) {
      return null;
    }
  }

  function initMonthlyChart() {
    var canvas = document.getElementById("ct-monthly-trends");
    if (!canvas || typeof Chart === "undefined") {
      return;
    }

    var payload = parseAnalyticsData();
    if (!payload || !payload.labels || !payload.datasets) {
      return;
    }

    new Chart(canvas, {
      type: "line",
      data: {
        labels: payload.labels,
        datasets: payload.datasets.map(function (dataset) {
          return {
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.borderColor,
            backgroundColor: dataset.backgroundColor,
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: "easeOutCubic",
        },
        plugins: {
          legend: {
            labels: {
              color: "#eef2f5",
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "rgba(238,242,245,0.75)" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
          y: {
            ticks: { color: "rgba(238,242,245,0.75)" },
            grid: { color: "rgba(255,255,255,0.08)" },
            beginAtZero: true,
          },
        },
      },
    });
  }

  function attachLiveClock() {
    var navbar = document.querySelector(".main-header .navbar-nav.ml-auto");
    if (!navbar || document.getElementById("ct-live-clock")) {
      return;
    }

    var item = document.createElement("li");
    item.className = "nav-item";
    item.style.marginLeft = "10px";

    var clock = document.createElement("span");
    clock.id = "ct-live-clock";
    clock.style.display = "inline-flex";
    clock.style.alignItems = "center";
    clock.style.padding = "6px 10px";
    clock.style.borderRadius = "999px";
    clock.style.background = "rgba(255,255,255,0.08)";
    clock.style.color = "#e5e7eb";
    clock.style.fontSize = "12px";
    clock.style.fontWeight = "600";
    clock.style.letterSpacing = "0.04em";
    item.appendChild(clock);
    navbar.appendChild(item);

    function updateClock() {
      var now = new Date();
      clock.textContent = now.toLocaleString("en-MW", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }

    updateClock();
    window.setInterval(updateClock, 1000);
  }

  function enableAutoRefresh() {
    window.setInterval(function () {
      if (document.hasFocus()) {
        window.location.reload();
      }
    }, 5 * 60 * 1000);
  }

  function boot() {
    initMonthlyChart();
    attachLiveClock();
    enableAutoRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
