# Sales Dashboard

A responsive, accessible sales dashboard built with plain HTML, CSS and JavaScript. It loads sales records from a local JSON file and lets you explore them through KPI cards, charts, search, filters, and a sortable table.

**Internship assignment:** Week 5 — Final Project Integration: Mini Web Application

## Description

Sales Dashboard is a single-page web app for a fictional retail business. It reads 28 sample orders from `sales.json` and calculates every number shown on the page — total sales, order counts, monthly trends, category breakdowns — directly in JavaScript. Nothing is hard-coded. Managers can search, filter, and sort the order table to find exactly what they need.

## Features

- **KPI cards** — Total Sales, Total Orders, Average Order Value, Total Products, all calculated dynamically from the JSON data. Cancelled orders are excluded from sales, order count, and average order value; distinct products include every record.
- **Two charts (Chart.js)** — a bar chart of monthly sales performance (Jan–Jun) and a doughnut chart of sales by category
- **Recent Sales table** — built entirely with JavaScript from the JSON data, never hand-written in HTML
- **Live search** — filters by product, customer, or category as you type
- **Category filter** and **status filter** (Completed / Pending / Cancelled), combinable with search
- **Sortable columns** — click any of ID, Date, Product, Quantity, or Total to sort; click again to reverse the direction, shown with an arrow indicator
- **Clear Filters button** — resets search, both dropdowns, and sorting in one click
- **Loading, error, and empty states** — a spinner while data loads, a friendly message with a Retry button if `sales.json` fails to load, and a "No sales records found" message when a search/filter has no matches
- **Single-page navigation** — Dashboard, Sales, Products, and Reports links scroll to the corresponding dashboard sections and keep the active state synchronized.
- **Fully responsive** — sidebar navigation collapses to a horizontal top bar on mobile, KPI cards reflow, and the table scrolls horizontally instead of breaking the layout
- **Accessible by design** — semantic landmarks, a skip link, labelled form controls, ARIA labels on interactive elements, visible keyboard focus states, and status badges that use an icon-and-text pattern (not color alone)

## Technologies Used

- HTML5 (semantic markup)
- CSS3 (custom properties, Flexbox, Grid, media queries — no framework)
- Vanilla JavaScript (ES6+: `fetch`, `map`, `filter`, `reduce`, `sort`)
- JSON (static data file)
- [Chart.js](https://www.chartjs.org/) via CDN (loaded once, used for both charts)

No React, Angular, Vue, Bootstrap, Tailwind, backend, or database is used.

## Project Structure

```
sales-dashboard/
│
├── index.html      Page structure and semantic markup
├── style.css        All styling, organized into clearly commented sections
├── script.js         All logic: data loading, calculations, charts, search/filter/sort
├── sales.json        28 sample sales records (the only data source)
└── README.md        This file
```

## How to Run the Project

Because the app loads `sales.json` with `fetch()`, it needs to be served over HTTP — opening `index.html` directly by double-clicking it (as a `file://` URL) will block the fetch in most browsers.

**Option 1 — VS Code Live Server**
1. Open the `sales-dashboard` folder in VS Code.
2. Install the "Live Server" extension if you don't have it.
3. Right-click `index.html` → "Open with Live Server".

**Option 2 — Python's built-in server**
```bash
cd sales-dashboard
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Option 3 — Node's `http-server`**
```bash
cd sales-dashboard
npx http-server -p 8000
```

## Accessibility Features

- Semantic HTML5 landmarks: `<header>`, `<nav>`, `<main>`, `<section>`
- A single `<h1>` followed by a logical `<h2>`/`<h3>` hierarchy
- A "Skip to main content" link for keyboard users
- Every form control (`search-input`, `category-filter`, `status-filter`) has a real `<label>` plus a descriptive `aria-label`
- `role="status"` / `role="alert"` with `aria-live` on the loading and error banners so screen readers announce state changes
- Visible focus rings (`:focus-visible`) on every interactive element, not just the browser default
- Order status is shown with a color badge **and** text **and** a dot icon, so it is never communicated by color alone
- Sort buttons expose their current direction through `aria-label` (e.g. "Sort by total, currently descending"), not just a visual arrow
- Table sort headers are real `<button>` elements, reachable and operable by keyboard
- Sufficient color contrast between text and backgrounds throughout
- `prefers-reduced-motion` is respected — animations are disabled for users who request it

## Performance Optimizations

- Chart.js is included once and reused: charts are updated in place (`chart.update()`) rather than destroyed and recreated
- Data is fetched once on load and kept in memory (`salesData`); filtering/sorting/searching never re-fetches
- Table rows are rendered with a single `innerHTML` write (one DOM update) instead of appending rows one at a time
- Sorting uses one shared `getFilteredAndSortedData()` function so search, category filter, status filter, and sort all reuse the same code path — no duplicated filtering logic
- One event listener on the table header (event delegation) handles clicks for all sortable columns, instead of one listener per button
- All DOM elements are queried once at startup and stored in constants, not re-queried on every keystroke
- No external images — icons are inline SVG, so there are no extra network requests or large image files
- CSS uses custom properties (design tokens) for consistency and to avoid repeating values

## Testing Performed

The following were tested in the browser against the local server at `http://localhost:8000` and cross-checked against `sales.json` values:

- [x] `sales.json` parses successfully, contains 28 valid records, and every `total` equals `quantity * price`
- [x] The dashboard loads the data and displays the expected KPIs: ₹62,450 sales, 24 valid orders, ₹2,602 average order value, and 28 distinct products
- [x] Both Chart.js canvases render without JavaScript errors
- [x] Search, category filtering, status filtering, all filter combinations, and Clear Filters work
- [x] Sorting works in ascending and descending order for total, with the table rendered dynamically
- [x] A search with no matches shows "No sales records found."
- [x] Sidebar section links update the URL hash, active styling, and `aria-current`
- [x] Simulated `sales.json` failure shows the error state, and reloading after recovery restores the dashboard
- [x] Desktop, laptop, tablet, and mobile layouts have no page-level horizontal overflow; the table remains horizontally scrollable
- [x] Semantic landmarks, labels, table caption, status text, skip link, and visible focus styles are present in the accessibility structure

## Future Improvements

- Add pagination for larger datasets instead of showing every row at once
- Persist filter/sort choices in the URL so a filtered view can be shared or bookmarked
- Add a date-range picker to filter sales by custom periods
- Make "Sales", "Products", and "Reports" nav items into real, functional pages
- Add CSV export for the currently filtered table view
- Add unit tests for the calculation and filtering functions