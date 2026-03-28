const DAY_MS = 24 * 60 * 60 * 1000;

const EXAMPLE_DATA = {
  projectStart: "2026-04-06",
  activities: [
    { id: "A1", name: "Discovery workshops", swimlane: "Product", duration: 5, dependencies: [], milestone: false },
    { id: "A2", name: "Requirements baseline", swimlane: "Product", duration: 3, dependencies: ["A1"], milestone: false },
    { id: "B1", name: "UX concepts", swimlane: "Design", duration: 6, dependencies: ["A1"], milestone: false },
    { id: "B2", name: "UI prototype", swimlane: "Design", duration: 4, dependencies: ["B1", "A2"], milestone: false },
    { id: "C1", name: "Architecture setup", swimlane: "Engineering", duration: 7, dependencies: ["A2"], milestone: false },
    { id: "C2", name: "Feature build", swimlane: "Engineering", duration: 10, dependencies: ["B2", "C1"], milestone: false },
    { id: "D1", name: "QA regression", swimlane: "Quality", duration: 5, dependencies: ["C2"], milestone: false },
    { id: "M1", name: "Go-live milestone", swimlane: "Milestones", duration: 0, dependencies: ["D1"], milestone: true }
  ]
};

const palette = [
  { laneFill: "#e2efff", taskFill: "#9ec5ff", stroke: "#4f8ff8" },
  { laneFill: "#e9f8ef", taskFill: "#9ad9b0", stroke: "#38a169" },
  { laneFill: "#fff4dc", taskFill: "#ffd892", stroke: "#d89216" },
  { laneFill: "#f7e8ff", taskFill: "#d6a8f8", stroke: "#9d5bd6" },
  { laneFill: "#ffecef", taskFill: "#ffb8c4", stroke: "#d94f70" },
  { laneFill: "#e7f9fc", taskFill: "#9fdff0", stroke: "#2a9db7" }
];

const els = {
  projectStart: document.getElementById("projectStart"),
  showCriticalPath: document.getElementById("showCriticalPath"),
  csvInput: document.getElementById("csvInput"),
  loadExampleBtn: document.getElementById("loadExampleBtn"),
  renderBtn: document.getElementById("renderBtn"),
  addRowBtn: document.getElementById("addRowBtn"),
  clearRowsBtn: document.getElementById("clearRowsBtn"),
  tbody: document.getElementById("activityTableBody"),
  rowTemplate: document.getElementById("activityRowTemplate"),
  status: document.getElementById("statusText"),
  scheduleSvg: document.getElementById("scheduleSvg"),
  downloadPngBtn: document.getElementById("downloadPngBtn"),
  downloadSvgBtn: document.getElementById("downloadSvgBtn")
};

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function parseISODate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function cloneDate(date) {
  return new Date(date.getTime());
}

function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function lastWeekdayOfMonth(year, monthIdx, weekday) {
  const date = new Date(Date.UTC(year, monthIdx + 1, 0));
  while (date.getUTCDay() !== weekday) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return new Date(date.getTime());
}

function firstWeekdayOfMonth(year, monthIdx, weekday) {
  const date = new Date(Date.UTC(year, monthIdx, 1));
  while (date.getUTCDay() !== weekday) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return new Date(date.getTime());
}

function observedFixedHoliday(year, monthIdx, day) {
  const d = new Date(Date.UTC(year, monthIdx, day));
  if (d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 2);
  } else if (d.getUTCDay() === 0) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function ukBankHolidays(year) {
  const easter = easterDate(year);
  const goodFriday = new Date(easter.getTime() - 2 * DAY_MS);
  const easterMonday = new Date(easter.getTime() + DAY_MS);
  const earlyMay = firstWeekdayOfMonth(year, 4, 1);
  const springBank = lastWeekdayOfMonth(year, 4, 1);
  const summerBank = lastWeekdayOfMonth(year, 7, 1);

  const christmasObserved = observedFixedHoliday(year, 11, 25);
  let boxingObserved = observedFixedHoliday(year, 11, 26);

  if (toISODate(boxingObserved) === toISODate(christmasObserved)) {
    boxingObserved = new Date(boxingObserved.getTime() + DAY_MS);
  }

  const holidays = [
    observedFixedHoliday(year, 0, 1),
    goodFriday,
    easterMonday,
    earlyMay,
    springBank,
    summerBank,
    christmasObserved,
    boxingObserved
  ];

  return new Set(holidays.map((d) => toISODate(d)));
}

const holidayCache = new Map();

function getHolidaySet(year) {
  if (!holidayCache.has(year)) {
    holidayCache.set(year, ukBankHolidays(year));
  }
  return holidayCache.get(year);
}

function isWorkingDay(date) {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return false;
  }
  return !getHolidaySet(date.getUTCFullYear()).has(toISODate(date));
}

function nextWorkingDay(date) {
  const d = cloneDate(date);
  while (!isWorkingDay(d)) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function addWorkingDays(startDate, days) {
  if (days === 0) {
    return nextWorkingDay(startDate);
  }

  let added = 0;
  const d = nextWorkingDay(startDate);

  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isWorkingDay(d)) {
      added += 1;
    }
  }
  return d;
}

function workingDaysBetween(startDate, endDate) {
  if (endDate < startDate) {
    return 0;
  }
  const d = cloneDate(startDate);
  let count = 0;
  while (d < endDate) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isWorkingDay(d)) {
      count += 1;
    }
  }
  return count;
}

function clearRows() {
  els.tbody.innerHTML = "";
}

function addRow(activity = {}) {
  const row = els.rowTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector('[data-field="id"]').value = activity.id || "";
  row.querySelector('[data-field="name"]').value = activity.name || "";
  row.querySelector('[data-field="swimlane"]').value = activity.swimlane || "";
  row.querySelector('[data-field="duration"]').value = Number.isFinite(activity.duration)
    ? activity.duration
    : "";
  row.querySelector('[data-field="dependencies"]').value = (activity.dependencies || []).join(", ");
  row.querySelector('[data-field="milestone"]').checked = !!activity.milestone;

  row.querySelector(".remove-row-btn").addEventListener("click", () => {
    row.remove();
  });

  els.tbody.appendChild(row);
}

function readActivitiesFromTable() {
  const rows = [...els.tbody.querySelectorAll("tr")];
  const activities = [];

  for (const row of rows) {
    const id = row.querySelector('[data-field="id"]').value.trim();
    const name = row.querySelector('[data-field="name"]').value.trim();
    const swimlane = row.querySelector('[data-field="swimlane"]').value.trim();
    const durationRaw = row.querySelector('[data-field="duration"]').value.trim();
    const dependenciesRaw = row
      .querySelector('[data-field="dependencies"]')
      .value.trim();
    const milestone = row.querySelector('[data-field="milestone"]').checked;

    if (!id && !name && !swimlane && !durationRaw && !dependenciesRaw && !milestone) {
      continue;
    }

    if (!id || !name || !swimlane) {
      throw new Error("Every activity row needs ID, Name, and Swim lane.");
    }

    const duration = Number(durationRaw);
    if (!Number.isInteger(duration) || duration < 0) {
      throw new Error(`Activity ${id} must have a non-negative whole-number duration.`);
    }

    const dependencies = dependenciesRaw
      ? dependenciesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    activities.push({ id, name, swimlane, duration, dependencies, milestone });
  }

  return activities;
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV should include a header row plus at least one data row.");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["id", "name", "swimlane", "duration", "dependencies", "milestone"];

  const missing = required.filter((col) => !headers.includes(col));
  if (missing.length) {
    throw new Error(`Missing CSV columns: ${missing.join(", ")}`);
  }

  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

  return lines.slice(1).map((line, rowNum) => {
    const cols = line.split(",");
    const id = (cols[idx.id] || "").trim();
    const name = (cols[idx.name] || "").trim();
    const swimlane = (cols[idx.swimlane] || "").trim();
    const duration = Number((cols[idx.duration] || "").trim());
    const dependencies = (cols[idx.dependencies] || "")
      .split(/[;|]/)
      .join(",")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const milestoneValue = (cols[idx.milestone] || "").trim().toLowerCase();
    const milestone = ["true", "yes", "y", "1"].includes(milestoneValue);

    if (!id || !name || !swimlane || !Number.isFinite(duration)) {
      throw new Error(`CSV row ${rowNum + 2} has invalid fields.`);
    }

    return { id, name, swimlane, duration, dependencies, milestone };
  });
}

function buildGraph(activities) {
  const map = new Map();

  activities.forEach((a) => {
    if (map.has(a.id)) {
      throw new Error(`Duplicate activity ID detected: ${a.id}`);
    }
    map.set(a.id, { ...a, successors: [] });
  });

  activities.forEach((a) => {
    a.dependencies.forEach((depId) => {
      const dep = map.get(depId);
      if (!dep) {
        throw new Error(`Activity ${a.id} references missing dependency ${depId}.`);
      }
      dep.successors.push(a.id);
    });
  });

  return map;
}

function topologicalSort(graph) {
  const indegree = new Map();
  graph.forEach((node, id) => indegree.set(id, node.dependencies.length));

  const queue = [...indegree.entries()]
    .filter(([, v]) => v === 0)
    .map(([id]) => id);

  const sorted = [];

  while (queue.length) {
    const id = queue.shift();
    sorted.push(id);
    const node = graph.get(id);
    node.successors.forEach((next) => {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
      }
    });
  }

  if (sorted.length !== graph.size) {
    throw new Error("Dependency cycle detected. Please remove circular dependencies.");
  }

  return sorted;
}

function computeSchedule(activities, projectStart) {
  const graph = buildGraph(activities);
  const order = topologicalSort(graph);

  const firstWorkDay = nextWorkingDay(projectStart);

  order.forEach((id) => {
    const node = graph.get(id);

    let start = firstWorkDay;
    if (node.dependencies.length) {
      const latestEnd = node.dependencies
        .map((depId) => graph.get(depId).endDate)
        .reduce((a, b) => (a > b ? a : b));
      start = nextWorkingDay(latestEnd);
    }

    const end = node.duration === 0 ? start : addWorkingDays(start, node.duration);
    node.startDate = start;
    node.endDate = end;
    node.es = workingDaysBetween(firstWorkDay, start);
    node.ef = node.es + node.duration;
  });

  const projectDuration = Math.max(...[...graph.values()].map((n) => n.ef));

  [...order].reverse().forEach((id) => {
    const node = graph.get(id);

    if (!node.successors.length) {
      node.lf = projectDuration;
    } else {
      node.lf = Math.min(...node.successors.map((sid) => graph.get(sid).ls));
    }

    node.ls = node.lf - node.duration;
    node.float = node.ls - node.es;
    node.critical = node.float === 0;
  });

  return { graph, order, projectDuration, firstWorkDay };
}

function laneColorMap(lanes) {
  const map = new Map();
  lanes.forEach((lane, idx) => {
    map.set(lane, palette[idx % palette.length]);
  });
  return map;
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function laneOrder(nodes) {
  const order = [];
  nodes.forEach((n) => {
    if (!order.includes(n.swimlane)) {
      order.push(n.swimlane);
    }
  });
  return order;
}

function renderSvg(schedule, showCritical) {
  const { graph, order, projectDuration, firstWorkDay } = schedule;
  const nodes = order.map((id) => graph.get(id));
  const lanes = laneOrder(nodes);
  const laneIdx = new Map(lanes.map((lane, i) => [lane, i]));
  const colors = laneColorMap(lanes);

  const margin = { top: 46, right: 20, bottom: 38, left: 170 };
  const dayWidth = 32;
  const laneHeight = 82;
  const width = margin.left + margin.right + Math.max(projectDuration + 2, 12) * dayWidth;
  const height = margin.top + margin.bottom + lanes.length * laneHeight;

  els.scheduleSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.scheduleSvg.innerHTML = "";

  const ns = "http://www.w3.org/2000/svg";

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", width.toString());
  bg.setAttribute("height", height.toString());
  bg.setAttribute("fill", "#ffffff");
  els.scheduleSvg.appendChild(bg);

  lanes.forEach((lane, idx) => {
    const y = margin.top + idx * laneHeight;
    const c = colors.get(lane);

    const laneRect = document.createElementNS(ns, "rect");
    laneRect.setAttribute("x", margin.left.toString());
    laneRect.setAttribute("y", y.toString());
    laneRect.setAttribute("width", (width - margin.left - margin.right).toString());
    laneRect.setAttribute("height", laneHeight.toString());
    laneRect.setAttribute("fill", c.laneFill);
    laneRect.setAttribute("stroke", "#e3eaf7");
    laneRect.setAttribute("stroke-width", "1");
    els.scheduleSvg.appendChild(laneRect);

    const label = document.createElementNS(ns, "text");
    label.textContent = lane;
    label.setAttribute("x", "12");
    label.setAttribute("y", (y + laneHeight / 2 + 5).toString());
    label.setAttribute("class", "lane-label");
    els.scheduleSvg.appendChild(label);
  });

  for (let d = 0; d <= projectDuration + 1; d += 1) {
    const x = margin.left + d * dayWidth;

    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", x.toString());
    line.setAttribute("x2", x.toString());
    line.setAttribute("y1", margin.top.toString());
    line.setAttribute("y2", (height - margin.bottom).toString());
    line.setAttribute("stroke", d % 5 === 0 ? "#ced9ec" : "#e6edf8");
    line.setAttribute("stroke-width", "1");
    els.scheduleSvg.appendChild(line);

    if (d % 5 === 0) {
      const date = addWorkingDays(firstWorkDay, d);
      const text = document.createElementNS(ns, "text");
      text.textContent = formatDate(date);
      text.setAttribute("x", (x + 2).toString());
      text.setAttribute("y", "22");
      text.setAttribute("class", "date-label");
      els.scheduleSvg.appendChild(text);
    }
  }

  nodes.forEach((node) => {
    const lane = laneIdx.get(node.swimlane);
    const yBase = margin.top + lane * laneHeight;
    const barY = yBase + 24;
    const x = margin.left + node.es * dayWidth;
    const widthDays = Math.max(node.duration, 1);
    const barW = widthDays * dayWidth - 4;
    const c = colors.get(node.swimlane);

    if (node.milestone) {
      const cx = x + dayWidth / 2;
      const cy = barY + 16;
      const size = 12;
      const diamond = document.createElementNS(ns, "polygon");
      diamond.setAttribute(
        "points",
        `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`
      );
      diamond.setAttribute("fill", c.stroke);
      diamond.setAttribute("stroke", showCritical && node.critical ? "#d92332" : "#5d6f89");
      diamond.setAttribute("stroke-width", showCritical && node.critical ? "3" : "1.4");
      els.scheduleSvg.appendChild(diamond);

      const label = document.createElementNS(ns, "text");
      label.textContent = `${node.name} (${formatDate(node.startDate)})`;
      label.setAttribute("x", (cx + 16).toString());
      label.setAttribute("y", (cy + 4).toString());
      label.setAttribute("class", "milestone-label");
      els.scheduleSvg.appendChild(label);
    } else {
      const bar = document.createElementNS(ns, "rect");
      bar.setAttribute("x", (x + 2).toString());
      bar.setAttribute("y", barY.toString());
      bar.setAttribute("width", Math.max(barW, 24).toString());
      bar.setAttribute("height", "30");
      bar.setAttribute("rx", "12");
      bar.setAttribute("fill", c.taskFill);
      bar.setAttribute("stroke", showCritical && node.critical ? "#d92332" : c.stroke);
      bar.setAttribute("stroke-width", showCritical && node.critical ? "3" : "1.4");
      els.scheduleSvg.appendChild(bar);

      const label = document.createElementNS(ns, "text");
      label.textContent = `${node.name} (${node.duration}d)`;
      label.setAttribute("x", (x + 12).toString());
      label.setAttribute("y", (barY + 19).toString());
      label.setAttribute("class", "task-label");
      els.scheduleSvg.appendChild(label);
    }

    node.dependencies.forEach((depId) => {
      const dep = graph.get(depId);
      const depLane = laneIdx.get(dep.swimlane);
      const depX = margin.left + dep.ef * dayWidth;
      const depY = margin.top + depLane * laneHeight + 39;
      const targetX = margin.left + node.es * dayWidth + 2;
      const targetY = barY + 15;

      const path = document.createElementNS(ns, "path");
      const midX = depX + (targetX - depX) / 2;
      path.setAttribute(
        "d",
        `M ${depX} ${depY} C ${midX} ${depY}, ${midX} ${targetY}, ${targetX} ${targetY}`
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#8c9cb6");
      path.setAttribute("stroke-width", "1.2");
      path.setAttribute("opacity", "0.8");
      els.scheduleSvg.appendChild(path);
    });
  });

  const legendX = width - 275;
  const legendY = 10;

  const legendBg = document.createElementNS(ns, "rect");
  legendBg.setAttribute("x", legendX.toString());
  legendBg.setAttribute("y", legendY.toString());
  legendBg.setAttribute("width", "255");
  legendBg.setAttribute("height", "30");
  legendBg.setAttribute("rx", "8");
  legendBg.setAttribute("fill", "#f6f9ff");
  legendBg.setAttribute("stroke", "#cdd9ee");
  els.scheduleSvg.appendChild(legendBg);

  const legend = document.createElementNS(ns, "text");
  legend.setAttribute("x", (legendX + 10).toString());
  legend.setAttribute("y", (legendY + 20).toString());
  legend.setAttribute("class", "axis-label");
  legend.textContent =
    "Rounded bars = activities, Diamonds = milestones, Red outline = critical path";
  els.scheduleSvg.appendChild(legend);
}

function downloadSvg() {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(els.scheduleSvg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cartoon-schedule.svg";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPng() {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(els.scheduleSvg);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const viewBox = (els.scheduleSvg.getAttribute("viewBox") || "0 0 800 400")
      .split(" ")
      .map(Number);
    const canvas = document.createElement("canvas");
    canvas.width = viewBox[2];
    canvas.height = viewBox[3];
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "cartoon-schedule.png";
      a.click();
      URL.revokeObjectURL(pngUrl);
      URL.revokeObjectURL(url);
    });
  };
  img.src = url;
}

function loadExample() {
  els.projectStart.value = EXAMPLE_DATA.projectStart;
  clearRows();
  EXAMPLE_DATA.activities.forEach((a) => addRow(a));
  buildAndRender();
}

function setStatus(message) {
  els.status.textContent = message;
}

function buildAndRender() {
  try {
    const activities = readActivitiesFromTable();
    if (!activities.length) {
      throw new Error("Please add at least one activity.");
    }

    const startDate = parseISODate(els.projectStart.value);
    if (!startDate) {
      throw new Error("Please choose a valid project start date.");
    }

    const schedule = computeSchedule(activities, startDate);
    renderSvg(schedule, els.showCriticalPath.checked);

    const completionDate = addWorkingDays(schedule.firstWorkDay, schedule.projectDuration);
    setStatus(
      `Built ${activities.length} activities across ${laneOrder(activities).length} swim lanes. ` +
        `Estimated completion: ${formatDate(completionDate)}.`
    );
  } catch (error) {
    setStatus(`Error: ${error.message}`);
  }
}

els.loadExampleBtn.addEventListener("click", loadExample);
els.renderBtn.addEventListener("click", buildAndRender);
els.showCriticalPath.addEventListener("change", buildAndRender);
els.addRowBtn.addEventListener("click", () => addRow());
els.clearRowsBtn.addEventListener("click", clearRows);
els.downloadSvgBtn.addEventListener("click", downloadSvg);
els.downloadPngBtn.addEventListener("click", downloadPng);

els.csvInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const activities = parseCsv(text);
    clearRows();
    activities.forEach((activity) => addRow(activity));
    setStatus(`Loaded ${activities.length} activities from CSV.`);
    buildAndRender();
  } catch (error) {
    setStatus(`CSV error: ${error.message}`);
  }
});

loadExample();