/**
 * Spreadsheet connection and cell map.
 * Keep this file in sync with DESIGN_SPEC.md section 7.
 */
window.DashboardConfig = {
  spreadsheetId: "1OQ8fC-vOglnPcy3aQKXOu743dX8YK2f9OovYg_8EjlA",
  gid: "0",
  sheetName: "01_Dashboard",
  /**
   * export CSV keeps empty rows and column positions required by the cell map.
   * gviz CSV skips/merges header rows, so it is only a fallback.
   */
  csvUrls: [
    "https://docs.google.com/spreadsheets/d/1OQ8fC-vOglnPcy3aQKXOu743dX8YK2f9OovYg_8EjlA/export?format=csv&gid=0",
    "https://docs.google.com/spreadsheets/d/1OQ8fC-vOglnPcy3aQKXOu743dX8YK2f9OovYg_8EjlA/gviz/tq?tqx=out:csv&gid=0",
  ],
  cells: {
    title: "A1",
    income: "A6",
    expense: "C6",
    balance: "E6",
  },
  ranges: {
    income: { startRow: 10, endRow: 15, nameCol: "A", valueCol: "B" },
    expenseByTeam: { startRow: 20, endRow: 25, nameCol: "A", valueCol: "B" },
  },
  refreshIntervalMs: 5000,
  colors: {
    income: ["#3B6EF5", "#F5A524", "#8B5CF6", "#84CC16", "#22D3EE", "#FACC15"],
    expense: ["#3B6EF5", "#F5A524", "#8B5CF6", "#84CC16", "#22D3EE", "#FACC15"],
  },
};
