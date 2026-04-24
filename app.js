const DAY_MS = 24 * 60 * 60 * 1000;

const EXAMPLE_DATA = {
  projectStart: "2026-04-06",
  sprintSettings: {
    enabled: false,
    duration: 10,
    startDate: "2026-04-06",
    startNumber: 1
  },
  activities: [
    { id: "A1", name: "Discovery workshops", swimlane: "Product", subSwimlane: "Discovery", duration: 5, dependencies: [], milestone: false },
    { id: "A2", name: "Requirements baseline", swimlane: "Product", subSwimlane: "Requirements", duration: 3, dependencies: ["A1"], milestone: false },
    { id: "B1", name: "UX concepts", swimlane: "Design", subSwimlane: "UX", duration: 6, dependencies: ["A1"], milestone: false },
    { id: "B2", name: "UI prototype", swimlane: "Design", subSwimlane: "UI", duration: 4, dependencies: ["B1", "A2"], milestone: false },
    { id: "C1", name: "Architecture setup", swimlane: "Engineering", subSwimlane: "Platform", duration: 7, dependencies: ["A2"], milestone: false },
    { id: "C2", name: "Feature build", swimlane: "Engineering", subSwimlane: "Delivery", duration: 10, dependencies: ["B2", "C1"], milestone: false },
    { id: "D1", name: "QA regression", swimlane: "Quality", subSwimlane: "Testing", duration: 5, dependencies: ["C2"], milestone: false },
    { id: "M1", name: "Go-live milestone", swimlane: "Milestones", subSwimlane: "", duration: 0, dependencies: ["D1"], milestone: true }
  ]
};

const palette = [
  {
    bandFill: "#50afe8",
    labelFill: "#d8effe",
    labelStroke: "#d8effe",
    laneFill: "#eef8fe",
    taskFill: "#50afe8",
    stroke: "#50afe8"
  },
  {
    bandFill: "#92ba52",
    labelFill: "#e8f2d8",
    labelStroke: "#dbe8c5",
    laneFill: "#f5faec",
    taskFill: "#92ba52",
    stroke: "#92ba52"
  },
  {
    bandFill: "#f4bd42",
    labelFill: "#fce9c3",
    labelStroke: "#f4e1aa",
    laneFill: "#fff8e8",
    taskFill: "#f4bd42",
    stroke: "#f4bd42"
  },
  {
    bandFill: "#eb3223",
    labelFill: "#fde1de",
    labelStroke: "#f4c4be",
    laneFill: "#fff1ef",
    taskFill: "#eb3223",
    stroke: "#eb3223"
  }
];

const els = {
  projectStart: document.getElementById("projectStart"),
  showCriticalPath: document.getElementById("showCriticalPath"),
  showSprints: document.getElementById("showSprints"),
  sprintSettings: document.getElementById("sprintSettings"),
  sprintDuration: document.getElementById("sprintDuration"),
  sprintStartDate: document.getElementById("sprintStartDate"),
  startingSprintNumber: document.getElementById("startingSprintNumber"),
  csvInput: document.getElementById("csvInput"),
  loadExampleBtn: document.getElementById("loadExampleBtn"),
  renderBtn: document.getElementById("renderBtn"),
  addRowBtn: document.getElementById("addRowBtn"),
  clearRowsBtn: document.getElementById("clearRowsBtn"),
  tbody: document.getElementById("activityTableBody"),
  rowTemplate: document.getElementById("activityRowTemplate"),
  status: document.getElementById("statusText"),
  scheduleSvg: document.getElementById("scheduleSvg"),
  downloadCsvBtn: document.getElementById("downloadCsvBtn"),
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

function signedWorkingDaysBetween(startDate, endDate) {
  return endDate >= startDate
    ? workingDaysBetween(startDate, endDate)
    : -workingDaysBetween(endDate, startDate);
}

function clearRows() {
  els.tbody.innerHTML = "";
}

function addRow(activity = {}) {
  const row = els.rowTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector('[data-field="id"]').value = activity.id || "";
  row.querySelector('[data-field="name"]').value = activity.name || "";
  row.querySelector('[data-field="swimlane"]').value = activity.swimlane || "";
  row.querySelector('[data-field="subSwimlane"]').value = activity.subSwimlane || "";
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
    const subSwimlane = row.querySelector('[data-field="subSwimlane"]').value.trim();
    const durationRaw = row.querySelector('[data-field="duration"]').value.trim();
    const dependenciesRaw = row
      .querySelector('[data-field="dependencies"]')
      .value.trim();
    const milestone = row.querySelector('[data-field="milestone"]').checked;

    if (!id && !name && !swimlane && !subSwimlane && !durationRaw && !dependenciesRaw && !milestone) {
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

    activities.push({ id, name, swimlane, subSwimlane, duration, dependencies, milestone });
  }

  return activities;
}

function parseCsv(text) {
  function normalizeCsvHeader(value) {
    return value
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/[?()]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function parseCsvRows(rawText) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < rawText.length; i += 1) {
      const char = rawText[i];
      const next = rawText[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(cell.trim());
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") {
          i += 1;
        }
        row.push(cell.trim());
        if (row.some((value) => value !== "")) {
          rows.push(row);
        }
        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    row.push(cell.trim());
    if (row.some((value) => value !== "")) {
      rows.push(row);
    }

    return rows;
  }

  const rows = parseCsvRows(text);

  if (rows.length < 2) {
    throw new Error("CSV should include a header row plus at least one data row.");
  }

  const headerAliases = {
    id: ["id", "activityid"],
    name: ["name", "activityname", "activity"],
    swimlane: ["swimlane", "swimlanes", "lane"],
    subSwimlane: ["subswimlane", "subswimlanes", "sublane"],
    duration: ["duration", "workingdays", "durationworkingdays", "days"],
    dependencies: ["dependencies", "dependency", "dependson", "predecessors", "predecessor"],
    milestone: ["milestone", "ismilestone"]
  };

  const normalizedHeaders = rows[0].map(normalizeCsvHeader);
  const idx = {};
  Object.entries(headerAliases).forEach(([field, aliases]) => {
    idx[field] = normalizedHeaders.findIndex((header) => aliases.includes(header));
  });

  const missing = ["id", "name", "swimlane", "duration", "dependencies", "milestone"].filter(
    (field) => idx[field] === -1
  );
  if (missing.length) {
    throw new Error(`Missing CSV columns: ${missing.join(", ")}`);
  }

  return rows.slice(1).map((cols, rowNum) => {
    const id = (cols[idx.id] || "").trim();
    const name = (cols[idx.name] || "").trim();
    const swimlane = (cols[idx.swimlane] || "").trim();
    const subSwimlane = idx.subSwimlane >= 0 ? (cols[idx.subSwimlane] || "").trim() : "";
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

    return { id, name, swimlane, subSwimlane, duration, dependencies, milestone };
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

function formatMonthYear(date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatDayMonth(date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
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

function subSwimlaneKey(node) {
  return `${node.swimlane}:::${node.subSwimlane || ""}`;
}

function subSwimlaneLabel(value) {
  return value || "General";
}

function buildTaskLayout(taskNodes) {
  const swimlaneOrder = laneOrder(taskNodes);
  const subgroupOrder = [];
  const subgroupMeta = new Map();
  const subgroupsBySwimlane = new Map(swimlaneOrder.map((lane) => [lane, []]));
  taskNodes.forEach((node) => {
    const key = subSwimlaneKey(node);
    if (!subgroupMeta.has(key)) {
      subgroupMeta.set(key, {
        swimlane: node.swimlane,
        subSwimlane: node.subSwimlane || ""
      });
      subgroupOrder.push(key);
      subgroupsBySwimlane.get(node.swimlane).push(key);
    }
  });

  const rowsByLane = new Map(subgroupOrder.map((key) => [key, []]));
  const taskRow = new Map();

  [...taskNodes]
    .sort((a, b) => a.es - b.es || a.ef - b.ef || a.id.localeCompare(b.id))
    .forEach((node) => {
      const key = subSwimlaneKey(node);
      const rows = rowsByLane.get(key);
      let rowIdx = rows.findIndex((rowEnd) => rowEnd <= node.es);

      if (rowIdx === -1) {
        rowIdx = rows.length;
        rows.push(node.ef);
      } else {
        rows[rowIdx] = node.ef;
      }

      taskRow.set(node.id, rowIdx);
    });

  return { swimlaneOrder, subgroupOrder, subgroupMeta, subgroupsBySwimlane, rowsByLane, taskRow };
}

function clampLabelLine(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(maxChars - 1, 1)).trimEnd()}...`;
}

function wrapTaskLabel(text, maxWidth) {
  const maxCharsPerLine = Math.max(Math.floor(maxWidth / 3.6), 4);
  if (text.length <= maxCharsPerLine) {
    return [text];
  }

  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      return;
    }

    if (!current) {
      lines.push(clampLabelLine(word, maxCharsPerLine));
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length === 1) {
    return [clampLabelLine(lines[0], maxCharsPerLine)];
  }

  return [
    clampLabelLine(lines[0], maxCharsPerLine),
    clampLabelLine(lines.slice(1).join(" "), maxCharsPerLine)
  ];
}

function estimateLabelWidth(text) {
  return text.length * 3.6;
}

function buildTimelineDates(firstWorkDay, projectDuration) {
  const dates = [];
  for (let d = 0; d <= projectDuration + 1; d += 1) {
    dates.push(addWorkingDays(firstWorkDay, d));
  }
  return dates;
}

function buildMonthSegments(dates) {
  const segments = [];

  dates.forEach((date, idx) => {
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const existing = segments[segments.length - 1];

    if (existing && existing.key === key) {
      existing.endIdx = idx;
      return;
    }

    segments.push({
      key,
      label: formatMonthYear(date),
      startIdx: idx,
      endIdx: idx
    });
  });

  return segments;
}

function buildQuarterSegments(monthSegments) {
  const segments = [];

  monthSegments.forEach((segment) => {
    const [yearStr, monthStr] = segment.key.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const quarter = Math.floor(month / 3) + 1;
    const key = `${year}-Q${quarter}`;
    const existing = segments[segments.length - 1];

    if (existing && existing.key === key) {
      existing.endIdx = segment.endIdx;
      return;
    }

    segments.push({
      key,
      label: `Q${quarter}`,
      startIdx: segment.startIdx,
      endIdx: segment.endIdx
    });
  });

  return segments;
}

function buildYearSegments(monthSegments) {
  const segments = [];

  monthSegments.forEach((segment) => {
    const [yearStr] = segment.key.split("-");
    const existing = segments[segments.length - 1];

    if (existing && existing.key === yearStr) {
      existing.endIdx = segment.endIdx;
      return;
    }

    segments.push({
      key: yearStr,
      label: yearStr,
      startIdx: segment.startIdx,
      endIdx: segment.endIdx
    });
  });

  return segments;
}

function buildSprintSegments(dates, sprintSettings) {
  const sprintStart = nextWorkingDay(sprintSettings.startDate);
  const segments = [];

  dates.forEach((date, idx) => {
    const offset = signedWorkingDaysBetween(sprintStart, date);
    const sprintIndex = Math.floor(offset / sprintSettings.duration);
    const sprintNumber = sprintSettings.startNumber + sprintIndex;
    const existing = segments[segments.length - 1];

    if (existing && existing.sprintNumber === sprintNumber) {
      existing.endIdx = idx;
      return;
    }

    segments.push({
      sprintNumber,
      label: `Sprint ${sprintNumber}`,
      startDate: date,
      endDate: date,
      startIdx: idx,
      endIdx: idx
    });
  });

  segments.forEach((segment) => {
    segment.endDate = dates[segment.endIdx];
  });

  return segments;
}

function readSprintSettings() {
  if (!els.showSprints.checked) {
    return { enabled: false };
  }

  const duration = Number(els.sprintDuration.value);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error("Sprint duration must be a positive whole number of working days.");
  }

  const startDate = parseISODate(els.sprintStartDate.value);
  if (!startDate) {
    throw new Error("Please choose a valid sprint start date.");
  }

  const startNumber = Number(els.startingSprintNumber.value);
  if (!Number.isInteger(startNumber)) {
    throw new Error("Starting sprint number must be a whole number.");
  }

  return {
    enabled: true,
    duration,
    startDate,
    startNumber
  };
}

function updateSprintControls() {
  const enabled = els.showSprints.checked;
  els.sprintSettings.classList.toggle("is-disabled", !enabled);
  els.sprintDuration.disabled = !enabled;
  els.sprintStartDate.disabled = !enabled;
  els.startingSprintNumber.disabled = !enabled;
}

function renderSvg(schedule, showCritical, sprintSettings) {
  const { graph, order, projectDuration, firstWorkDay } = schedule;
  const nodes = order.map((id) => graph.get(id));
  const taskNodes = nodes.filter((node) => !node.milestone);
  const { swimlaneOrder, subgroupMeta, subgroupsBySwimlane, rowsByLane, taskRow } = buildTaskLayout(taskNodes);
  const colors = laneColorMap(swimlaneOrder);

  const margin = { top: 18, right: 18, bottom: 18, left: 112 };
  const dayWidth = 20;
  const yearRowHeight = 13;
  const quarterRowHeight = 13;
  const monthRowHeight = 13;
  const monthRowY = margin.top + yearRowHeight + quarterRowHeight;
  const sprintRowHeight = 13;
  const timescaleHeight = yearRowHeight + quarterRowHeight + monthRowHeight + sprintRowHeight;
  const milestoneBandHeight = 24;
  const rowHeight = 28;
  const lanePaddingY = 7;
  const laneGap = 4;
  const swimlaneBandX = 20;
  const swimlaneBandWidth = 39;
  const swimlaneLabelX = swimlaneBandX + swimlaneBandWidth;
  const swimlaneLabelWidth = margin.left - swimlaneLabelX;
  const width = margin.left + margin.right + Math.max(projectDuration + 2, 12) * dayWidth;
  const timelineDates = buildTimelineDates(firstWorkDay, projectDuration);
  const monthSegments = buildMonthSegments(timelineDates);
  const quarterSegments = buildQuarterSegments(monthSegments);
  const yearSegments = buildYearSegments(monthSegments);
  const sprintSegments = sprintSettings?.enabled ? buildSprintSegments(timelineDates, sprintSettings) : [];

  let laneCursorY = margin.top + timescaleHeight + milestoneBandHeight;
  const subgroupLayout = new Map();
  const laneLayout = new Map();
  swimlaneOrder.forEach((lane) => {
    const subgroupKeys = subgroupsBySwimlane.get(lane);
    const swimlaneStartY = laneCursorY;

    subgroupKeys.forEach((key) => {
      const rowCount = Math.max(rowsByLane.get(key).length, 1);
      const subgroupHeight = lanePaddingY * 2 + rowCount * rowHeight;
      subgroupLayout.set(key, { y: laneCursorY, height: subgroupHeight, rowCount });
      laneCursorY += subgroupHeight;
    });

    laneLayout.set(lane, { y: swimlaneStartY, height: laneCursorY - swimlaneStartY, subgroupKeys });
    laneCursorY += laneGap;
  });

  const height = laneCursorY - laneGap + margin.bottom;

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

  const defs = document.createElementNS(ns, "defs");
  const dependencyArrow = document.createElementNS(ns, "marker");
  dependencyArrow.setAttribute("id", "dependency-arrow");
  dependencyArrow.setAttribute("viewBox", "0 0 6 6");
  dependencyArrow.setAttribute("refX", "5.25");
  dependencyArrow.setAttribute("refY", "3");
  dependencyArrow.setAttribute("markerWidth", "6");
  dependencyArrow.setAttribute("markerHeight", "6");
  dependencyArrow.setAttribute("markerUnits", "strokeWidth");
  dependencyArrow.setAttribute("orient", "auto");

  const dependencyArrowPath = document.createElementNS(ns, "path");
  dependencyArrowPath.setAttribute("d", "M 0 0 L 6 3 L 0 6 Z");
  dependencyArrowPath.setAttribute("fill", "#404040");
  dependencyArrow.appendChild(dependencyArrowPath);
  defs.appendChild(dependencyArrow);
  els.scheduleSvg.appendChild(defs);

  const taskLabelOverlays = [];

  yearSegments.forEach((segment) => {
    const x = margin.left + segment.startIdx * dayWidth;
    const segmentWidth = (segment.endIdx - segment.startIdx + 1) * dayWidth;

    const yearRect = document.createElementNS(ns, "path");
    yearRect.setAttribute(
      "d",
      [
        `M ${x} ${margin.top + 2.888}`,
        `Q ${x} ${margin.top} ${x + 2.933} ${margin.top}`,
        `H ${x + segmentWidth - 2.933}`,
        `Q ${x + segmentWidth} ${margin.top} ${x + segmentWidth} ${margin.top + 2.888}`,
        `V ${margin.top + yearRowHeight}`,
        `H ${x}`,
        "Z"
      ].join(" ")
    );
    yearRect.setAttribute("fill", "#404040");
    els.scheduleSvg.appendChild(yearRect);

    const yearLabel = document.createElementNS(ns, "text");
    yearLabel.textContent = segment.label;
    yearLabel.setAttribute("x", (x + 4).toString());
    yearLabel.setAttribute("y", (margin.top + 10).toString());
    yearLabel.setAttribute("class", "timescale-major");
    els.scheduleSvg.appendChild(yearLabel);
  });

  quarterSegments.forEach((segment) => {
    const x = margin.left + segment.startIdx * dayWidth;
    const segmentWidth = (segment.endIdx - segment.startIdx + 1) * dayWidth;

    const quarterRect = document.createElementNS(ns, "rect");
    quarterRect.setAttribute("x", x.toString());
    quarterRect.setAttribute("y", (margin.top + yearRowHeight).toString());
    quarterRect.setAttribute("width", segmentWidth.toString());
    quarterRect.setAttribute("height", quarterRowHeight.toString());
    quarterRect.setAttribute("fill", "#595959");
    els.scheduleSvg.appendChild(quarterRect);

    const quarterLabel = document.createElementNS(ns, "text");
    quarterLabel.textContent = segment.label;
    quarterLabel.setAttribute("x", (x + 4).toString());
    quarterLabel.setAttribute("y", (margin.top + yearRowHeight + 9).toString());
    quarterLabel.setAttribute("class", "timescale-major");
    els.scheduleSvg.appendChild(quarterLabel);

    if (segment !== quarterSegments[quarterSegments.length - 1]) {
      const divider = document.createElementNS(ns, "rect");
      divider.setAttribute("x", (x + segmentWidth).toString());
      divider.setAttribute("y", (margin.top + yearRowHeight).toString());
      divider.setAttribute("width", "1");
      divider.setAttribute("height", quarterRowHeight.toString());
      divider.setAttribute("fill", "#7c7878");
      els.scheduleSvg.appendChild(divider);
    }
  });

  const monthBand = document.createElementNS(ns, "path");
  monthBand.setAttribute(
    "d",
    [
      `M ${margin.left} ${monthRowY}`,
      `H ${width - margin.right}`,
      `V ${monthRowY + monthRowHeight - 2.889}`,
      `Q ${width - margin.right} ${monthRowY + monthRowHeight} ${width - margin.right - 2.933} ${
        monthRowY + monthRowHeight
      }`,
      `H ${margin.left + 2.933}`,
      `Q ${margin.left} ${monthRowY + monthRowHeight} ${margin.left} ${monthRowY + monthRowHeight - 2.889}`,
      "Z"
    ].join(" ")
  );
  monthBand.setAttribute("fill", "#7f7f7f");
  els.scheduleSvg.appendChild(monthBand);

  monthSegments.forEach((segment, idx) => {
    const x = margin.left + segment.startIdx * dayWidth;
    const segmentWidth = (segment.endIdx - segment.startIdx + 1) * dayWidth;

    const monthLabel = document.createElementNS(ns, "text");
    monthLabel.textContent = timelineDates[segment.startIdx].toLocaleDateString("en-GB", {
      month: "short",
      timeZone: "UTC"
    });
    monthLabel.setAttribute("x", (x + 4).toString());
    monthLabel.setAttribute("y", (monthRowY + 9).toString());
    monthLabel.setAttribute("class", "timescale-major");
    els.scheduleSvg.appendChild(monthLabel);

    if (idx !== monthSegments.length - 1) {
      const divider = document.createElementNS(ns, "rect");
      divider.setAttribute("x", (x + segmentWidth).toString());
      divider.setAttribute("y", monthRowY.toString());
      divider.setAttribute("width", "1");
      divider.setAttribute("height", monthRowHeight.toString());
      divider.setAttribute("fill", "#8b8b8b");
      els.scheduleSvg.appendChild(divider);
    }
  });

  {
    const sprintRowY = monthRowY + monthRowHeight;
    const sprintBand = document.createElementNS(ns, "rect");
    sprintBand.setAttribute("x", margin.left.toString());
    sprintBand.setAttribute("y", sprintRowY.toString());
    sprintBand.setAttribute("width", (width - margin.left - margin.right).toString());
    sprintBand.setAttribute("height", sprintRowHeight.toString());
    sprintBand.setAttribute("fill", "#e9f1fb");
    sprintBand.setAttribute("stroke", "#d5e1ef");
    sprintBand.setAttribute("stroke-width", "1");
    els.scheduleSvg.appendChild(sprintBand);

    if (sprintSettings?.enabled) {
      sprintSegments.forEach((segment, idx) => {
        const x = margin.left + segment.startIdx * dayWidth;
        const segmentWidth = (segment.endIdx - segment.startIdx + 1) * dayWidth;

        const sprintLabel = document.createElementNS(ns, "text");
        sprintLabel.textContent = segment.label;
        sprintLabel.setAttribute("x", (x + segmentWidth / 2).toString());
        sprintLabel.setAttribute("y", (sprintRowY + 6).toString());
        sprintLabel.setAttribute("class", "timescale-sprint");
        sprintLabel.setAttribute("text-anchor", "middle");
        els.scheduleSvg.appendChild(sprintLabel);

        const sprintDates = document.createElementNS(ns, "text");
        sprintDates.textContent = `${formatDayMonth(segment.startDate)} - ${formatDayMonth(segment.endDate)}`;
        sprintDates.setAttribute("x", (x + segmentWidth / 2).toString());
        sprintDates.setAttribute("y", (sprintRowY + 11).toString());
        sprintDates.setAttribute("class", "timescale-sprint-date");
        sprintDates.setAttribute("text-anchor", "middle");
        els.scheduleSvg.appendChild(sprintDates);

        if (idx !== sprintSegments.length - 1) {
          const divider = document.createElementNS(ns, "rect");
          divider.setAttribute("x", (x + segmentWidth).toString());
          divider.setAttribute("y", sprintRowY.toString());
          divider.setAttribute("width", "1");
          divider.setAttribute("height", sprintRowHeight.toString());
          divider.setAttribute("fill", "#cad8e8");
          els.scheduleSvg.appendChild(divider);
        }
      });
    } else {
      timelineDates.forEach((date, idx) => {
        const x = margin.left + idx * dayWidth;

        const dayCell = document.createElementNS(ns, "rect");
        dayCell.setAttribute("x", x.toString());
        dayCell.setAttribute("y", sprintRowY.toString());
        dayCell.setAttribute("width", dayWidth.toString());
        dayCell.setAttribute("height", sprintRowHeight.toString());
        dayCell.setAttribute("fill", idx % 2 === 0 ? "#f7fbff" : "#eef5fd");
        dayCell.setAttribute("stroke", "#d5e1ef");
        dayCell.setAttribute("stroke-width", "1");
        els.scheduleSvg.appendChild(dayCell);

        const dayLabel = document.createElementNS(ns, "text");
        dayLabel.textContent = formatDayMonth(date);
        dayLabel.setAttribute("x", (x + dayWidth / 2).toString());
        dayLabel.setAttribute("y", (sprintRowY + 8).toString());
        dayLabel.setAttribute("class", "timescale-day");
        dayLabel.setAttribute("text-anchor", "middle");
        els.scheduleSvg.appendChild(dayLabel);
      });
    }
  }

  const milestoneBand = document.createElementNS(ns, "rect");
  milestoneBand.setAttribute("x", margin.left.toString());
  milestoneBand.setAttribute("y", (margin.top + timescaleHeight).toString());
  milestoneBand.setAttribute("width", (width - margin.left - margin.right).toString());
  milestoneBand.setAttribute("height", milestoneBandHeight.toString());
  milestoneBand.setAttribute("fill", "#ffffff");
  milestoneBand.setAttribute("stroke", "#eceff4");
  milestoneBand.setAttribute("stroke-width", "1");
  els.scheduleSvg.appendChild(milestoneBand);

  const milestoneLabel = document.createElementNS(ns, "text");
  milestoneLabel.textContent = "Milestones";
  milestoneLabel.setAttribute("x", swimlaneLabelX.toString());
  milestoneLabel.setAttribute("y", (margin.top + timescaleHeight + milestoneBandHeight / 2 + 3).toString());
  milestoneLabel.setAttribute("class", "lane-label");
  els.scheduleSvg.appendChild(milestoneLabel);

  swimlaneOrder.forEach((lane) => {
    const { y, height: laneHeight, subgroupKeys } = laneLayout.get(lane);
    const c = colors.get(lane);

    const swimlaneBand = document.createElementNS(ns, "rect");
    swimlaneBand.setAttribute("x", swimlaneBandX.toString());
    swimlaneBand.setAttribute("y", y.toString());
    swimlaneBand.setAttribute("width", swimlaneBandWidth.toString());
    swimlaneBand.setAttribute("height", laneHeight.toString());
    swimlaneBand.setAttribute("fill", c.bandFill);
    els.scheduleSvg.appendChild(swimlaneBand);

    const laneRect = document.createElementNS(ns, "rect");
    laneRect.setAttribute("x", margin.left.toString());
    laneRect.setAttribute("y", y.toString());
    laneRect.setAttribute("width", (width - margin.left - margin.right).toString());
    laneRect.setAttribute("height", laneHeight.toString());
    laneRect.setAttribute("fill", c.laneFill);
    laneRect.setAttribute("stroke", "#f4ebe0");
    laneRect.setAttribute("stroke-width", "1");
    els.scheduleSvg.appendChild(laneRect);

    const bandLabel = document.createElementNS(ns, "text");
    bandLabel.textContent = lane;
    bandLabel.setAttribute("x", (swimlaneBandX + swimlaneBandWidth / 2).toString());
    bandLabel.setAttribute("y", (y + laneHeight / 2).toString());
    bandLabel.setAttribute("class", "lane-band-label");
    bandLabel.setAttribute(
      "transform",
      `rotate(-90 ${swimlaneBandX + swimlaneBandWidth / 2} ${y + laneHeight / 2})`
    );
    bandLabel.setAttribute("text-anchor", "middle");
    els.scheduleSvg.appendChild(bandLabel);

    subgroupKeys.forEach((key) => {
      const subgroup = subgroupLayout.get(key);
      const meta = subgroupMeta.get(key);

      const swimlaneLabelBg = document.createElementNS(ns, "rect");
      swimlaneLabelBg.setAttribute("x", swimlaneLabelX.toString());
      swimlaneLabelBg.setAttribute("y", subgroup.y.toString());
      swimlaneLabelBg.setAttribute("width", swimlaneLabelWidth.toString());
      swimlaneLabelBg.setAttribute("height", subgroup.height.toString());
      swimlaneLabelBg.setAttribute("fill", c.labelFill);
      swimlaneLabelBg.setAttribute("stroke", c.labelStroke);
      swimlaneLabelBg.setAttribute("stroke-width", "1");
      els.scheduleSvg.appendChild(swimlaneLabelBg);

      const subLabel = document.createElementNS(ns, "text");
      subLabel.textContent = subSwimlaneLabel(meta.subSwimlane);
      subLabel.setAttribute("x", (swimlaneLabelX + swimlaneLabelWidth / 2).toString());
      subLabel.setAttribute("y", (subgroup.y + subgroup.height / 2 + 3).toString());
      subLabel.setAttribute("class", "lane-label");
      subLabel.setAttribute("text-anchor", "middle");
      els.scheduleSvg.appendChild(subLabel);
    });
  });

  for (let d = 0; d <= projectDuration + 1; d += 1) {
    const x = margin.left + d * dayWidth;

    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", x.toString());
    line.setAttribute("x2", x.toString());
    line.setAttribute("y1", (margin.top + timescaleHeight).toString());
    line.setAttribute("y2", (height - margin.bottom).toString());
    line.setAttribute("stroke", "#d8effe");
    line.setAttribute("stroke-width", "1");
    els.scheduleSvg.appendChild(line);
  }

  nodes.forEach((node) => {
    const lane = subgroupLayout.get(subSwimlaneKey(node));
    const taskRowIdx = taskRow.get(node.id) || 0;
    const yBase = node.milestone
      ? margin.top + timescaleHeight
      : lane.y + lanePaddingY + taskRowIdx * rowHeight;
    const barY = node.milestone ? margin.top + timescaleHeight + 4 : yBase + 2;
    const taskBarHeight = 12;
    const x = margin.left + node.es * dayWidth;
    const widthDays = Math.max(node.duration, 1);
    const barW = widthDays * dayWidth - 4;
    const c = node.milestone
      ? { taskFill: "#000000", stroke: "#000000" }
      : colors.get(node.swimlane);

    if (node.milestone) {
      const cx = x + dayWidth / 2;
      const cy = margin.top + timescaleHeight + milestoneBandHeight / 2;
      const size = 7;
      const diamond = document.createElementNS(ns, "polygon");
      diamond.setAttribute(
        "points",
        `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`
      );
      diamond.setAttribute("fill", "#000000");
      diamond.setAttribute("stroke", showCritical && node.critical ? "#d92332" : "#000000");
      diamond.setAttribute("stroke-width", showCritical && node.critical ? "3" : "1");
      els.scheduleSvg.appendChild(diamond);

      const nameLabel = document.createElementNS(ns, "text");
      nameLabel.textContent = node.name;
      nameLabel.setAttribute("x", (cx + 9).toString());
      nameLabel.setAttribute("y", (cy - 1).toString());
      nameLabel.setAttribute("class", "milestone-label");
      els.scheduleSvg.appendChild(nameLabel);

      const dateLabel = document.createElementNS(ns, "text");
      dateLabel.textContent = formatDate(node.startDate);
      dateLabel.setAttribute("x", (cx + 9).toString());
      dateLabel.setAttribute("y", (cy + 6).toString());
      dateLabel.setAttribute("class", "milestone-date-label");
      els.scheduleSvg.appendChild(dateLabel);
    } else {
      const taskWidth = Math.max(barW, 18);
      const tip = Math.min(5, taskWidth / 3);
      const barStartX = x + 2;
      const barEndX = barStartX + taskWidth;
      const bar = document.createElementNS(ns, "path");
      bar.setAttribute(
        "d",
        [
          `M ${barStartX} ${barY}`,
          `H ${barEndX - tip}`,
          `L ${barEndX} ${barY + taskBarHeight / 2}`,
          `L ${barEndX - tip} ${barY + taskBarHeight}`,
          `H ${barStartX}`,
          "Z"
        ].join(" ")
      );
      bar.setAttribute("fill", c.taskFill);
      bar.setAttribute("stroke", showCritical && node.critical ? "#d92332" : c.stroke);
      bar.setAttribute("stroke-width", showCritical && node.critical ? "2" : "1");
      els.scheduleSvg.appendChild(bar);

      const labelText = `${node.name} (${node.duration}d)`;
      const rightSpace = width - margin.right - barEndX - 8;
      const leftSpace = barStartX - margin.left - 8;
      const preferRight = rightSpace >= leftSpace;
      const labelMaxWidth = Math.max((preferRight ? rightSpace : leftSpace) - 4, 24);
      const labelLines = wrapTaskLabel(labelText, labelMaxWidth);
      const labelWidth = Math.max(...labelLines.map((line) => estimateLabelWidth(line)));
      const canFitRight = rightSpace >= labelWidth;
      const canFitLeft = leftSpace >= labelWidth;
      const placeRight = canFitRight || (!canFitLeft && preferRight);
      const labelX = placeRight ? barEndX + 10 : barStartX - 10;
      const labelAnchor = placeRight ? "start" : "end";
      const labelLineStep = 5;
      const labelCenterY = barY + taskBarHeight / 2;

      const label = document.createElementNS(ns, "text");
      label.setAttribute("x", labelX.toString());
      label.setAttribute("y", labelCenterY.toString());
      label.setAttribute("class", "task-label");
      label.setAttribute("text-anchor", labelAnchor);
      label.setAttribute("dominant-baseline", "middle");

      labelLines.forEach((line, index) => {
        const tspan = document.createElementNS(ns, "tspan");
        tspan.textContent = line;
        tspan.setAttribute("x", labelX.toString());
        tspan.setAttribute(
          "y",
          (labelCenterY + (index - (labelLines.length - 1) / 2) * labelLineStep).toString()
        );
        tspan.setAttribute("dominant-baseline", "middle");
        label.appendChild(tspan);
      });

      taskLabelOverlays.push(label);
    }

    node.dependencies.forEach((depId) => {
      const dep = graph.get(depId);
      const depLane = subgroupLayout.get(subSwimlaneKey(dep));
      const depRowIdx = taskRow.get(dep.id) || 0;
      const depBarY = dep.milestone
        ? margin.top + timescaleHeight + 4
        : depLane.y + lanePaddingY + depRowIdx * rowHeight + 2;
      const depX = margin.left + dep.ef * dayWidth;
      const depY = dep.milestone
        ? margin.top + timescaleHeight + milestoneBandHeight / 2
        : depBarY + taskBarHeight / 2;
      const targetX = node.milestone
        ? margin.left + node.es * dayWidth + dayWidth / 2 - 7
        : x + 2;
      const targetY = node.milestone
        ? margin.top + timescaleHeight + milestoneBandHeight / 2
        : barY + taskBarHeight / 2;
      const finalApproachX = targetX - 6;
      const backtracks = depX >= finalApproachX;
      const sourceExitX = backtracks ? depX + 8 : depX;
      const underSourceY = dep.milestone ? depY + 10 : depBarY + taskBarHeight + 6;
      const milestoneRiseY = node.milestone ? Math.max(targetY + 6, depY - 10) : targetY;

      const path = document.createElementNS(ns, "path");
      const elbowX = depX < finalApproachX
        ? depX + Math.max((finalApproachX - depX) / 2, 8)
        : Math.max(margin.left - 10, targetX - 18);
      path.setAttribute(
        "d",
        node.milestone
          ? backtracks
            ? `M ${depX} ${depY} H ${sourceExitX} V ${milestoneRiseY} H ${elbowX} V ${targetY} H ${finalApproachX} H ${targetX}`
            : `M ${depX} ${depY} H ${elbowX} V ${targetY} H ${finalApproachX} H ${targetX}`
          : backtracks
          ? `M ${depX} ${depY} H ${sourceExitX} V ${underSourceY} H ${elbowX} V ${targetY} H ${finalApproachX} H ${targetX}`
          : `M ${depX} ${depY} H ${elbowX} V ${targetY} H ${finalApproachX} H ${targetX}`
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#404040");
      path.setAttribute("stroke-width", "1");
      path.setAttribute("marker-end", "url(#dependency-arrow)");
      path.setAttribute("opacity", "1");
      els.scheduleSvg.appendChild(path);
    });
  });

  taskLabelOverlays.forEach((label) => {
    els.scheduleSvg.appendChild(label);
  });

  const legendX = width - 166;
  const legendY = 4;

  const legendBg = document.createElementNS(ns, "rect");
  legendBg.setAttribute("x", legendX.toString());
  legendBg.setAttribute("y", legendY.toString());
  legendBg.setAttribute("width", "154");
  legendBg.setAttribute("height", "16");
  legendBg.setAttribute("rx", "5");
  legendBg.setAttribute("fill", "#f3f7fd");
  legendBg.setAttribute("stroke", "#ccd9eb");
  els.scheduleSvg.appendChild(legendBg);

  const legend = document.createElementNS(ns, "text");
  legend.setAttribute("x", (legendX + 6).toString());
  legend.setAttribute("y", (legendY + 11).toString());
  legend.setAttribute("class", "axis-label");
  legend.textContent = "Bars: tasks. Diamonds: milestones.";
  els.scheduleSvg.appendChild(legend);
}

function buildExportSvgMarkup() {
  const exportSvg = els.scheduleSvg.cloneNode(true);
  const viewBox = (els.scheduleSvg.getAttribute("viewBox") || "0 0 800 400")
    .split(/\s+/)
    .map(Number);
  const [, , width = 800, height = 400] = viewBox;
  const ns = "http://www.w3.org/2000/svg";

  exportSvg.setAttribute("xmlns", ns);
  exportSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  exportSvg.setAttribute("width", width.toString());
  exportSvg.setAttribute("height", height.toString());
  exportSvg.setAttribute("preserveAspectRatio", "xMinYMin meet");

  const style = document.createElementNS(ns, "style");
  style.textContent = `
    text {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      text-rendering: geometricPrecision;
    }
    .lane-label { font-size: 7px; font-weight: 700; fill: #222222; }
    .lane-band-label { font-size: 7px; font-weight: 700; fill: #ffffff; }
    .axis-label { font-size: 6px; fill: #5a6b82; }
    .task-label { font-size: 6px; font-weight: 400; fill: #222222; }
    .milestone-label { font-size: 6px; fill: #222222; }
    .milestone-date-label { font-size: 5px; font-weight: 600; fill: #5a6b82; }
    .timescale-major { font-size: 8px; font-weight: 700; fill: #ffffff; }
    .timescale-sprint { font-size: 5.5px; font-weight: 700; fill: #466789; }
    .timescale-sprint-date { font-size: 4.5px; font-weight: 600; fill: #6c84a3; }
    .timescale-day { font-size: 5px; font-weight: 600; fill: #567392; }
  `;
  exportSvg.insertBefore(style, exportSvg.firstChild);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(exportSvg);
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  return /[",\r\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
}

function downloadCsv() {
  const activities = readActivitiesFromTable();
  if (!activities.length) {
    throw new Error("Please add at least one activity before exporting CSV.");
  }

  const rows = [
    ["id", "name", "swimlane", "subSwimlane", "duration", "dependencies", "milestone"],
    ...activities.map((activity) => [
      activity.id,
      activity.name,
      activity.swimlane,
      activity.subSwimlane || "",
      activity.duration,
      activity.dependencies.join(", "),
      activity.milestone ? "true" : "false"
    ])
  ];

  const csv = rows
    .map((row) => row.map((value) => csvEscape(value)).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cartoon-schedule-activities.csv";
  a.click();
  URL.revokeObjectURL(url);
  setStatus(`Exported ${activities.length} activities to CSV.`);
}

function downloadSvg() {
  const source = buildExportSvgMarkup();
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cartoon-schedule.svg";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPng() {
  const source = buildExportSvgMarkup();
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const viewBox = (els.scheduleSvg.getAttribute("viewBox") || "0 0 800 400")
      .split(" ")
      .map(Number);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = viewBox[2] * scale;
    canvas.height = viewBox[3] * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, viewBox[2], viewBox[3]);
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
  els.showSprints.checked = EXAMPLE_DATA.sprintSettings.enabled;
  els.sprintDuration.value = EXAMPLE_DATA.sprintSettings.duration;
  els.sprintStartDate.value = EXAMPLE_DATA.sprintSettings.startDate;
  els.startingSprintNumber.value = EXAMPLE_DATA.sprintSettings.startNumber;
  updateSprintControls();
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

    const sprintSettings = readSprintSettings();
    const schedule = computeSchedule(activities, startDate);
    renderSvg(schedule, els.showCriticalPath.checked, sprintSettings);

    const completionDate = addWorkingDays(schedule.firstWorkDay, schedule.projectDuration);
    const swimlaneCount = laneOrder(activities).length;
    const subSwimlaneCount = new Set(
      activities
        .filter((activity) => !activity.milestone)
        .map((activity) => subSwimlaneKey(activity))
    ).size;
    setStatus(
      `Built ${activities.length} activities across ${swimlaneCount} swim lanes and ${subSwimlaneCount} sub-swim lanes. ` +
        `Estimated completion: ${formatDate(completionDate)}.`
    );
  } catch (error) {
    setStatus(`Error: ${error.message}`);
  }
}

els.loadExampleBtn.addEventListener("click", loadExample);
els.renderBtn.addEventListener("click", buildAndRender);
els.showCriticalPath.addEventListener("change", buildAndRender);
els.showSprints.addEventListener("change", () => {
  updateSprintControls();
  buildAndRender();
});
els.sprintDuration.addEventListener("change", buildAndRender);
els.sprintStartDate.addEventListener("change", buildAndRender);
els.startingSprintNumber.addEventListener("change", buildAndRender);
els.addRowBtn.addEventListener("click", () => addRow());
els.clearRowsBtn.addEventListener("click", clearRows);
els.downloadCsvBtn.addEventListener("click", () => {
  try {
    downloadCsv();
  } catch (error) {
    setStatus(`CSV export error: ${error.message}`);
  }
});
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
  } finally {
    event.target.value = "";
  }
});

loadExample();
