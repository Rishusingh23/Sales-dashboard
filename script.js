/* =========================================================
   SALES DASHBOARD — SCRIPT.JS
   All dashboard logic lives here: loading data, calculating
   KPIs, drawing charts, and handling search / filter / sort.
   ========================================================= */

/* ---------- 1. STATE ----------
   salesData: the full, untouched list loaded from sales.json
   currentSort: which column and direction the table is sorted by
   These are the only two "sources of truth" the whole app reads from. */
let salesData = [];
let dataLoaded = false;
let currentSort = { column: null, direction: "asc" };

/* Chart.js instances are stored so we can update them instead of
   creating duplicates every time a filter changes (performance). */
let monthlyChart = null;
let categoryChart = null;

/* ---------- 2. DOM REFERENCES ----------
   Grabbing every element once, instead of re-querying the DOM
   inside functions that run often (like filtering). */
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const dashboardContent = document.getElementById("dashboard-content");
const retryBtn = document.getElementById("retry-btn");

const kpiTotalSales = document.getElementById("kpi-total-sales");
const kpiTotalOrders = document.getElementById("kpi-total-orders");
const kpiAvgOrder = document.getElementById("kpi-avg-order");
const kpiTotalProducts = document.getElementById("kpi-total-products");

const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const statusFilter = document.getElementById("status-filter");
const clearFiltersBtn = document.getElementById("clear-filters-btn");

const tableBody = document.getElementById("sales-table-body");
const resultsCount = document.getElementById("results-count");
const emptyState = document.getElementById("empty-state");
const salesTable = document.getElementById("sales-table");
const navLinks = document.querySelectorAll(".nav-link");

/* ---------- 3. HELPERS ---------- */

// Format a number as Indian Rupees, e.g. 245800 -> "₹2,45,800"
function formatCurrency(amount) {
  return "\u20B9" + amount.toLocaleString("en-IN");
}

// Format a date string ("2026-01-05") into a readable form ("5 Jan 2026")
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Map a status string to the CSS class used for its badge
function statusBadgeClass(status) {
  switch (status) {
    case "Completed": return "status-badge--completed";
    case "Pending": return "status-badge--pending";
    case "Cancelled": return "status-badge--cancelled";
    default: return "";
  }
}

/* ---------- 4. LOADING DATA (async, with loading/error states) ---------- */

async function loadSalesData() {
  // Reset to the loading state every time we (re)try
  dataLoaded = false;
  loadingState.hidden = false;
  errorState.hidden = true;
  dashboardContent.hidden = true;
  emptyState.hidden = true;

  let data;
  try {
    const response = await fetch("./sales.json");

    if (!response.ok) {
      throw new Error("Network response was not OK");
    }

    data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Sales data is empty or invalid");
    }
  } catch (error) {
    // Failure: show a friendly error message, never a blank page
    console.error("Failed to load sales.json:", error);
    loadingState.hidden = true;
    errorState.hidden = false;
    return;
  }

  // Mark the data as loaded only after fetch and JSON parsing succeed.
  salesData = data;
  dataLoaded = true;

  // Render first; expose the dashboard only after all content is ready.
  renderKPIs(salesData);
  renderMonthlyChart(salesData);
  renderCategoryChart(salesData);
  applyFiltersAndRender();

  loadingState.hidden = true;
  errorState.hidden = true;
  dashboardContent.hidden = false;
}

/* ---------- 5. KPI CALCULATIONS ----------
   All four KPI cards are calculated here from salesData using
   reduce() / map() / a Set — nothing is hard-coded in the HTML. */

function renderKPIs(data) {
  // Only completed + pending orders count toward revenue; cancelled orders are excluded
  const revenueOrders = data.filter((sale) => sale.status !== "Cancelled");

  const totalSales = revenueOrders.reduce((sum, sale) => sum + sale.total, 0);
  const totalOrders = revenueOrders.length;
  const averageOrderValue = revenueOrders.length
    ? Math.round(totalSales / revenueOrders.length)
    : 0;

  // Total Products = number of DISTINCT product names, using a Set to de-duplicate
  const distinctProducts = new Set(data.map((sale) => sale.product));

  kpiTotalSales.textContent = formatCurrency(totalSales);
  kpiTotalOrders.textContent = totalOrders.toLocaleString("en-IN");
  kpiAvgOrder.textContent = formatCurrency(averageOrderValue);
  kpiTotalProducts.textContent = distinctProducts.size.toLocaleString("en-IN");
}

/* ---------- 6. CHARTS (Chart.js, loaded once) ---------- */

function renderMonthlyChart(data) {
  const monthLabels = ["January", "February", "March", "April", "May", "June"];

  // Sum totals per month using reduce(), skipping cancelled orders
  const monthlyTotals = new Array(6).fill(0);
  data.forEach((sale) => {
    if (sale.status === "Cancelled") return;
    const monthIndex = new Date(sale.date).getMonth(); // 0 = January
    if (monthIndex >= 0 && monthIndex < 6) {
      monthlyTotals[monthIndex] += sale.total;
    }
  });

  const ctx = document.getElementById("monthly-chart");

  if (monthlyChart) {
    // Update the existing chart instead of creating a new one (better performance)
    monthlyChart.data.datasets[0].data = monthlyTotals;
    monthlyChart.update();
    return;
  }

  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [{
        label: "Sales (₹)",
        data: monthlyTotals,
        backgroundColor: "#14213d",
        borderRadius: 6,
        maxBarThickness: 42,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => " " + formatCurrency(item.parsed.y),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => "\u20B9" + value.toLocaleString("en-IN") },
          grid: { color: "#e3e6ed" },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
}

function renderCategoryChart(data) {
  const categories = ["Electronics", "Fashion", "Home & Kitchen", "Sports", "Beauty"];
  const categoryColors = ["#14213d", "#c98a1f", "#2f6f4e", "#6a4aa8", "#b3261e"];

  // Sum totals per category using reduce(), skipping cancelled orders
  const categoryTotals = categories.map((category) =>
    data
      .filter((sale) => sale.category === category && sale.status !== "Cancelled")
      .reduce((sum, sale) => sum + sale.total, 0)
  );

  const ctx = document.getElementById("category-chart");

  if (categoryChart) {
    categoryChart.data.datasets[0].data = categoryTotals;
    categoryChart.update();
    return;
  }

  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: categories,
      datasets: [{
        data: categoryTotals,
        backgroundColor: categoryColors,
        borderWidth: 2,
        borderColor: "#ffffff",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 14, boxWidth: 12, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.label}: ${formatCurrency(item.parsed)}`,
          },
        },
      },
    },
  });
}

/* ---------- 7. SEARCH + FILTER + SORT ----------
   One function reads the current search box / dropdown / sort
   state and produces the list of rows that should be shown.
   This keeps filtering logic in a single place (no duplicate code). */

function getFilteredAndSortedData() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const status = statusFilter.value;

  let result = salesData.filter((sale) => {
    const matchesSearch =
      searchTerm === "" ||
      sale.product.toLowerCase().includes(searchTerm) ||
      sale.customer.toLowerCase().includes(searchTerm) ||
      sale.category.toLowerCase().includes(searchTerm);

    const matchesCategory = category === "all" || sale.category === category;
    const matchesStatus = status === "all" || sale.status === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (currentSort.column) {
    const column = currentSort.column;
    const direction = currentSort.direction === "asc" ? 1 : -1;

    result = [...result].sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];

      if (column === "date") {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      if (typeof valueA === "string") {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }

  return result;
}

/* ---------- 8. TABLE RENDERING ----------
   The table body is rebuilt from scratch each time using one
   string join (fast — a single DOM write instead of many). */

function renderTable(rows) {
  resultsCount.textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;

  if (!dataLoaded || rows.length === 0) {
    tableBody.innerHTML = "";
    salesTable.hidden = true;
    emptyState.hidden = !dataLoaded;
    return;
  }

  salesTable.hidden = false;
  emptyState.hidden = true;

  tableBody.innerHTML = rows
    .map((sale) => `
      <tr>
        <td>${sale.id}</td>
        <td>${formatDate(sale.date)}</td>
        <td>${sale.product}</td>
        <td>${sale.category}</td>
        <td>${sale.customer}</td>
        <td>${sale.quantity}</td>
        <td>${formatCurrency(sale.price)}</td>
        <td class="cell-total">${formatCurrency(sale.total)}</td>
        <td>
          <span class="status-badge ${statusBadgeClass(sale.status)}">
            <span class="status-dot" aria-hidden="true"></span>${sale.status}
          </span>
        </td>
      </tr>
    `)
    .join("");
}

// Runs the full search -> filter -> sort -> render pipeline
function applyFiltersAndRender() {
  const rows = getFilteredAndSortedData();
  renderTable(rows);
}

/* ---------- 9. SORT INDICATORS ---------- */

function updateSortIndicators() {
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    const indicator = th.querySelector(".sort-indicator");
    const column = th.dataset.sort;

    if (column === currentSort.column) {
      indicator.textContent = currentSort.direction === "asc" ? "\u2191" : "\u2193";
      th.querySelector(".sort-btn").setAttribute(
        "aria-label",
        `Sort by ${column}, currently ${currentSort.direction === "asc" ? "ascending" : "descending"}`
      );
    } else {
      indicator.textContent = "";
      th.querySelector(".sort-btn").removeAttribute("aria-label");
    }
  });
}

/* ---------- 10. EVENT LISTENERS ---------- */

// Search box: update instantly as the user types
searchInput.addEventListener("input", applyFiltersAndRender);

// Category and status dropdowns
categoryFilter.addEventListener("change", applyFiltersAndRender);
statusFilter.addEventListener("change", applyFiltersAndRender);

// Clear Filters button: reset search, dropdowns, and sorting
clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "all";
  statusFilter.value = "all";
  currentSort = { column: null, direction: "asc" };
  updateSortIndicators();
  applyFiltersAndRender();
  searchInput.focus();
});

// Retry button on the error screen
retryBtn.addEventListener("click", loadSalesData);

// Sorting: one event-delegated listener on the table head, instead of
// attaching a separate listener to every single header button.
document.querySelector("thead").addEventListener("click", (event) => {
  const button = event.target.closest(".sort-btn");
  if (!button) return;

  const th = button.closest("th[data-sort]");
  if (!th) return;

  const column = th.dataset.sort;

  if (currentSort.column === column) {
    // Same column clicked again: flip the direction
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    // New column: default to ascending
    currentSort = { column, direction: "asc" };
  }

  updateSortIndicators();
  applyFiltersAndRender();
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.forEach((navLink) => {
      const isActive = navLink === link;
      navLink.classList.toggle("is-active", isActive);
      if (isActive) {
        navLink.setAttribute("aria-current", "page");
      } else {
        navLink.removeAttribute("aria-current");
      }
    });
  });
});

/* ---------- 11. START ---------- */
loadSalesData();