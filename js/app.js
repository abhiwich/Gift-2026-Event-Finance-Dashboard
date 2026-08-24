(function () {
  const config = window.DashboardConfig;
  const sheets = window.DashboardSheets;
  const charts = window.DashboardCharts;
  const refreshMs = config.refreshIntervalMs || 5000;

  const titleEl = document.getElementById("dashboard-title");
  const subtitleEl = document.getElementById("dashboard-subtitle");
  const statusEl = document.getElementById("status");
  const dateButton = document.getElementById("date-filter");
  const datePopover = document.getElementById("date-popover");
  const incomeEl = document.getElementById("kpi-income");
  const refundsEl = document.getElementById("kpi-refunds");
  const expenseEl = document.getElementById("kpi-expense");
  const balanceEl = document.getElementById("kpi-balance");
  const balanceNoteEl = document.getElementById("kpi-balance-note");
  const recentBody = document.getElementById("recent-body");

  const incomeChart = charts.createBarChart({
    canvas: document.getElementById("income-chart"),
    legend: document.getElementById("income-legend"),
    tooltip: document.getElementById("income-tooltip"),
    srTable: document.getElementById("income-sr-table"),
    palette: config.colors.income,
  });

  const teamChart = charts.createBarChart({
    canvas: document.getElementById("team-chart"),
    legend: document.getElementById("team-legend"),
    tooltip: document.getElementById("team-tooltip"),
    srTable: document.getElementById("team-sr-table"),
    palette: config.colors.team,
    mode: "team",
  });

  const categoryChart = charts.createBarChart({
    canvas: document.getElementById("category-chart"),
    legend: document.getElementById("category-legend"),
    tooltip: document.getElementById("category-tooltip"),
    srTable: document.getElementById("category-sr-table"),
    palette: config.colors.category,
  });

  let hasData = false;
  let loading = false;
  let timer = null;

  function setStatus(message, kind) {
    statusEl.hidden = !message;
    statusEl.textContent = message || "";
    statusEl.className = "status" + (kind ? " status-" + kind : "");
  }

  function formatKpi(value) {
    if (value == null) return "—";
    return Math.round(value).toLocaleString("en-US");
  }

  function clearDashboard() {
    incomeEl.textContent = "—";
    refundsEl.textContent = "—";
    expenseEl.textContent = "—";
    balanceEl.textContent = "—";
    balanceNoteEl.hidden = true;
    incomeChart.setData([]);
    teamChart.setData([]);
    categoryChart.setData([]);
    recentBody.innerHTML = "";
  }

  function renderRecent(rows) {
    recentBody.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "ไม่มีรายการ";
      empty.appendChild(cell);
      recentBody.appendChild(empty);
      return;
    }
    rows.forEach(function (item) {
      const row = document.createElement("tr");
      [item.date, item.team, item.description, charts.formatFull(item.amount)].forEach(
        function (text, index) {
          const cell = document.createElement("td");
          cell.textContent = text == null || text === "" ? "—" : text;
          if (index === 3) cell.className = "num";
          row.appendChild(cell);
        }
      );
      recentBody.appendChild(row);
    });
  }

  function render(data) {
    const title = data.title || config.titleFallback;
    titleEl.textContent = title;
    document.title = title;
    subtitleEl.textContent = data.subtitle || "";
    subtitleEl.hidden = !data.subtitle;

    incomeEl.textContent = formatKpi(data.income);
    refundsEl.textContent = formatKpi(data.refunds);
    expenseEl.textContent = formatKpi(data.expense);
    balanceEl.textContent = formatKpi(data.balance);
    balanceNoteEl.hidden = !(data.balance != null && data.balance < 0);

    incomeChart.setData(data.incomeBySource);
    teamChart.setData(data.expenseByTeam);
    categoryChart.setData(data.expenseByCategory);
    renderRecent(data.recent || []);
    hasData = true;
  }

  function showError() {
    clearDashboard();
    hasData = false;
    setStatus("ไม่สามารถอ่าน Google Sheets ได้", "error");
  }

  async function refresh() {
    if (loading || document.hidden) return;
    loading = true;
    if (!hasData) setStatus("กำลังโหลดข้อมูล", "loading");
    try {
      const data = await sheets.loadDashboard(config);
      render(data);
      setStatus("");
    } catch (error) {
      console.error(error);
      if (!hasData || error.code === "PERMISSION") {
        showError();
      }
    } finally {
      loading = false;
    }
  }

  function startPolling() {
    refresh();
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(refresh, refreshMs);
  }

  function closeDatePopover() {
    if (!datePopover || !dateButton) return;
    datePopover.hidden = true;
    dateButton.setAttribute("aria-expanded", "false");
  }

  if (dateButton && datePopover) {
    dateButton.addEventListener("click", function (event) {
      event.stopPropagation();
      const willOpen = datePopover.hidden;
      datePopover.hidden = !willOpen;
      dateButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
    document.addEventListener("click", function (event) {
      if (!datePopover.hidden && !datePopover.contains(event.target) && event.target !== dateButton) {
        closeDatePopover();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDatePopover();
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
      return;
    }
    startPolling();
  });

  startPolling();
})();
