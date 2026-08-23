(function () {
  const config = window.DashboardConfig;
  const sheets = window.DashboardSheets;
  const charts = window.DashboardCharts;
  const refreshMs = config.refreshIntervalMs || 5000;

  const statusEl = document.getElementById("status");
  const incomeEl = document.getElementById("kpi-income");
  const expenseEl = document.getElementById("kpi-expense");
  const balanceEl = document.getElementById("kpi-balance");

  const incomeChart = charts.createBarChart({
    canvas: document.getElementById("income-chart"),
    legend: document.getElementById("income-legend"),
    tooltip: document.getElementById("income-tooltip"),
    srTable: document.getElementById("income-sr-table"),
    palette: config.colors.income,
  });

  const expenseChart = charts.createBarChart({
    canvas: document.getElementById("expense-chart"),
    legend: document.getElementById("expense-legend"),
    tooltip: document.getElementById("expense-tooltip"),
    srTable: document.getElementById("expense-sr-table"),
    palette: config.colors.expense,
  });

  let hasData = false;
  let loading = false;
  let timer = null;

  function setStatus(message, kind) {
    statusEl.hidden = !message;
    statusEl.textContent = message || "";
    statusEl.className = "status" + (kind ? " status-" + kind : "");
  }

  function formatComma(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function formatK(value) {
    const thousands = value / 1000;
    const rounded = Math.round(thousands * 10) / 10;
    return (Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)) + "K";
  }

  function formatKpi(value) {
    if (value == null) return "—";
    if (value >= 100000) return formatK(value);
    return formatComma(value);
  }

  function render(data) {
    if (data.title) document.title = data.title;
    incomeEl.textContent = formatKpi(data.income);
    expenseEl.textContent = formatKpi(data.expense);
    balanceEl.textContent = formatKpi(data.balance);
    incomeChart.setData(data.incomeBySource);
    expenseChart.setData(data.expenseByTeam);
    hasData = true;
  }

  function showEmptyError() {
    incomeEl.textContent = "—";
    expenseEl.textContent = "—";
    balanceEl.textContent = "—";
    incomeChart.setData([]);
    expenseChart.setData([]);
    setStatus("ไม่สามารถอ่าน Google Sheets ได้", "error");
  }

  async function refresh() {
    if (loading || document.hidden) return;
    loading = true;
    if (!hasData) {
      setStatus("กำลังโหลดข้อมูล", "loading");
    }
    try {
      const data = await sheets.loadDashboard(config);
      render(data);
      setStatus("");
    } catch (error) {
      console.error(error);
      if (!hasData) {
        showEmptyError();
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
