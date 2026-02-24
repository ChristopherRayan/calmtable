/* Render admin analytics charts on Django admin index. */
(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-MW", {
      style: "currency",
      currency: "MWK",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function formatCount(value) {
    return new Intl.NumberFormat("en-MW").format(value || 0);
  }

  function drawLineChart(svgId, series, valueKey, strokeColor, fillColor) {
    var svg = byId(svgId);
    if (!svg) return;

    if (!series || series.length === 0) {
      svg.innerHTML = '<text x="18" y="32" fill="var(--ct-text-dim)">No data available</text>';
      return;
    }

    var width = 600;
    var height = 220;
    var padding = 26;
    var chartWidth = width - padding * 2;
    var chartHeight = height - padding * 2;

    var maxValue = series.reduce(function (max, point) {
      var value = Number(point[valueKey]) || 0;
      return Math.max(max, value);
    }, 0);
    if (maxValue < 1) maxValue = 1;

    var points = series.map(function (point, index) {
      var x = padding + (chartWidth * index) / Math.max(series.length - 1, 1);
      var value = Number(point[valueKey]) || 0;
      var y = padding + chartHeight - (value / maxValue) * chartHeight;
      return { x: x, y: y, label: point.label, value: value };
    });

    var linePath = points
      .map(function (point, index) {
        return (index === 0 ? "M " : "L ") + point.x.toFixed(2) + " " + point.y.toFixed(2);
      })
      .join(" ");

    var areaPath =
      linePath +
      " L " +
      points[points.length - 1].x.toFixed(2) +
      " " +
      (height - padding).toFixed(2) +
      " L " +
      points[0].x.toFixed(2) +
      " " +
      (height - padding).toFixed(2) +
      " Z";

    var yGuides = [0.25, 0.5, 0.75, 1].map(function (factor) {
      var y = padding + chartHeight - chartHeight * factor;
      return '<line x1="' + padding + '" y1="' + y + '" x2="' + (width - padding) + '" y2="' + y + '" class="ct-grid-line" />';
    });

    var labels = points
      .filter(function (_, index) {
        return index % 3 === 0 || index === points.length - 1;
      })
      .map(function (point) {
        return (
          '<text x="' +
          point.x +
          '" y="' +
          (height - 6) +
          '" class="ct-axis-label" text-anchor="middle">' +
          point.label +
          "</text>"
        );
      });

    svg.innerHTML =
      yGuides.join("") +
      '<path d="' +
      areaPath +
      '" fill="' +
      fillColor +
      '" opacity="0.35"></path>' +
      '<path d="' +
      linePath +
      '" fill="none" stroke="' +
      strokeColor +
      '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>' +
      points
        .map(function (point) {
          return '<circle cx="' + point.x + '" cy="' + point.y + '" r="3.5" fill="' + strokeColor + '"></circle>';
        })
        .join("") +
      labels.join("");
  }

  function renderTopDishes(items) {
    var container = byId("ct-top-dishes-chart");
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<p class="ct-empty">No paid orders yet.</p>';
      return;
    }

    var maxQuantity = items.reduce(function (max, item) {
      return Math.max(max, Number(item.quantity) || 0);
    }, 1);

    container.innerHTML = items
      .map(function (item) {
        var quantity = Number(item.quantity) || 0;
        var widthPct = Math.max(8, Math.round((quantity / maxQuantity) * 100));
        return (
          '<div class="ct-bar-row">' +
          '<div class="ct-bar-meta"><span class="ct-bar-label">' +
          item.name +
          '</span><span class="ct-bar-value">' +
          formatCount(quantity) +
          "</span></div>" +
          '<div class="ct-bar-track"><div class="ct-bar-fill" style="width:' +
          widthPct +
          '%"></div></div>' +
          "</div>"
        );
      })
      .join("");
  }

  function renderStatusDonut(items) {
    var donut = byId("ct-status-donut");
    var legend = byId("ct-status-legend");
    if (!donut || !legend) return;

    if (!items || items.length === 0) {
      donut.style.background = "none";
      donut.innerHTML = '<span class="ct-empty">No data</span>';
      legend.innerHTML = "";
      return;
    }

    var palette = ["#5c4033", "#d2b48c", "#9e8c7a", "#6d4c41", "#3e2a1e"];
    var total = items.reduce(function (sum, item) {
      return sum + (Number(item.count) || 0);
    }, 0);
    if (total < 1) total = 1;

    var start = 0;
    var slices = items.map(function (item, index) {
      var count = Number(item.count) || 0;
      var pct = (count / total) * 100;
      var end = start + pct;
      var color = palette[index % palette.length];
      var slice = color + " " + start.toFixed(2) + "% " + end.toFixed(2) + "%";
      start = end;
      return { slice: slice, item: item, color: color };
    });

    donut.style.background = "conic-gradient(" + slices.map(function (s) { return s.slice; }).join(",") + ")";
    donut.innerHTML = '<span class="ct-donut-total">' + formatCount(total) + "</span>";

    legend.innerHTML = slices
      .map(function (entry) {
        return (
          '<li><span class="ct-legend-dot" style="background:' +
          entry.color +
          '"></span><span class="ct-legend-label">' +
          entry.item.status +
          '</span><span class="ct-legend-value">' +
          formatCount(entry.item.count) +
          "</span></li>"
        );
      })
      .join("");
  }

  function renderSummary(summary) {
    byId("ct-summary-reservations").textContent = formatCount(summary.todays_reservations);
    byId("ct-summary-revenue").textContent = formatCurrency(summary.total_revenue);
    byId("ct-summary-orders").textContent = formatCount(summary.total_orders);
    byId("ct-summary-paid-orders").textContent = formatCount(summary.paid_orders);
  }

  function renderAll(payload) {
    renderSummary(payload.summary || {});
    drawLineChart("ct-reservation-chart", payload.timeline || [], "reservations", "#5c4033", "#d2b48c");
    drawLineChart("ct-revenue-chart", payload.timeline || [], "revenue", "#6d4c41", "#d2b48c");
    renderTopDishes(payload.top_dishes || []);
    renderStatusDonut(payload.order_status || []);
  }

  function init() {
    var root = document.querySelector("[data-admin-analytics='true']");
    if (!root) return;

    var url = root.getAttribute("data-analytics-url");
    if (!url) return;

    fetch(url, { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load analytics");
        }
        return response.json();
      })
      .then(renderAll)
      .catch(function () {
        var summaryIds = [
          "ct-summary-reservations",
          "ct-summary-revenue",
          "ct-summary-orders",
          "ct-summary-paid-orders",
        ];
        summaryIds.forEach(function (id) {
          var element = byId(id);
          if (element) {
            element.textContent = "N/A";
          }
        });
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
