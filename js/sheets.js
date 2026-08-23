(function (global) {
  function parseCsv(text) {
    const input = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      if (inQuotes) {
        if (char === '"') {
          if (input[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (char !== "\r") {
        field += char;
      }
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  function columnIndex(letter) {
    let index = 0;
    const col = String(letter || "").toUpperCase();
    for (let i = 0; i < col.length; i += 1) {
      index = index * 26 + (col.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  function getCell(rows, a1) {
    const match = /^([A-Za-z]+)(\d+)$/.exec(String(a1 || "").trim());
    if (!match) return "";
    const row = rows[Number(match[2]) - 1];
    if (!row) return "";
    const value = row[columnIndex(match[1])];
    return value == null ? "" : String(value);
  }

  function parseAmount(raw) {
    if (raw == null) return null;
    const cleaned = String(raw)
      .replace(/บาท/gi, "")
      .replace(/฿/g, "")
      .replace(/,/g, "")
      .trim();
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  function readSeries(rows, range) {
    const items = [];
    for (let rowNumber = range.startRow; rowNumber <= range.endRow; rowNumber += 1) {
      const name = getCell(rows, range.nameCol + rowNumber).trim();
      if (!name) continue;
      if (name.toUpperCase() === "TOTAL") break;
      const value = parseAmount(getCell(rows, range.valueCol + rowNumber));
      items.push({
        name: name,
        value: value == null ? 0 : value,
      });
    }
    return items;
  }

  function looksLikeHtml(text) {
    const start = String(text || "").trim().slice(0, 15).toLowerCase();
    return start.startsWith("<!doctype") || start.startsWith("<html");
  }

  function hasUsableData(data) {
    return (
      data.income != null &&
      data.expense != null &&
      data.incomeBySource.length > 0 &&
      data.expenseByTeam.length > 0
    );
  }

  async function fetchCsv(url) {
    const separator = url.indexOf("?") >= 0 ? "&" : "?";
    const cacheBustUrl = url + separator + "_t=" + Date.now();
    const response = await fetch(cacheBustUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    const text = await response.text();
    if (!text.trim() || looksLikeHtml(text)) {
      throw new Error("Did not receive CSV");
    }
    return text;
  }

  function parseDashboard(csvText, config) {
    const rows = parseCsv(csvText);
    return {
      title: getCell(rows, config.cells.title).trim(),
      income: parseAmount(getCell(rows, config.cells.income)),
      expense: parseAmount(getCell(rows, config.cells.expense)),
      balance: parseAmount(getCell(rows, config.cells.balance)),
      incomeBySource: readSeries(rows, config.ranges.income),
      expenseByTeam: readSeries(rows, config.ranges.expenseByTeam),
    };
  }

  async function loadDashboard(config) {
    let lastError = new Error("ไม่สามารถอ่าน Google Sheets ได้");

    for (let i = 0; i < config.csvUrls.length; i += 1) {
      try {
        const csvText = await fetchCsv(config.csvUrls[i]);
        const data = parseDashboard(csvText, config);
        if (hasUsableData(data)) {
          return data;
        }
        lastError = new Error("CSV did not match the cell map");
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  global.DashboardSheets = {
    parseCsv: parseCsv,
    getCell: getCell,
    parseAmount: parseAmount,
    parseDashboard: parseDashboard,
    loadDashboard: loadDashboard,
  };
})(window);
