// Core game rules.
const GAME_DURATION = 30;
const GOAL_SCORE = 20;

// Stage tuning controls how fast the game feels over time.
const STAGES = [
  {
    name: "Fresh Flow",
    label: "Stage 1: Fresh Flow",
    tip: "Drops are moving at a calm pace.",
    spawnDelay: 980,
    fallDuration: 5.2,
  },
  {
    name: "Rising Current",
    label: "Stage 2: Rising Current",
    tip: "Drops are falling faster!",
    spawnDelay: 760,
    fallDuration: 4,
  },
  {
    name: "Water Rush",
    label: "Stage 3: Water Rush",
    tip: "Final push! Fast drops incoming!",
    spawnDelay: 550,
    fallDuration: 3,
  },
];

// End-screen messages are chosen randomly to keep replays fresh.
const WIN_MESSAGES = [
  "Amazing work! Your gallons reached families with clean water.",
  "You did it! Every drop counted toward real impact.",
  "Goal unlocked! You powered through the rush and delivered hope.",
  "Great run! You collected enough gallons to make a difference.",
];

const LOSE_MESSAGES = [
  "So close. Try again and catch a few more clean drops.",
  "Keep going. Every replay helps you get closer to the 20-gallon goal.",
  "Nice attempt. Watch for polluted drops and build your streak.",
  "Almost there. One more run can push you over the goal.",
];

// Cache all DOM elements once so functions can reuse them quickly.
const gameContainer = document.getElementById("game-container");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const stageNameEl = document.getElementById("stage-name");
const stageTextEl = document.getElementById("stage-text");
const stageTipEl = document.getElementById("stage-tip");
const goalProgressEl = document.getElementById("goal-progress");
const canFillEl = document.getElementById("can-fill");
const endScreenEl = document.getElementById("end-screen");
const endTitleEl = document.getElementById("end-title");
const endMessageEl = document.getElementById("end-message");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const stageBannerEl = document.getElementById("stage-banner");

// Mutable runtime state for one game session.
let gameRunning = false;
let score = 0;
let timeLeft = GAME_DURATION;
let timerId = null;
let spawnTimeoutId = null;
let stageBannerTimeoutId = null;
let currentStageName = STAGES[0].name;

// Wire up user controls.
startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);

// Initial screen state before first run.
renderUI();
setStageUI(getCurrentStage());
hideStageBanner();

function startGame() {
  // Ignore start if a run is active or if timer already reached 0.
  if (gameRunning) return;
  if (timeLeft <= 0) return;

  // Enter active game mode.
  gameRunning = true;
  hideEndScreen();
  startBtn.disabled = true;

  // Show current stage banner briefly when run starts.
  showStageBanner(getCurrentStage());

  // Start countdown + drop generation loops.
  timerId = setInterval(tickTimer, 1000);
  scheduleNextDrop();
}

function resetGame() {
  // Stop everything first so no old timers continue running.
  stopGameLoop();
  removeAllDropsAndEffects();

  // Restore initial values.
  score = 0;
  timeLeft = GAME_DURATION;
  gameRunning = false;

  // Reset controls and overlays.
  startBtn.disabled = false;

  hideEndScreen();
  hideStageBanner();
  renderUI();
  setStageUI(getCurrentStage());
  currentStageName = STAGES[0].name;
}

function tickTimer() {
  // Safety guard if interval fires after game has ended.
  if (!gameRunning) return;

  // Decrement timer once per second and clamp at 0.
  timeLeft -= 1;
  if (timeLeft < 0) timeLeft = 0;

  // If stage changed (time threshold crossed), show banner again.
  const stage = getCurrentStage();
  if (stage.name !== currentStageName) {
    currentStageName = stage.name;
    showStageBanner(stage);
  }

  // Update HUD text each tick.
  renderUI();
  setStageUI(stage);

  // End run when timer finishes.
  if (timeLeft <= 0) {
    endGame();
  }
}

function getCurrentStage() {
  // Stage changes by remaining time ranges.
  if (timeLeft > 20) return STAGES[0];
  if (timeLeft > 10) return STAGES[1];
  return STAGES[2];
}

function scheduleNextDrop() {
  // Stop spawning if game is paused/ended.
  if (!gameRunning) return;

  // Spawn based on current stage pacing.
  const stage = getCurrentStage();
  createDrop(stage);

  // Small jitter prevents perfectly predictable rhythm.
  const randomJitter = Math.random() * 160;
  spawnTimeoutId = setTimeout(scheduleNextDrop, stage.spawnDelay + randomJitter);
}

function createDrop(stage) {
  // 70% clean, 30% polluted.
  const isCleanDrop = Math.random() < 0.7;
  const drop = document.createElement("img");

  // Pick image asset based on drop type.
  drop.className = "drop";
  drop.src = isCleanDrop ? "img/cleanwaterdrop.png" : "img/pollutedwaterdrop.png";
  drop.alt = isCleanDrop ? "Clean water drop" : "Polluted water drop";

  // Random size + horizontal position within container bounds.
  const size = randomBetween(52, 84);
  const containerWidth = gameContainer.clientWidth;
  const containerHeight = gameContainer.clientHeight;

  drop.style.width = `${size}px`;
  drop.style.height = `${size}px`;
  drop.style.left = `${Math.random() * Math.max(1, containerWidth - size)}px`;
  drop.style.animationDuration = `${stage.fallDuration}s`;
  drop.style.setProperty("--fall-distance", `${containerHeight + size + 36}px`);

  // Prevent double counting if user taps repeatedly before removal.
  let clicked = false;

  drop.addEventListener("pointerdown", (event) => {
    if (!gameRunning || clicked) return;
    clicked = true;

    // Clean gives +1, polluted gives -1.
    const points = isCleanDrop ? 1 : -1;
    applyScore(points);

    // Add quick feedback at click location.
    createSplash(event.clientX, event.clientY, isCleanDrop);
    createScorePop(event.clientX, event.clientY, points);

    // Freeze drop at its current visual position, then fade it out.
    // This avoids transform snapping artifacts while animation is active.
    const frozenTransform = window.getComputedStyle(drop).transform;
    drop.style.animation = "none";
    drop.style.transform = frozenTransform === "none" ? "translateY(0)" : frozenTransform;
    drop.style.transition = "transform 120ms ease, opacity 120ms ease, filter 120ms ease";
    drop.style.filter = isCleanDrop
      ? "drop-shadow(0 0 8px rgba(79, 203, 83, 0.85))"
      : "drop-shadow(0 0 8px rgba(245, 64, 44, 0.85))";
    drop.style.opacity = "0";
    setTimeout(() => drop.remove(), 120);
  });

  // Remove missed drops when fall animation completes.
  drop.addEventListener("animationend", () => {
    drop.remove();
  });

  gameContainer.appendChild(drop);
}

function applyScore(amount) {
  // Keep score from dropping below zero for cleaner UX.
  score += amount;
  if (score < 0) score = 0;

  renderUI();
}

function renderUI() {
  // Update basic counters.
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;

  // Fill the can based on progress toward GOAL_SCORE.
  const progressRatio = Math.min(score / GOAL_SCORE, 1);
  const progressPercent = Math.round(progressRatio * 100);
  goalProgressEl.textContent = `${progressPercent}%`;
  canFillEl.style.height = `${progressPercent}%`;

  // Small stage label in HUD.
  stageNameEl.textContent = getCurrentStage().name;
}

function setStageUI(stage) {
  // Text inside the yellow stage banner.
  stageTextEl.textContent = stage.label;
  stageTipEl.textContent = stage.tip;
}

function endGame() {
  // Stop loops and lock gameplay.
  stopGameLoop();
  gameRunning = false;

  // Reset button is now the only replay action.
  startBtn.disabled = true;
  hideStageBanner();

  // Choose message pool based on score goal.
  const playerWon = score >= GOAL_SCORE;
  const selectedMessage = pickRandom(playerWon ? WIN_MESSAGES : LOSE_MESSAGES);

  // Show end overlay.
  endTitleEl.textContent = playerWon ? "You Win!" : "Keep Going!";
  endMessageEl.textContent = selectedMessage;
  endScreenEl.classList.remove("hidden");

  // Celebrate wins with confetti.
  if (playerWon) {
    burstConfetti();
  }
}

function hideEndScreen() {
  // Hide overlay when starting or resetting.
  endScreenEl.classList.add("hidden");
}

function stopGameLoop() {
  // Clear every active timer/timeout used by gameplay.
  clearInterval(timerId);
  clearTimeout(spawnTimeoutId);
  clearTimeout(stageBannerTimeoutId);
  timerId = null;
  spawnTimeoutId = null;
  stageBannerTimeoutId = null;
}

function removeAllDropsAndEffects() {
  // Remove all transient nodes so reset starts cleanly.
  gameContainer.querySelectorAll(".drop, .splash, .score-pop, .confetti").forEach((node) => {
    node.remove();
  });
}

function createSplash(clientX, clientY, isCleanDrop) {
  // Spawn a small pulse exactly where player tapped/clicked.
  const splash = document.createElement("span");
  const { x, y } = toContainerPosition(clientX, clientY);

  splash.className = "splash";
  splash.style.left = `${x}px`;
  splash.style.top = `${y}px`;
  splash.style.backgroundColor = isCleanDrop ? "rgba(46, 157, 247, 0.55)" : "rgba(245, 64, 44, 0.55)";

  gameContainer.appendChild(splash);
  setTimeout(() => splash.remove(), 460);
}

function createScorePop(clientX, clientY, points) {
  // Floating +1 / -1 text near interaction point.
  const pop = document.createElement("span");
  const { x, y } = toContainerPosition(clientX, clientY);

  pop.className = `score-pop ${points > 0 ? "good" : "bad"}`;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  pop.textContent = points > 0 ? "+1" : "-1";

  gameContainer.appendChild(pop);
  setTimeout(() => pop.remove(), 620);
}

function toContainerPosition(clientX, clientY) {
  // Convert viewport coordinates to playfield-local coordinates.
  const rect = gameContainer.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function burstConfetti() {
  // Generate multiple falling pieces with random color and timing.
  const colors = ["#ffc907", "#2e9df7", "#4fcb53", "#ff902a", "#f16061"];
  const count = 110;
  const containerWidth = gameContainer.clientWidth;

  for (let i = 0; i < count; i += 1) {
    const confetti = document.createElement("span");
    confetti.className = "confetti";
    confetti.style.left = `${Math.random() * containerWidth}px`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = `${Math.random() * 0.6}s`;
    confetti.style.animationDuration = `${2.4 + Math.random() * 1.2}s`;

    gameContainer.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3400);
  }
}

function pickRandom(options) {
  // Return one random item from an array.
  return options[Math.floor(Math.random() * options.length)];
}

function randomBetween(min, max) {
  // Return random decimal in [min, max).
  return Math.random() * (max - min) + min;
}

function showStageBanner(stage) {
  // Show the stage banner for 5 seconds.
  setStageUI(stage);
  stageBannerEl.classList.remove("banner-hidden");
  clearTimeout(stageBannerTimeoutId);
  stageBannerTimeoutId = setTimeout(hideStageBanner, 5000);
}

function hideStageBanner() {
  // Hide stage banner until next stage/start event.
  stageBannerEl.classList.add("banner-hidden");
}
