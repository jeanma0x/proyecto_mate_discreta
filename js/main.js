// ======================
// Navegación de pestañas accesible
// ======================
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const tabPanels = Array.from(document.querySelectorAll(".view"));

tabPanels.forEach(panel => {
  const isActive = panel.classList.contains("active");
  panel.setAttribute("aria-hidden", isActive ? "false" : "true");
  panel.setAttribute("tabindex", isActive ? "0" : "-1");
});

function activateTab(targetBtn) {
  if (!targetBtn) return;
  const targetId = targetBtn.getAttribute("data-target");

  tabButtons.forEach(btn => {
    const isActive = btn === targetBtn;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  tabPanels.forEach(panel => {
    const isTarget = panel.id === targetId;
    panel.classList.toggle("active", isTarget);
    panel.hidden = !isTarget;
    panel.setAttribute("aria-hidden", isTarget ? "false" : "true");
    panel.setAttribute("tabindex", isTarget ? "0" : "-1");
    if (
      isTarget &&
      panel.id === "transporte" &&
      lastBusCoords &&
      busIcon &&
      busIcon.style.opacity !== "0"
    ) {
      requestAnimationFrame(() => setBusPosition(lastBusCoords.x, lastBusCoords.y));
    }
  });
}

tabButtons.forEach((btn, index) => {
  btn.addEventListener("click", () => activateTab(btn));
  btn.addEventListener("keydown", event => {
    const lastIndex = tabButtons.length - 1;
    let newIndex = index;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      newIndex = (index + 1) % tabButtons.length;
      tabButtons[newIndex].focus();
      activateTab(tabButtons[newIndex]);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      newIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      tabButtons[newIndex].focus();
      activateTab(tabButtons[newIndex]);
    } else if (event.key === "Home") {
      event.preventDefault();
      tabButtons[0].focus();
      activateTab(tabButtons[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      tabButtons[lastIndex].focus();
      activateTab(tabButtons[lastIndex]);
    }
  });
});

const initiallyActive = tabButtons.find(btn => btn.classList.contains("active")) || tabButtons[0];
activateTab(initiallyActive);

// ==========================
// 1. RED DE TRANSPORTE – DIJKSTRA + BUS + TABLA
// ==========================

const transportEdges = [
  { id: "A-B", u: "A", v: "B", inputId: "input-A-B", labelId: "label-A-B" },
  { id: "A-C", u: "A", v: "C", inputId: "input-A-C", labelId: "label-A-C" },
  { id: "B-C", u: "B", v: "C", inputId: "input-B-C", labelId: "label-B-C" },
  { id: "B-D", u: "B", v: "D", inputId: "input-B-D", labelId: "label-B-D" },
  { id: "C-D", u: "C", v: "D", inputId: "input-C-D", labelId: "label-C-D" },
  { id: "C-E", u: "C", v: "E", inputId: "input-C-E", labelId: "label-C-E" },
  { id: "D-E", u: "D", v: "E", inputId: "input-D-E", labelId: "label-D-E" },
  { id: "D-F", u: "D", v: "F", inputId: "input-D-F", labelId: "label-D-F" },
  { id: "E-F", u: "E", v: "F", inputId: "input-E-F", labelId: "label-E-F" },
];

const allTransportNodes = ["A","B","C","D","E","F"];

const nodeCoords = {
  A: { x: 80,  y: 70  },
  B: { x: 250, y: 60  },
  C: { x: 140, y: 170 },
  D: { x: 350, y: 150 },
  E: { x: 200, y: 260 },
  F: { x: 430, y: 230 }
};

const transportWrapper = document.querySelector("#transporte .graph-wrapper");
const TRANSPORT_VIEWBOX = { width: 520, height: 320 };
const busIcon = document.getElementById("bus-icon");
let lastTransportPath = null;
let busInterval = null;
let transportHighlightTimeouts = [];
let lastBusCoords = null;

function stopBusAnimation() {
  if (busInterval) {
    clearInterval(busInterval);
    busInterval = null;
  }
  if (busIcon) busIcon.classList.remove("bus-moving");
}

function buildTransportGraph() {
  const graph = {};
  allTransportNodes.forEach(n => { graph[n] = {}; });

  for (const edge of transportEdges) {
    const input = document.getElementById(edge.inputId);
    const w = parseFloat(input.value);
    if (isNaN(w) || w <= 0) continue;
    graph[edge.u][edge.v] = w;
    graph[edge.v][edge.u] = w;
  }
  return graph;
}

// Actualizar textos de etiquetas al cambiar inputs
transportEdges.forEach(edge => {
  const input = document.getElementById(edge.inputId);
  const label = document.getElementById(edge.labelId);
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    if (!isNaN(v) && v > 0) {
      label.textContent = v + " km";
    } else {
      label.textContent = "-";
    }
  });
});

function clearTransportNodeHighlight() {
  document.querySelectorAll("#transport-graph .node").forEach(n => {
    n.classList.remove("active");
  });
}

function highlightTransportNodes(path) {
  clearTransportNodeHighlight();
  path.forEach(nodeId => {
    const el = document.getElementById(`node-${nodeId}`);
    if (el) el.classList.add("active");
  });
}

function clearTransportHighlight() {
  document.querySelectorAll("#transport-graph .edge").forEach(e => {
    e.classList.remove("highlight", "path-active");
  });
  clearTransportNodeHighlight();
  transportHighlightTimeouts.forEach(t => clearTimeout(t));
  transportHighlightTimeouts = [];
}

function highlightTransportPath(path) {
  clearTransportHighlight();
  highlightTransportNodes(path);
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const id1 = `edge-${u}-${v}`;
    const id2 = `edge-${v}-${u}`;
    const edgeEl = document.getElementById(id1) || document.getElementById(id2);
    const timeout = setTimeout(() => {
      if (edgeEl) edgeEl.classList.add("highlight");
      if (edgeEl) edgeEl.classList.add("path-active");
    }, i * 220); // resalta de forma progresiva
    transportHighlightTimeouts.push(timeout);
  }
}

// Dijkstra con traza para tabla
function dijkstraWithTrace(graph, start) {
  const dist = {};
  const prev = {};
  const nodes = Object.keys(graph);
  const unvisited = new Set(nodes);
  const steps = [];

  // Inicialización
  nodes.forEach(node => {
    dist[node] = Infinity;
    prev[node] = null;
  });
  dist[start] = 0;

  while (unvisited.size > 0) {
    let u = null;
    let minDist = Infinity;

    // Elegir nodo no visitado con menor distancia
    for (const node of unvisited) {
      if (dist[node] < minDist) {
        minDist = dist[node];
        u = node;
      }
    }

    if (u === null || dist[u] === Infinity) break;

    // Marcamos u como visitado
    unvisited.delete(u);

    // Relajamos vecinos
    for (const [v, w] of Object.entries(graph[u])) {
      if (!unvisited.has(v)) continue;
      const alt = dist[u] + w;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }

    // Guardamos un snapshot de este paso
    steps.push({
      current: u,
      dist: { ...dist },
      visited: nodes.filter(n => !unvisited.has(n))
    });
  }

  return { dist, prev, steps };
}

function renderDijkstraTrace(steps, origen) {
  const box = document.getElementById("tabla-dijkstra");
  if (!box) return;

  if (!steps || steps.length === 0) {
    box.textContent = "No hay pasos para mostrar. Verifica los pesos y vuelve a intentar.";
    box.classList.remove("show");
    void box.offsetWidth;
    box.classList.add("show");
    return;
  }

  const nodes = allTransportNodes;
  let html = "<strong>Pasos del algoritmo de Dijkstra (origen " + origen + ")</strong><br/><br/>";
  html += '<table class="small-table"><thead><tr><th>Iteración</th><th>Nodo elegido</th>';

  nodes.forEach(n => {
    html += "<th>dist(" + n + ")</th>";
  });
  html += "</tr></thead><tbody>";

  steps.forEach((s, idx) => {
    html += "<tr>";
    html += "<td>" + (idx + 1) + "</td>";
    html += "<td>" + (s.current || "–") + "</td>";
    nodes.forEach(n => {
      const d = s.dist[n];
      html += "<td>" + (d === undefined || d === Infinity ? "∞" : d) + "</td>";
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  html += '<p style="margin-top:0.4rem;font-size:0.75rem;color:#9ca3af;">'
       + 'En cada fila se ve el nodo elegido en esa iteración y las distancias mínimas conocidas hasta ese momento.'
       + "</p>";

  box.innerHTML = html;
  box.classList.remove("show");
  void box.offsetWidth;
  box.classList.add("show");
}

function reconstructPath(prev, start, end) {
  const path = [];
  let cur = end;
  while (cur !== null) {
    path.push(cur);
    cur = prev[cur];
  }
  path.reverse();
  if (path[0] === start && path.every(p => p !== undefined)) return path;
  return null;
}

function toWrapperCoords(x, y) {
  if (!transportWrapper) return { left: x, top: y };
  const width = transportWrapper.clientWidth || TRANSPORT_VIEWBOX.width;
  const height = transportWrapper.clientHeight || TRANSPORT_VIEWBOX.height;
  return {
    left: (x / TRANSPORT_VIEWBOX.width) * width,
    top: (y / TRANSPORT_VIEWBOX.height) * height
  };
}

function setBusPosition(x, y) {
  if (!busIcon) return;
  const { left, top } = toWrapperCoords(x, y);
  busIcon.style.left = left + "px";
  busIcon.style.top = top + "px";
  busIcon.style.opacity = "1";
  lastBusCoords = { x, y };
}

function animateBusAlong(path) {
  if (!path || path.length < 2 || !busIcon) return;
  stopBusAnimation();
  busIcon.classList.add("bus-moving");

  let segIndex = 0;
  let step = 0;
  const stepsPerSegment = 30;
  const delay = 40;

  busInterval = setInterval(() => {
    const fromNode = path[segIndex];
    const toNode   = path[segIndex + 1];
    const from = nodeCoords[fromNode];
    const to   = nodeCoords[toNode];
    if (!from || !to) return;

    const t = step / stepsPerSegment;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    setBusPosition(x, y);

    step++;
    if (step > stepsPerSegment) {
      segIndex++;
      step = 0;
      if (segIndex >= path.length - 1) {
        stopBusAnimation();
      }
    }
  }, delay);
}

document.getElementById("btn-dijkstra").addEventListener("click", () => {
  const origen = document.getElementById("origen").value;
  const destino = document.getElementById("destino").value;
  const box = document.getElementById("resultado-dijkstra");

  const graph = buildTransportGraph();
  const { dist, prev, steps } = dijkstraWithTrace(graph, origen);
  const path = reconstructPath(prev, origen, destino);

  if (!path) {
    box.textContent = "No existe un camino válido entre " + origen + " y " + destino +
      ". Revisa que todas las aristas necesarias tengan un peso válido (> 0).";
    clearTransportHighlight();
    lastTransportPath = null;
    if (busIcon) {
      busIcon.style.opacity = "0";
      busIcon.classList.remove("bus-moving");
    }
    const tabla = document.getElementById("tabla-dijkstra");
    if (tabla) {
      tabla.textContent = "No se pudo completar el cálculo. Revisa los pesos y vuelve a intentarlo.";
      tabla.classList.remove("show");
      void tabla.offsetWidth;
      tabla.classList.add("show");
    }
    return;
  }

  highlightTransportPath(path);
  const distancia = dist[destino];
  box.textContent =
    "Ruta más corta de " + origen + " a " + destino + ":\n" +
    path.join(" → ") + "\n\n" +
    "Distancia total: " + distancia + " km.";

  renderDijkstraTrace(steps, origen);

  lastTransportPath = path;
  const start = nodeCoords[path[0]];
  if (start) setBusPosition(start.x, start.y);
});

document.getElementById("btn-reset-dijkstra").addEventListener("click", () => {
  clearTransportHighlight();
  document.getElementById("resultado-dijkstra").textContent =
    "Resaltado limpiado. Vuelve a calcular una ruta si lo deseas.";
  lastTransportPath = null;
  stopBusAnimation();
  if (busIcon) busIcon.style.opacity = "0";

  const tabla = document.getElementById("tabla-dijkstra");
  if (tabla) {
    tabla.textContent = "Aquí aparecerán los pasos de Dijkstra para la configuración actual.";
    tabla.classList.remove("show");
    void tabla.offsetWidth;
    tabla.classList.add("show");
  }
});

document.getElementById("btn-anim-bus").addEventListener("click", () => {
  const box = document.getElementById("resultado-dijkstra");
  if (!lastTransportPath) {
    box.textContent =
      "Primero calcula una ruta más corta, luego podrás animar el recorrido del bus.";
    return;
  }
  animateBusAlong(lastTransportPath);
});

document.getElementById("btn-random-weights").addEventListener("click", () => {
  // randomiza pesos entre 1 y 12 km
  transportEdges.forEach(edge => {
    const input = document.getElementById(edge.inputId);
    const label = document.getElementById(edge.labelId);
    const val = Math.floor(Math.random() * 12) + 1;
    input.value = val;
    label.textContent = val + " km";
  });
  document.getElementById("resultado-dijkstra").textContent =
    "Se generó un escenario alterno con distancias aleatorias. Ahora puedes recalcular rutas.";
  clearTransportHighlight();
  lastTransportPath = null;
  stopBusAnimation();
  if (busIcon) busIcon.style.opacity = "0";

  const tabla = document.getElementById("tabla-dijkstra");
  if (tabla) {
    tabla.textContent = "Se cambiaron las distancias. Vuelve a calcular para ver la nueva tabla de pasos.";
    tabla.classList.remove("show");
    void tabla.offsetWidth;
    tabla.classList.add("show");
  }
});

// Posición inicial del bus en A
const startA = nodeCoords["A"];
if (startA) setBusPosition(startA.x, startA.y);

window.addEventListener("resize", () => {
  if (lastBusCoords && busIcon && busIcon.style.opacity !== "0") {
    setBusPosition(lastBusCoords.x, lastBusCoords.y);
  }
});

// ==========================
// 2. RED ELÉCTRICA / AGUA – MST (Prim) editable
// ==========================

const electricNodes = ["P","Q","R","S","T","U"];
const electricEdges = [
  { id: "P-Q", u: "P", v: "Q", inputId: "cost-input-P-Q", labelId: "cost-P-Q" },
  { id: "P-R", u: "P", v: "R", inputId: "cost-input-P-R", labelId: "cost-P-R" },
  { id: "Q-R", u: "Q", v: "R", inputId: "cost-input-Q-R", labelId: "cost-Q-R" },
  { id: "Q-S", u: "Q", v: "S", inputId: "cost-input-Q-S", labelId: "cost-Q-S" },
  { id: "R-T", u: "R", v: "T", inputId: "cost-input-R-T", labelId: "cost-R-T" },
  { id: "S-T", u: "S", v: "T", inputId: "cost-input-S-T", labelId: "cost-S-T" },
  { id: "S-U", u: "S", v: "U", inputId: "cost-input-S-U", labelId: "cost-S-U" },
  { id: "T-U", u: "T", v: "U", inputId: "cost-input-T-U", labelId: "cost-T-U" },
];

let mstHighlightTimeouts = [];
const primStepsBody = document.getElementById("prim-steps-body");
const primStepsPanel = document.getElementById("prim-steps-panel");
const electricNodeMap = {
  P: document.getElementById("electric-node-P"),
  Q: document.getElementById("electric-node-Q"),
  R: document.getElementById("electric-node-R"),
  S: document.getElementById("electric-node-S"),
  T: document.getElementById("electric-node-T"),
  U: document.getElementById("electric-node-U")
};

function buildElectricGraph() {
  const graph = {};
  electricNodes.forEach(n => { graph[n] = {}; });

  for (const edge of electricEdges) {
    const input = document.getElementById(edge.inputId);
    const w = parseFloat(input.value);
    if (isNaN(w) || w <= 0) continue;
    graph[edge.u][edge.v] = w;
    graph[edge.v][edge.u] = w;
  }
  return graph;
}

// actualizar etiquetas de costos
electricEdges.forEach(edge => {
  const input = document.getElementById(edge.inputId);
  const label = document.getElementById(edge.labelId);
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    if (!isNaN(v) && v > 0) {
      label.textContent = v.toString();
    } else {
      label.textContent = "-";
    }
  });
});

function clearMSTHighlight() {
  document.querySelectorAll("#electric-graph .pipe-inner").forEach(e => {
    e.classList.remove("mst-highlight");
  });
  mstHighlightTimeouts.forEach(t => clearTimeout(t));
  mstHighlightTimeouts = [];
  clearElectricNodeHighlight();
}

function highlightMSTEdges(edges) {
  clearMSTHighlight();
  edges.forEach((edge, index) => {
    const id1 = `edge-${edge.u}-${edge.v}`;
    const id2 = `edge-${edge.v}-${edge.u}`;
    const el = document.getElementById(id1) || document.getElementById(id2);
    const timeout = setTimeout(() => {
      if (el) el.classList.add("mst-highlight");
      activateElectricNode(edge.u);
      activateElectricNode(edge.v);
    }, index * 260);
    mstHighlightTimeouts.push(timeout);
  });
}

function activateElectricNode(nodeId) {
  const node = electricNodeMap[nodeId];
  if (node) node.classList.add("active");
}

function clearElectricNodeHighlight() {
  Object.values(electricNodeMap).forEach(node => {
    if (node) node.classList.remove("active");
  });
}

function primMST(graph) {
  const nodes = Object.keys(graph);
  if (nodes.length === 0) return { edges: [], steps: [] };
  const inMST = new Set();
  const edges = [];
  const steps = [];
  const start = nodes[0];
  inMST.add(start);
  let totalCost = 0;

  while (inMST.size < nodes.length) {
    let minEdge = null;
    let minWeight = Infinity;

    for (const u of inMST) {
      for (const [v, w] of Object.entries(graph[u])) {
        if (inMST.has(v)) continue;
        if (w < minWeight) {
          minWeight = w;
          minEdge = { u, v, w };
        }
      }
    }

    if (!minEdge) break; // grafo desconectado
    inMST.add(minEdge.v);
    edges.push(minEdge);
    totalCost += minEdge.w;
    steps.push({
      iteration: edges.length,
      node: minEdge.v,
      edge: `${minEdge.u} – ${minEdge.v}`,
      cost: totalCost
    });
  }
  return { edges, steps };
}

function renderPrimSteps(steps) {
  if (!primStepsBody) return;
  if (!steps || steps.length === 0) {
    primStepsBody.innerHTML = '<tr><td colspan="4">Calcula el MST para visualizar los pasos de Prim.</td></tr>';
    if (primStepsPanel) primStepsPanel.classList.add("show");
    return;
  }

  const rows = steps.map(step =>
    `<tr><td>${step.iteration}</td><td>${step.node}</td><td>${step.edge}</td><td>${step.cost}</td></tr>`
  ).join("");
  primStepsBody.innerHTML = rows;
  if (primStepsPanel) {
    primStepsPanel.classList.remove("show");
    requestAnimationFrame(() => primStepsPanel.classList.add("show"));
  }
}

renderPrimSteps([]);

document.getElementById("btn-mst").addEventListener("click", () => {
  const graph = buildElectricGraph();
  const { edges: mst, steps } = primMST(graph);
  const box = document.getElementById("resultado-mst");
  const expectedEdges = electricNodes.length - 1;

  if (mst.length === 0 || mst.length < expectedEdges) {
    box.textContent = "No se pudo construir un MST completo. Verifica que todas las aristas necesarias tengan costos válidos (>0) y que el grafo esté conectado.";
    clearMSTHighlight();
    renderPrimSteps([]);
    return;
  }

  highlightMSTEdges(mst);
  const total = mst.reduce((acc, e) => acc + e.w, 0);
  let texto = "Aristas en el MST (origen, destino, costo):\n";
  mst.forEach(e => {
    texto += `${e.u} – ${e.v} (costo ${e.w})\n`;
  });
  texto += `\nCosto total mínimo para esta configuración: ${total}.`;
  box.textContent = texto;
  renderPrimSteps(steps);
});

document.getElementById("btn-reset-mst").addEventListener("click", () => {
  clearMSTHighlight();
  document.getElementById("resultado-mst").textContent =
    "Resaltado limpiado. Edita costos y vuelve a calcular el MST si lo deseas.";
  renderPrimSteps([]);
});

// ==========================
// 3. SISTEMA DE SEMÁFOROS – tiempos configurables
// ==========================

const northLights = {
  red: document.getElementById("north-red"),
  yellow: document.getElementById("north-yellow"),
  green: document.getElementById("north-green")
};
const southLights = {
  red: document.getElementById("south-red"),
  yellow: document.getElementById("south-yellow"),
  green: document.getElementById("south-green")
};
const eastLights = {
  red: document.getElementById("east-red"),
  yellow: document.getElementById("east-yellow"),
  green: document.getElementById("east-green")
};
const westLights = {
  red: document.getElementById("west-red"),
  yellow: document.getElementById("west-yellow"),
  green: document.getElementById("west-green")
};

const glowNS = document.getElementById("glow-ns");
const glowEW = document.getElementById("glow-ew");
const cars = {
  n: document.getElementById("car-n"),
  s: document.getElementById("car-s"),
  w: document.getElementById("car-w"),
  e: document.getElementById("car-e")
};
const countdownRing = document.getElementById("countdown-ring");
const countdownText = document.getElementById("countdown-text");
const COUNTDOWN_CIRC = 2 * Math.PI * 52;

let semTimeout = null;
let semRunning = false;
let countdownInterval = null;
let semPhases = [];
let semTableActiveIndex = null;

function updateRangeLabels() {
  const nsVal = parseInt(document.getElementById("range-ns-green").value, 10);
  const ewVal = parseInt(document.getElementById("range-ew-green").value, 10);
  const yVal  = parseInt(document.getElementById("range-yellow").value, 10);

  document.getElementById("val-ns-green").textContent = nsVal + " s";
  document.getElementById("val-ew-green").textContent = ewVal + " s";
  document.getElementById("val-yellow").textContent  = yVal + " s";
  positionSliderBubble("range-ns-green", "val-ns-green");
  positionSliderBubble("range-ew-green", "val-ew-green");
  positionSliderBubble("range-yellow", "val-yellow");

  const total = nsVal + ewVal + 2 * yVal;
  if (total > 0) {
    document.getElementById("sem-cycle").textContent = total + " s";
    document.getElementById("sem-ns-perc").textContent =
      Math.round(nsVal / total * 100) + "%";
    document.getElementById("sem-ew-perc").textContent =
      Math.round(ewVal / total * 100) + "%";
    document.getElementById("sem-y-perc").textContent =
      Math.round(2 * yVal / total * 100) + "%";
  }

  updateSemPreviewTable();
}

["range-ns-green","range-ew-green","range-yellow"].forEach(id => {
  document.getElementById(id).addEventListener("input", updateRangeLabels);
});
updateRangeLabels();
window.addEventListener("resize", updateRangeLabels);

function positionSliderBubble(rangeId, valueId) {
  const slider = document.getElementById(rangeId);
  const label = document.getElementById(valueId);
  if (!slider || !label) return;
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const percent = (val - min) / (max - min || 1);
  label.style.left = `${percent * 100}%`;
}

function buildSemPhasesFromSliders() {
  const nsGreen = parseInt(document.getElementById("range-ns-green").value, 10);
  const ewGreen = parseInt(document.getElementById("range-ew-green").value, 10);
  const yellow = parseInt(document.getElementById("range-yellow").value, 10);

  const phases = [
    { name: "N–S Verde", direction: "Norte-Sur", duration: nsGreen, nsState: "Verde", ewState: "Rojo" },
    { name: "N–S Amarillo", direction: "Transición N–S", duration: yellow, nsState: "Amarillo", ewState: "Rojo" },
    { name: "E–O Verde", direction: "Este-Oeste", duration: ewGreen, nsState: "Rojo", ewState: "Verde" },
    { name: "E–O Amarillo", direction: "Transición E–O", duration: yellow, nsState: "Rojo", ewState: "Amarillo" }
  ];

  let current = 0;
  phases.forEach(phase => {
    phase.start = current;
    phase.end = current + phase.duration;
    current = phase.end;
  });

  semPhases = phases;
  return phases;
}

function renderSemTable(phases) {
  const tbody = document.querySelector("#sem-steps-table tbody");
  if (!tbody) return;
  if (!phases || phases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8">Ajusta los parámetros para ver las fases.</td></tr>';
    semTableActiveIndex = null;
    return;
  }

  const rows = phases.map((phase, idx) => `
    <tr data-phase-index="${idx}">
      <td>${idx + 1}</td>
      <td>${phase.name}</td>
      <td>${phase.direction}</td>
      <td>${phase.duration}</td>
      <td>${phase.start}</td>
      <td>${phase.end}</td>
      <td>${phase.nsState}</td>
      <td>${phase.ewState}</td>
    </tr>
  `).join("");
  tbody.innerHTML = rows;
  semTableActiveIndex = null;
}

function updateSemPreviewTable() {
  const phases = buildSemPhasesFromSliders();
  renderSemTable(phases);
  clearSemPhaseHighlight();
}

function highlightSemPhase(index) {
  const tbody = document.querySelector("#sem-steps-table tbody");
  if (!tbody) return;
  tbody.querySelectorAll("tr").forEach(row => row.classList.remove("active-phase"));
  const row = tbody.querySelector(`tr[data-phase-index="${index}"]`);
  if (row) {
    row.classList.add("active-phase");
    semTableActiveIndex = index;
  }
}

function clearSemPhaseHighlight() {
  const tbody = document.querySelector("#sem-steps-table tbody");
  if (!tbody) return;
  tbody.querySelectorAll("tr.active-phase").forEach(row => row.classList.remove("active-phase"));
  semTableActiveIndex = null;
}

function apagarTodosSemaforos() {
  [northLights, southLights, eastLights, westLights].forEach(dir => {
    Object.values(dir).forEach(l => l.classList.remove("on"));
  });
}

function setDirectionVisual(nsActive, ewActive, icon, message) {
  if (glowNS) glowNS.classList.toggle("active", !!nsActive);
  if (glowEW) glowEW.classList.toggle("active", !!ewActive);
  if (cars.n) cars.n.classList.toggle("active", !!nsActive);
  if (cars.s) cars.s.classList.toggle("active", !!nsActive);
  if (cars.w) cars.w.classList.toggle("active", !!ewActive);
  if (cars.e) cars.e.classList.toggle("active", !!ewActive);
  if (icon && message) updateSemResultado(icon, message);
}

function updateSemResultado(icon, text) {
  const box = document.getElementById("resultado-sem");
  if (!box) return;
  box.textContent = `${icon} ${text}`;
}

function startCountdown(durationMs) {
  if (!countdownRing || !countdownText) return;
  resetCountdown(true);
  countdownRing.style.transition = "none";
  countdownRing.style.strokeDashoffset = COUNTDOWN_CIRC;
  requestAnimationFrame(() => {
    countdownRing.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
    countdownRing.style.strokeDashoffset = 0;
  });
  countdownText.textContent = Math.ceil(durationMs / 1000) + "s";
  const start = Date.now();
  countdownInterval = setInterval(() => {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, durationMs - elapsed);
    countdownText.textContent = Math.ceil(remaining / 1000) + "s";
    if (remaining <= 0) {
      resetCountdown();
    }
  }, 250);
}

function resetCountdown(skipText) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (countdownRing) {
    countdownRing.style.transition = "none";
    countdownRing.style.strokeDashoffset = COUNTDOWN_CIRC;
  }
  if (!skipText && countdownText) {
    countdownText.textContent = "0s";
  }
}

function setEstadoNSverde() {
  apagarTodosSemaforos();
  northLights.green.classList.add("on");
  southLights.green.classList.add("on");
  eastLights.red.classList.add("on");
  westLights.red.classList.add("on");
  setDirectionVisual(true, false, "🚦", "Flujo activo: Norte–Sur en verde, Este–Oeste en rojo.");
}

function setEstadoNSamarillo() {
  apagarTodosSemaforos();
  northLights.yellow.classList.add("on");
  southLights.yellow.classList.add("on");
  eastLights.red.classList.add("on");
  westLights.red.classList.add("on");
  setDirectionVisual(true, false, "⚠️", "Transición: Norte–Sur en amarillo, Este–Oeste en rojo.");
}

function setEstadoEWverde() {
  apagarTodosSemaforos();
  eastLights.green.classList.add("on");
  westLights.green.classList.add("on");
  northLights.red.classList.add("on");
  southLights.red.classList.add("on");
  setDirectionVisual(false, true, "🚦", "Flujo activo: Este–Oeste en verde, Norte–Sur en rojo.");
}

function setEstadoEWamarillo() {
  apagarTodosSemaforos();
  eastLights.yellow.classList.add("on");
  westLights.yellow.classList.add("on");
  northLights.red.classList.add("on");
  southLights.red.classList.add("on");
  setDirectionVisual(false, true, "⚠️", "Transición: Este–Oeste en amarillo, Norte–Sur en rojo.");
}

function setAllRed() {
  apagarTodosSemaforos();
  northLights.red.classList.add("on");
  southLights.red.classList.add("on");
  eastLights.red.classList.add("on");
  westLights.red.classList.add("on");
  setDirectionVisual(false, false);
}

function stopSemCycle() {
  semRunning = false;
  if (semTimeout) {
    clearTimeout(semTimeout);
    semTimeout = null;
  }
  resetCountdown();
  clearSemPhaseHighlight();
}

function startSemCycle() {
  stopSemCycle();
  semRunning = true;
  const nsGreen = parseInt(document.getElementById("range-ns-green").value, 10) * 1000;
  const ewGreen = parseInt(document.getElementById("range-ew-green").value, 10) * 1000;
  const yellow  = parseInt(document.getElementById("range-yellow").value, 10) * 1000;
  const box = document.getElementById("resultado-sem");
  updateSemPreviewTable();

  const fases = [
    { fn: setEstadoNSverde,    dur: nsGreen,
      desc: "Flujo activo: Norte–Sur en verde, Este–Oeste en rojo." },
    { fn: setEstadoNSamarillo, dur: yellow,
      desc: "Transición: Norte–Sur en amarillo, Este–Oeste en rojo." },
    { fn: setEstadoEWverde,    dur: ewGreen,
      desc: "Flujo activo: Este–Oeste en verde, Norte–Sur en rojo." },
    { fn: setEstadoEWamarillo, dur: yellow,
      desc: "Transición: Este–Oeste en amarillo, Norte–Sur en rojo." }
  ];

  let index = 0;
  function runPhase() {
    if (!semRunning) return;
    const fase = fases[index];
    fase.fn();
    highlightSemPhase(index);
    startCountdown(fase.dur);
    semTimeout = setTimeout(() => {
      index = (index + 1) % fases.length;
      runPhase();
    }, fase.dur);
  }
  runPhase();
}

document.getElementById("btn-start-sem").addEventListener("click", () => {
  startSemCycle();
});

document.getElementById("btn-stop-sem").addEventListener("click", () => {
  stopSemCycle();
  setAllRed();
  updateSemResultado("🛑", "Ciclo detenido. Todos los semáforos en rojo (estado seguro).");
});

document.getElementById("btn-fallo").addEventListener("click", () => {
  stopSemCycle();
  apagarTodosSemaforos();
  // Norte-sur apagado, solo este-oeste pasa
  eastLights.green.classList.add("on");
  westLights.green.classList.add("on");
  setDirectionVisual(false, true);
  updateSemResultado("⚠️", "Fallo simulado: semáforos norte-sur apagados. Solo este-oeste tiene paso.");
  resetCountdown();
  clearSemPhaseHighlight();
});

// Estado inicial: todo rojo
setAllRed();
updateSemResultado("🛑", "Todos los semáforos en rojo (estado seguro).");
