(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const STORAGE_KEY = "rps-arena-v1";
  const CHOICES = ["rock", "paper", "scissors"];
  const MOVES = {
    rock: { label: "Rock", emoji: "✊" },
    paper: { label: "Paper", emoji: "✋" },
    scissors: { label: "Scissors", emoji: "✌️" }
  };
  const freshState = () => ({
    wins: 0, losses: 0, draws: 0, rounds: 0, streak: 0, bestStreak: 0,
    xp: 0, matchNumber: 1, history: [], playerChoices: [], challengeDone: false,
    sound: false, lightMode: false
  });
  let state = loadState();
  let audioContext = null;
  let toastTimer = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return freshState();
      const clean = { ...freshState(), ...saved };
      for (const key of ["wins","losses","draws","rounds","streak","bestStreak","xp","matchNumber"]) {
        if (!Number.isFinite(clean[key]) || clean[key] < 0) clean[key] = freshState()[key];
      }
      clean.history = Array.isArray(clean.history) ? clean.history.slice(0, 6) : [];
      clean.playerChoices = Array.isArray(clean.playerChoices) ? clean.playerChoices.filter(c => CHOICES.includes(c)).slice(-20) : [];
      clean.sound = Boolean(clean.sound);
      clean.lightMode = Boolean(clean.lightMode);
      clean.challengeDone = Boolean(clean.challengeDone);
      return clean;
    } catch {
      return freshState();
    }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { showToast("Could not save locally. Your browser storage may be full."); }
  }
  function pickComputerMove() {
    // Small adaptive opponent: observes the player's recent pattern, but keeps a random element.
    if (state.playerChoices.length >= 3 && Math.random() < 0.38) {
      const counts = { rock: 0, paper: 0, scissors: 0 };
      state.playerChoices.slice(-6).forEach(move => counts[move]++);
      const predicted = CHOICES.reduce((best, move) => counts[move] > counts[best] ? move : best, CHOICES[0]);
      const counter = { rock: "paper", paper: "scissors", scissors: "rock" };
      return counter[predicted];
    }
    return CHOICES[Math.floor(Math.random() * CHOICES.length)];
  }
  function getOutcome(player, cpu) {
    if (player === cpu) return "draw";
    const playerWins = (player === "rock" && cpu === "scissors") ||
      (player === "paper" && cpu === "rock") ||
      (player === "scissors" && cpu === "paper");
    return playerWins ? "win" : "loss";
  }
  function rankForXP(xp) {
    if (xp >= 1000) return { name: "Legend", floor: 1000, next: 1000 };
    if (xp >= 500) return { name: "Elite", floor: 500, next: 1000 };
    if (xp >= 250) return { name: "Veteran", floor: 250, next: 500 };
    if (xp >= 100) return { name: "Contender", floor: 100, next: 250 };
    return { name: "Rookie", floor: 0, next: 100 };
  }
  function render() {
    $("#wins").textContent = state.wins;
    $("#winRate").innerHTML = `${state.rounds ? Math.round(state.wins / state.rounds * 100) : 0}<span class="stat-unit">%</span>`;
    $("#streak").innerHTML = `${state.streak} <span class="streak-flame">✦</span>`;
    $("#bestStreak").textContent = state.bestStreak;
    $("#rounds").textContent = state.rounds;
    $("#roundNumber").textContent = String(state.rounds + 1).padStart(2, "0");
    $("#matchNumber").textContent = String(state.matchNumber).padStart(3, "0");
    const rank = rankForXP(state.xp);
    $("#rankName").textContent = rank.name;
    const progress = rank.name === "Legend" ? 100 : ((state.xp - rank.floor) / (rank.next - rank.floor)) * 100;
    $("#rankProgress").style.width = `${Math.max(0, Math.min(100, progress))}%`;
    $("#xpLabel").textContent = rank.name === "Legend" ? `${state.xp} XP · MAX RANK` : `${state.xp} / ${rank.next} XP`;
    const challengeProgress = Math.min(state.streak, 3);
    $("#challengeCount").textContent = `${state.challengeDone ? 3 : challengeProgress} / 3`;
    $("#challengeProgress").style.width = `${(state.challengeDone ? 3 : challengeProgress) / 3 * 100}%`;
    $("#challengeStatus").textContent = state.challengeDone ? "Completed — bonus claimed!" : "Challenge not completed";
    $("#soundToggle").classList.toggle("active", state.sound);
    $("#soundToggle").setAttribute("aria-pressed", String(state.sound));
    $("#themeToggle").setAttribute("aria-pressed", String(state.lightMode));
    document.body.classList.toggle("light-mode", state.lightMode);
    renderHistory();
  }
  function renderHistory() {
    $("#historyCount").textContent = `${state.history.length} / 6`;
    const list = $("#historyList");
    if (!state.history.length) {
      list.innerHTML = '<div class="empty-history"><span>⌁</span><p>Your recent rounds will appear here.</p></div>';
      return;
    }
    list.innerHTML = state.history.map(item => {
      const p = MOVES[item.player], c = MOVES[item.cpu];
      return `<div class="history-item">
        <div class="history-emoji">${p.emoji}</div>
        <div class="history-main"><strong>${p.label} <span style="color:var(--muted);font-weight:400">vs</span> ${c.label}</strong><small>Round ${String(item.round).padStart(2,"0")}</small></div>
        <span class="history-result ${item.outcome}">${item.outcome.toUpperCase()}</span>
      </div>`;
    }).join("");
  }
  function playTone(outcome) {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const frequencies = { win: 660, draw: 440, loss: 220 };
      oscillator.frequency.value = frequencies[outcome] || 440;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.2);
    } catch { showToast("Audio is not available in this browser."); }
  }
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }
  function setResult(outcome, player, cpu) {
    const banner = $("#resultBanner");
    banner.className = `result-banner ${outcome}`;
    const copy = {
      win: ["You got it. Round won!", `${MOVES[player].label} beats ${MOVES[cpu].label}. Nice move — +20 XP.`],
      loss: ["The CPU takes this one.", `${MOVES[cpu].label} beats ${MOVES[player].label}. Reset your focus and go again.`],
      draw: ["It's a draw.", `Both picked ${MOVES[player].label}. No points lost — +5 XP for playing.`]
    }[outcome];
    $("#resultTitle").textContent = copy[0];
    $("#resultText").textContent = copy[1];
    $("#resultBanner .result-symbol").textContent = outcome === "win" ? "↗" : outcome === "loss" ? "↘" : "＝";
  }
  function play(player) {
    if (!CHOICES.includes(player)) return;
    const cpu = pickComputerMove();
    const outcome = getOutcome(player, cpu);
    const round = state.rounds + 1;
    $("#playerMove").textContent = MOVES[player].emoji;
    $("#cpuMove").textContent = MOVES[cpu].emoji;
    $("#playerLabel").textContent = MOVES[player].label;
    $("#cpuLabel").textContent = MOVES[cpu].label;
    $("#playerOrb").style.transform = "scale(1.04)";
    $("#cpuOrb").style.transform = "scale(1.04)";
    window.setTimeout(() => { $("#playerOrb").style.transform = ""; $("#cpuOrb").style.transform = ""; }, 180);
    state.rounds++;
    state.matchNumber++;
    state.playerChoices.push(player);
    state.playerChoices = state.playerChoices.slice(-20);
    if (outcome === "win") {
      state.wins++; state.streak++; state.bestStreak = Math.max(state.bestStreak, state.streak); state.xp += 20;
    } else if (outcome === "loss") {
      state.losses++; state.streak = 0; state.xp += 0;
    } else {
      state.draws++; state.streak = 0; state.xp += 5;
    }
    if (!state.challengeDone && state.streak >= 3) {
      state.challengeDone = true;
      state.xp += 50;
      showToast("Challenge completed! +50 bonus XP");
    }
    state.history.unshift({ player, cpu, outcome, round });
    state.history = state.history.slice(0, 6);
    setResult(outcome, player, cpu);
    playTone(outcome);
    render(); saveState();
  }
  function resetStats() {
    if (!window.confirm("Reset all stats, XP, challenge progress and recent history? This cannot be undone.")) return;
    const preferences = { sound: state.sound, lightMode: state.lightMode };
    state = { ...freshState(), ...preferences };
    $("#playerMove").textContent = "?"; $("#cpuMove").textContent = "?";
    $("#playerLabel").textContent = "Awaiting move"; $("#cpuLabel").textContent = "Thinking...";
    $("#resultBanner").className = "result-banner";
    $("#resultBanner .result-symbol").textContent = "✦";
    $("#resultTitle").textContent = "Ready when you are";
    $("#resultText").textContent = "Pick a move below to start the match.";
    render(); saveState(); showToast("Stats reset. A fresh start!");
  }
  $$(".choice-button").forEach(button => {
    button.addEventListener("click", () => play(button.dataset.choice));
  });
  document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const keyMap = { "1": "rock", "2": "paper", "3": "scissors", r: "rock", p: "paper", s: "scissors" };
    const move = keyMap[event.key.toLowerCase()];
    if (move && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) play(move);
  });
  $("#resetButton").addEventListener("click", resetStats);
  $("#soundToggle").addEventListener("click", () => {
    state.sound = !state.sound; render(); saveState();
    showToast(state.sound ? "Sound effects enabled." : "Sound effects muted.");
  });
  $("#themeToggle").addEventListener("click", () => {
    state.lightMode = !state.lightMode; render(); saveState();
  });
  render();
})();
