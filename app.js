const STORAGE_KEY = "wm-tippspiel-klasse";

const defaultState = {
  players: [],
  matches: [],
  tips: {}
};

let state = loadState();

const elements = {
  playerForm: document.querySelector("#player-form"),
  playerName: document.querySelector("#player-name"),
  playerList: document.querySelector("#player-list"),
  playerCount: document.querySelector("#player-count"),
  matchForm: document.querySelector("#match-form"),
  homeTeam: document.querySelector("#home-team"),
  awayTeam: document.querySelector("#away-team"),
  homeScore: document.querySelector("#home-score"),
  awayScore: document.querySelector("#away-score"),
  matchList: document.querySelector("#match-list"),
  activePlayer: document.querySelector("#active-player"),
  tipsGrid: document.querySelector("#tips-grid"),
  rankingBody: document.querySelector("#ranking-body"),
  addDemoData: document.querySelector("#add-demo-data"),
  resetData: document.querySelector("#reset-data"),
  exportData: document.querySelector("#export-data"),
  importData: document.querySelector("#import-data"),
  emptyStateTemplate: document.querySelector("#empty-state-template")
};

function loadState() {
  try {
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return savedState ? { ...defaultState, ...savedState } : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function render() {
  renderPlayers();
  renderMatches();
  renderPlayerSelect();
  renderTips();
  renderRanking();
  saveState();
}

function renderPlayers() {
  elements.playerCount.textContent = state.players.length;
  elements.playerList.innerHTML = "";

  state.players.forEach((player) => {
    const item = document.createElement("li");
    item.className = "pill";
    item.innerHTML = `<span>${escapeHtml(player.name)}</span>`;

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button";
    deleteButton.type = "button";
    deleteButton.ariaLabel = `${player.name} löschen`;
    deleteButton.textContent = "×";
    deleteButton.addEventListener("click", () => deletePlayer(player.id));

    item.append(deleteButton);
    elements.playerList.append(item);
  });
}

function renderMatches() {
  elements.matchList.innerHTML = "";

  if (state.matches.length === 0) {
    elements.matchList.append(createEmptyState());
    return;
  }

  state.matches.forEach((match) => {
    const card = document.createElement("article");
    card.className = "match-card";

    const hasResult = hasCompleteScore(match.result);
    card.innerHTML = `
      <div>
        <div class="match-title">${escapeHtml(match.homeTeam)} – ${escapeHtml(match.awayTeam)}</div>
        <div class="match-result">Ergebnis: ${hasResult ? `${match.result.home}:${match.result.away}` : "noch offen"}</div>
      </div>
    `;

    const controls = document.createElement("div");
    controls.className = "actions";

    const resultButton = document.createElement("button");
    resultButton.className = "secondary";
    resultButton.type = "button";
    resultButton.textContent = "Ergebnis ändern";
    resultButton.addEventListener("click", () => editMatchResult(match.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Löschen";
    deleteButton.addEventListener("click", () => deleteMatch(match.id));

    controls.append(resultButton, deleteButton);
    card.append(controls);
    elements.matchList.append(card);
  });
}

function renderPlayerSelect() {
  const previousValue = elements.activePlayer.value;
  elements.activePlayer.innerHTML = "";

  if (state.players.length === 0) {
    elements.activePlayer.innerHTML = '<option value="">Bitte Namen eintragen</option>';
    elements.activePlayer.disabled = true;
    return;
  }

  elements.activePlayer.disabled = false;
  state.players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.name;
    elements.activePlayer.append(option);
  });

  const fallbackPlayer = state.players[0]?.id ?? "";
  elements.activePlayer.value = state.players.some((player) => player.id === previousValue)
    ? previousValue
    : fallbackPlayer;
}

function renderTips() {
  elements.tipsGrid.innerHTML = "";
  const playerId = elements.activePlayer.value;

  if (!playerId || state.matches.length === 0) {
    elements.tipsGrid.append(createEmptyState());
    return;
  }

  state.matches.forEach((match) => {
    const tip = state.tips[playerId]?.[match.id] ?? { home: "", away: "" };
    const card = document.createElement("article");
    card.className = "tip-card";
    card.innerHTML = `
      <strong>${escapeHtml(match.homeTeam)} – ${escapeHtml(match.awayTeam)}</strong>
      <div class="tip-inputs">
        <input type="number" min="0" inputmode="numeric" aria-label="Tipp ${escapeHtml(match.homeTeam)}" value="${tip.home}">
        <span>:</span>
        <input type="number" min="0" inputmode="numeric" aria-label="Tipp ${escapeHtml(match.awayTeam)}" value="${tip.away}">
      </div>
    `;

    const [homeInput, awayInput] = card.querySelectorAll("input");
    homeInput.addEventListener("input", () => updateTip(playerId, match.id, homeInput.value, awayInput.value));
    awayInput.addEventListener("input", () => updateTip(playerId, match.id, homeInput.value, awayInput.value));
    elements.tipsGrid.append(card);
  });
}

function renderRanking() {
  elements.rankingBody.innerHTML = "";
  const ranking = state.players
    .map((player) => ({ ...player, points: calculatePlayerPoints(player.id), tipped: countTips(player.id) }))
    .sort((first, second) => second.points - first.points || first.name.localeCompare(second.name));

  if (ranking.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="4">Noch keine Personen eingetragen.</td>';
    elements.rankingBody.append(row);
    return;
  }

  ranking.forEach((player, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(player.name)}</td>
      <td><strong>${player.points}</strong></td>
      <td>${player.tipped} / ${state.matches.length}</td>
    `;
    elements.rankingBody.append(row);
  });
}

function createEmptyState() {
  return elements.emptyStateTemplate.content.firstElementChild.cloneNode(true);
}

function addPlayers(rawNames) {
  const existingNames = new Set(state.players.map((player) => player.name.toLowerCase()));
  const newPlayers = [];

  rawNames
    .split(/[\n,;]/)
    .map(normalizeName)
    .filter(Boolean)
    .forEach((name) => {
      const normalizedName = name.toLowerCase();
      if (existingNames.has(normalizedName)) return;

      existingNames.add(normalizedName);
      newPlayers.push({ id: createId("player"), name });
    });

  state.players.push(...newPlayers);
}

function deletePlayer(playerId) {
  state.players = state.players.filter((player) => player.id !== playerId);
  delete state.tips[playerId];
  render();
}

function deleteMatch(matchId) {
  state.matches = state.matches.filter((match) => match.id !== matchId);
  Object.values(state.tips).forEach((playerTips) => delete playerTips[matchId]);
  render();
}

function editMatchResult(matchId) {
  const match = state.matches.find((currentMatch) => currentMatch.id === matchId);
  const home = prompt(`Tore für ${match.homeTeam}:`, match.result.home ?? "");
  const away = prompt(`Tore für ${match.awayTeam}:`, match.result.away ?? "");

  if (home === null || away === null) return;
  match.result = {
    home: home === "" ? "" : Number(home),
    away: away === "" ? "" : Number(away)
  };
  render();
}

function updateTip(playerId, matchId, home, away) {
  state.tips[playerId] ||= {};
  state.tips[playerId][matchId] = {
    home: home === "" ? "" : Number(home),
    away: away === "" ? "" : Number(away)
  };
  saveState();
  renderRanking();
}

function hasCompleteScore(score) {
  return Number.isInteger(score?.home) && Number.isInteger(score?.away);
}

function calculatePlayerPoints(playerId) {
  return state.matches.reduce((sum, match) => {
    const result = match.result;
    const tip = state.tips[playerId]?.[match.id];

    if (!hasCompleteScore(result) || !hasCompleteScore(tip)) return sum;
    if (result.home === tip.home && result.away === tip.away) return sum + 3;

    const resultDifference = result.home - result.away;
    const tipDifference = tip.home - tip.away;
    if (resultDifference === tipDifference) return sum + 2;

    if (Math.sign(resultDifference) === Math.sign(tipDifference)) return sum + 1;
    return sum;
  }, 0);
}

function countTips(playerId) {
  return state.matches.filter((match) => hasCompleteScore(state.tips[playerId]?.[match.id])).length;
}

function addDemoData() {
  if (state.players.length === 0) {
    addPlayers("Mia\nNoah\nEmma\nLeon");
  }

  if (state.matches.length === 0) {
    state.matches.push(
      { id: createId("match"), homeTeam: "Deutschland", awayTeam: "Schottland", result: { home: 2, away: 1 } },
      { id: createId("match"), homeTeam: "Spanien", awayTeam: "Italien", result: { home: "", away: "" } },
      { id: createId("match"), homeTeam: "Frankreich", awayTeam: "Niederlande", result: { home: "", away: "" } }
    );
  }

  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "wm-tippspiel-daten.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importData(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const importedState = JSON.parse(reader.result);
      state = { ...defaultState, ...importedState };
      render();
    } catch {
      alert("Die Datei konnte nicht importiert werden.");
    }
  });
  reader.readAsText(file);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));
}

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addPlayers(elements.playerName.value);
  elements.playerName.value = "";
  render();
});

elements.matchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.matches.push({
    id: createId("match"),
    homeTeam: elements.homeTeam.value.trim(),
    awayTeam: elements.awayTeam.value.trim(),
    result: {
      home: elements.homeScore.value === "" ? "" : Number(elements.homeScore.value),
      away: elements.awayScore.value === "" ? "" : Number(elements.awayScore.value)
    }
  });
  elements.matchForm.reset();
  render();
});

elements.activePlayer.addEventListener("change", renderTips);
elements.addDemoData.addEventListener("click", addDemoData);
elements.exportData.addEventListener("click", exportData);
elements.importData.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importData(file);
  event.target.value = "";
});
elements.resetData.addEventListener("click", () => {
  if (confirm("Wirklich alle Namen, Spiele und Tipps löschen?")) {
    state = structuredClone(defaultState);
    render();
  }
});

render();
