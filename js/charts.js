(function (global) {
  function formatFull(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function formatAxis(value) {
    if (value === 0) return "0";
    if (value >= 1000) {
      const thousands = value / 1000;
      const label = Number.isInteger(thousands)
        ? String(thousands)
        : String(Number(thousands.toFixed(1)));
      return label + "K";
    }
    return String(value);
  }

  function niceScale(maxValue) {
    if (!maxValue || maxValue <= 0) {
      return { max: 10, ticks: [0, 5, 10] };
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
    return { max: max, ticks: ticks };
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

  function renderSrTable(table, items) {
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    items.forEach(function (item) {
      const row = document.createElement("tr");
      const nameCell = document.createElement("th");
      nameCell.scope = "row";
      nameCell.textContent = item.name;
      const valueCell = document.createElement("td");
      valueCell.textContent = formatFull(item.value);
      row.appendChild(nameCell);
      row.appendChild(valueCell);
      tbody.appendChild(row);
    });
  }

  function createBarChart(options) {
    const canvas = options.canvas;
    const tooltip = options.tooltip;
    const palette = options.palette;
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
      tooltip.innerHTML = "<strong></strong><span></span>";
      tooltip.querySelector("strong").textContent = item.name;
      tooltip.querySelector("span").textContent = formatFull(item.value);

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
      if (width < 32 || height < 32) {
        return;
      }
      ctx.clearRect(0, 0, width, height);
      bars = [];

      if (!items.length) {
        ctx.fillStyle = "#6B7280";
        ctx.font = "13px Sarabun, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ไม่มีข้อมูล", width / 2, height / 2);
        return;
      }

      const narrow = layoutResult.narrow;
      const pad = {
        top: 12,
        right: narrow ? 8 : 12,
        bottom: narrow ? 72 : 58,
        left: narrow ? 36 : 46,
      };
      const plotWidth = width - pad.left - pad.right;
      const plotHeight = height - pad.top - pad.bottom;
      const maxValue = Math.max.apply(
        null,
        items.map(function (item) {
          return item.value;
        })
      );
      const scale = niceScale(maxValue);

      ctx.font = (narrow ? "10px" : "12px") + " Sarabun, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      scale.ticks.forEach(function (tick) {
        const y = pad.top + plotHeight - (tick / scale.max) * plotHeight;
        ctx.strokeStyle = "#EEF0F2";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillStyle = "#6B7280";
        ctx.fillText(formatAxis(tick), pad.left - 8, y);
      });

      const slot = plotWidth / items.length;
      const barWidth = Math.max(narrow ? 10 : 16, Math.min(48, slot * 0.52));

      items.forEach(function (item, index) {
        const centerX = pad.left + slot * index + slot / 2;
        const barHeight = (item.value / scale.max) * plotHeight;
        const x = centerX - barWidth / 2;
        const y = pad.top + plotHeight - barHeight;
        ctx.fillStyle = colorFor(palette, index);
        ctx.globalAlpha = hoverIndex === index ? 0.82 : 1;
        ctx.fillRect(x, y, barWidth, Math.max(barHeight, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#6B7280";
        ctx.font = (narrow ? "10px" : "11px") + " Sarabun, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const lines = wrapText(ctx, item.name, Math.max(slot - 4, 28));
        lines.forEach(function (line, lineIndex) {
          ctx.fillText(line, centerX, pad.top + plotHeight + 8 + lineIndex * (narrow ? 12 : 13));
        });
        bars.push({
          x: x,
          y: y,
          w: barWidth,
          h: Math.max(barHeight, 0),
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
        const left = bar.hitX != null ? bar.hitX : bar.x;
        const width = bar.hitW != null ? bar.hitW : bar.w;
        const top = bar.hitY != null ? bar.hitY : bar.y;
        const height = bar.hitH != null ? bar.hitH : bar.h;
        if (x >= left && x <= left + width && y >= top && y <= top + height) {
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
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(requestDraw).observe(canvas.parentElement);
    }

    return {
      setData: function (nextItems) {
        items = nextItems || [];
        renderLegend(options.legend, items, palette);
        renderSrTable(options.srTable, items);
        draw();
      },
      redraw: draw,
    };
  }

  global.DashboardCharts = {
    createBarChart: createBarChart,
  };
})(window);
