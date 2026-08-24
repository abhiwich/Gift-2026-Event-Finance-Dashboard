(function (global) {
  function formatFull(value) {
    if (value == null || !Number.isFinite(value)) return "—";
    return Math.round(value).toLocaleString("en-US");
  }

  function formatAxis(value) {
    if (value === 0) return "0";
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);
    if (abs >= 1000) {
      const thousands = abs / 1000;
      const label = Number.isInteger(thousands)
        ? String(thousands)
        : String(Number(thousands.toFixed(1)));
      return sign + label + "K";
    }
    return sign + String(abs);
  }

  function niceScale(maxValue) {
    if (!maxValue || maxValue <= 0) {
      return { max: 10, step: 5, ticks: [0, 5, 10] };
    }

    const padded = maxValue * 1.08;
    const rawStep = padded / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    let niceResidual;
    if (residual <= 1) niceResidual = 1;
    else if (residual <= 2) niceResidual = 2;
    else if (residual <= 2.5) niceResidual = 2.5;
    else if (residual <= 5) niceResidual = 5;
    else niceResidual = 10;

    const step = niceResidual * magnitude;
    const max = Math.ceil(padded / step) * step;
    const ticks = [];
    for (let value = 0; value <= max + 1e-9; value += step) {
      ticks.push(value);
    }
    return { max: max, step: step, ticks: ticks };
  }

  function valueScale(items) {
    let min = 0;
    let max = 0;
    items.forEach(function (item) {
      min = Math.min(min, Number(item.value) || 0);
      max = Math.max(max, Number(item.value) || 0);
    });
    if (min === 0 && max === 0) {
      return { min: 0, max: 10, ticks: [0, 5, 10] };
    }
    const extent = Math.max(Math.abs(min), Math.abs(max));
    const positive = niceScale(extent);
    const ticks = [];
    if (min >= 0) {
      return { min: 0, max: positive.max, ticks: positive.ticks };
    }
    if (max <= 0) {
      for (let value = -positive.max; value <= 0 + 1e-9; value += positive.step) {
        ticks.push(value);
      }
      return { min: -positive.max, max: 0, ticks: ticks };
    }
    for (let value = -positive.max; value <= positive.max + 1e-9; value += positive.step) {
      ticks.push(value);
    }
    return { min: -positive.max, max: positive.max, ticks: ticks };
  }

  function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let current = "";

    words.forEach(function (word) {
      const next = current ? current + " " + word : word;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
        return;
      }
      if (current) lines.push(current);
      if (ctx.measureText(word).width <= maxWidth) {
        current = word;
        return;
      }
      let chunk = "";
      for (let i = 0; i < word.length; i += 1) {
        const trial = chunk + word[i];
        if (ctx.measureText(trial).width <= maxWidth) {
          chunk = trial;
        } else {
          if (chunk) lines.push(chunk);
          chunk = word[i];
        }
      }
      current = chunk;
    });

    if (current) lines.push(current);
    return lines.slice(0, 3);
  }

  function colorFor(palette, index) {
    return palette[index % palette.length];
  }

  function renderLegend(container, items, palette) {
    container.innerHTML = "";
    items.forEach(function (item, index) {
      const legendItem = document.createElement("span");
      legendItem.className = "legend-item";
      const swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.background = colorFor(palette, index);
      const label = document.createElement("span");
      label.className = "legend-label";
      label.textContent = item.name;
      legendItem.appendChild(swatch);
      legendItem.appendChild(label);
      container.appendChild(legendItem);
    });
  }

  function renderSrTable(table, items, mode) {
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    items.forEach(function (item) {
      const row = document.createElement("tr");
      const nameCell = document.createElement("th");
      nameCell.scope = "row";
      nameCell.textContent = item.name;
      row.appendChild(nameCell);
      if (mode === "team") {
        ["transferred", "refunded", "value"].forEach(function (key) {
          const cell = document.createElement("td");
          cell.textContent = formatFull(item[key]);
          row.appendChild(cell);
        });
      } else {
        const valueCell = document.createElement("td");
        valueCell.textContent = formatFull(item.value);
        row.appendChild(valueCell);
      }
      tbody.appendChild(row);
    });
  }

  function createBarChart(options) {
    const canvas = options.canvas;
    const tooltip = options.tooltip;
    const palette = options.palette;
    const mode = options.mode || "simple";
    let items = [];
    let bars = [];
    let hoverIndex = -1;

    function layout() {
      const parent = canvas.parentElement;
      const cssWidth = Math.max(Math.floor(parent.clientWidth), 0);
      const cssHeight = Math.max(Math.floor(canvas.clientHeight || 280), 160);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(Math.round(cssWidth * dpr), 1);
      canvas.height = Math.max(Math.round(cssHeight * dpr), 1);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx: ctx, width: cssWidth, height: cssHeight, narrow: cssWidth < 520 };
    }

    function hideTooltip() {
      tooltip.hidden = true;
    }

    function showTooltip(index, event) {
      const item = items[index];
      if (!item) return;
      tooltip.hidden = false;
      tooltip.innerHTML = "";
      const title = document.createElement("strong");
      title.textContent = item.name;
      tooltip.appendChild(title);

      if (mode === "team") {
        [
          ["โอน", item.transferred],
          ["คืน", item.refunded],
          ["สุทธิ", item.value],
        ].forEach(function (pair) {
          const line = document.createElement("span");
          line.textContent = pair[0] + " " + formatFull(pair[1]);
          tooltip.appendChild(line);
        });
      } else {
        const line = document.createElement("span");
        line.textContent = formatFull(item.value);
        tooltip.appendChild(line);
      }

      const wrapper = canvas.parentElement.getBoundingClientRect();
      const x = event.clientX - wrapper.left + 12;
      const y = event.clientY - wrapper.top + 12;
      const maxLeft = Math.max(8, wrapper.width - tooltip.offsetWidth - 8);
      const maxTop = Math.max(8, wrapper.height - tooltip.offsetHeight - 8);
      tooltip.style.left = Math.min(Math.max(8, x), maxLeft) + "px";
      tooltip.style.top = Math.min(Math.max(8, y), maxTop) + "px";
    }

    function draw() {
      const layoutResult = layout();
      const ctx = layoutResult.ctx;
      const width = layoutResult.width;
      const height = layoutResult.height;
      if (width < 32 || height < 32) return;
      ctx.clearRect(0, 0, width, height);
      bars = [];

      if (!items.length) {
        ctx.fillStyle = "#667085";
        ctx.font = "13px Sarabun, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ไม่มีข้อมูล", width / 2, height / 2);
        return;
      }

      const narrow = layoutResult.narrow;
      const rotateLabels = items.length >= 6 && width < 680;
      const pad = {
        top: 12,
        right: narrow ? 8 : 12,
        bottom: rotateLabels ? 96 : narrow ? 76 : 58,
        left: narrow ? 42 : 50,
      };
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;
      const scale = valueScale(items);
      const range = scale.max - scale.min || 1;

      function yOf(value) {
        return pad.top + ((scale.max - value) / range) * plotHeight;
      }

      ctx.font = (narrow ? "10px" : "12px") + " Sarabun, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      scale.ticks.forEach(function (tick) {
        const y = yOf(tick);
        ctx.strokeStyle = tick === 0 ? "#D0D5DD" : "#EEF0F2";
        ctx.lineWidth = tick === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillStyle = "#667085";
        ctx.fillText(formatAxis(tick), pad.left - 8, y);
      });

      const slot = plotWidth / items.length;
      const barWidth = Math.max(narrow ? 8 : 14, Math.min(48, slot * 0.52));
      const zeroY = yOf(0);

      items.forEach(function (item, index) {
        const centerX = pad.left + slot * index + slot / 2;
        const valueY = yOf(item.value || 0);
        const x = centerX - barWidth / 2;
        const barTop = Math.min(zeroY, valueY);
        const barHeight = Math.abs(valueY - zeroY);
        ctx.fillStyle = colorFor(palette, index);
        ctx.globalAlpha = hoverIndex === index ? 0.82 : 1;
        ctx.fillRect(x, barTop, barWidth, barHeight);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#667085";
        ctx.font = (narrow ? "10px" : "11px") + " Sarabun, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        if (rotateLabels) {
          ctx.save();
          ctx.translate(centerX, pad.top + plotHeight + 10);
          ctx.rotate(-Math.PI / 3.2);
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          let label = String(item.name);
          const maxW = 92;
          if (ctx.measureText(label).width > maxW) {
            while (label.length > 1 && ctx.measureText(label + "…").width > maxW) {
              label = label.slice(0, -1);
            }
            label += "…";
          }
          ctx.fillText(label, 0, 0);
          ctx.restore();
        } else {
          const lines = wrapText(ctx, item.name, Math.max(slot - 4, 24));
          lines.forEach(function (line, lineIndex) {
            ctx.fillText(line, centerX, pad.top + plotHeight + 8 + lineIndex * (narrow ? 12 : 13));
          });
        }
        bars.push({
          hitX: pad.left + slot * index,
          hitW: slot,
          hitY: pad.top,
          hitH: plotHeight + pad.bottom,
          index: index,
        });
      });
    }

    function hitTest(event) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      for (let i = 0; i < bars.length; i += 1) {
        const bar = bars[i];
        if (x >= bar.hitX && x <= bar.hitX + bar.hitW && y >= bar.hitY && y <= bar.hitY + bar.hitH) {
          return bar.index;
        }
      }
      return -1;
    }

    function handlePointer(event) {
      const index = hitTest(event);
      if (index !== hoverIndex) {
        hoverIndex = index;
        draw();
      }
      if (index >= 0) {
        canvas.style.cursor = "pointer";
        showTooltip(index, event);
      } else {
        canvas.style.cursor = "default";
        hideTooltip();
      }
    }

    canvas.addEventListener("pointerdown", handlePointer);
    canvas.addEventListener("pointermove", handlePointer);
    canvas.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "touch") return;
      hoverIndex = -1;
      hideTooltip();
      draw();
    });
    document.addEventListener("pointerdown", function (event) {
      if (!canvas.contains(event.target) && hoverIndex !== -1) {
        hoverIndex = -1;
        hideTooltip();
        draw();
      }
    });

    let frame = 0;
    function requestDraw() {
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        draw();
      });
    }

    window.addEventListener("resize", requestDraw);
    window.addEventListener("orientationchange", requestDraw);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", requestDraw);
    }
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(requestDraw).observe(canvas.parentElement);
    }

    return {
      setData: function (nextItems) {
        items = nextItems || [];
        renderLegend(options.legend, items, palette);
        renderSrTable(options.srTable, items, mode);
        draw();
      },
      redraw: draw,
    };
  }

  global.DashboardCharts = {
    createBarChart: createBarChart,
    formatFull: formatFull,
  };
})(window);
