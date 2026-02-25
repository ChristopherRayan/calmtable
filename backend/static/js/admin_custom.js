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

  function pollNotificationBadge() {
    if (document.getElementById("admin-notif-link")) {
      return;
    }

    var navbar = document.querySelector(".navbar-nav.ml-auto") || document.querySelector(".navbar-nav");
    if (!navbar) {
      return;
    }

    var item = document.createElement("li");
    item.className = "nav-item";
    item.innerHTML =
      '<a id="admin-notif-link" class="nav-link" href="/admin/api/adminnotification/" title="Notifications" style="position:relative;padding-right:18px">' +
      '<i class="fas fa-bell" style="font-size:16px"></i>' +
      '<span id="admin-notif-badge" style="position:absolute;top:6px;right:2px;background:#E07065;color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;opacity:0;transform:scale(0);transition:opacity .2s,transform .3s">0</span>' +
      "</a>";
    navbar.prepend(item);

    function updateBadge(count) {
      var badge = document.getElementById("admin-notif-badge");
      if (!badge) {
        return;
      }
      if (count > 0) {
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.style.opacity = "1";
        badge.style.transform = "scale(1)";
      } else {
        badge.style.opacity = "0";
        badge.style.transform = "scale(0)";
      }
    }

    function fetchCount() {
      fetch("/api/notifications/unread-count/", { credentials: "include" })
        .then(function (response) {
          if (!response.ok) {
            return { count: 0 };
          }
          return response.json();
        })
        .then(function (data) {
          updateBadge(Number(data.count || 0));
        })
        .catch(function () {});
    }

    fetchCount();
    window.setInterval(fetchCount, 30000);
  }

  function enableAutoRefresh() {
    window.setInterval(function () {
      if (document.hasFocus()) {
        window.location.reload();
      }
    }, 5 * 60 * 1000);
  }

  function initJazzminTabFallback() {
    var tabList = document.getElementById("jazzy-tabs");
    if (!tabList) {
      return;
    }

    var links = Array.prototype.slice.call(tabList.querySelectorAll('a.nav-link[href^="#"]'));
    if (!links.length) {
      return;
    }

    function activate(targetId) {
      if (!targetId) {
        return;
      }
      var targetPane = document.querySelector(targetId);
      if (!targetPane) {
        return;
      }

      links.forEach(function (link) {
        var isActive = link.getAttribute("href") === targetId;
        link.classList.toggle("active", isActive);
        link.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      var panes = Array.prototype.slice.call(document.querySelectorAll(".tab-content .tab-pane"));
      panes.forEach(function (pane) {
        var match = "#" + pane.id === targetId;
        pane.classList.toggle("active", match);
        pane.classList.toggle("show", match);
      });
    }

    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        var href = link.getAttribute("href");
        if (!href || href === "#") {
          return;
        }
        event.preventDefault();
        activate(href);
      });
    });
  }

  function boot() {
    initMonthlyChart();
    attachLiveClock();
    pollNotificationBadge();
    initJazzminTabFallback();
    enableAutoRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
