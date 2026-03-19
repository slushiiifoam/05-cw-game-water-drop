const GAME_DURATION = 30;
const GOAL_SCORE = 20;

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

let gameRunning = false;
let score = 0;
let timeLeft = GAME_DURATION;
let timerId = null;
let spawnTimeoutId = null;

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);

renderUI();
setStageUI(getCurrentStage());

function startGame() {
  if (gameRunning) return;

  gameRunning = true;
  hideEndScreen();
  startBtn.disabled = true;
  startBtn.textContent = "Playing";

  timerId = setInterval(tickTimer, 1000);
  scheduleNextDrop();
}

function resetGame() {
  stopGameLoop();
  removeAllDropsAndEffects();

  score = 0;
  timeLeft = GAME_DURATION;
  gameRunning = false;

  startBtn.disabled = false;
  startBtn.textContent = "Start";

  hideEndScreen();
  renderUI();
  setStageUI(getCurrentStage());
}

function tickTimer() {
  if (!gameRunning) return;

  timeLeft -= 1;
  if (timeLeft < 0) timeLeft = 0;

  renderUI();
  setStageUI(getCurrentStage());

  if (timeLeft <= 0) {
    endGame();
  }
}

function getCurrentStage() {
  if (timeLeft > 20) return STAGES[0];
  if (timeLeft > 10) return STAGES[1];
  return STAGES[2];
}

function scheduleNextDrop() {
  if (!gameRunning) return;

  const stage = getCurrentStage();
  createDrop(stage);

  const randomJitter = Math.random() * 160;
  spawnTimeoutId = setTimeout(scheduleNextDrop, stage.spawnDelay + randomJitter);
}

function createDrop(stage) {
  const isCleanDrop = Math.random() < 0.7;
  const drop = document.createElement("img");

  drop.className = "drop";
  drop.src = isCleanDrop ? "img/cleanwaterdrop.png" : "img/pollutedwaterdrop.png";
  drop.alt = isCleanDrop ? "Clean water drop" : "Polluted water drop";

  const size = randomBetween(52, 84);
  const containerWidth = gameContainer.clientWidth;
  const containerHeight = gameContainer.clientHeight;

  drop.style.width = `${size}px`;
  drop.style.height = `${size}px`;
  drop.style.left = `${Math.random() * Math.max(1, containerWidth - size)}px`;
  drop.style.animationDuration = `${stage.fallDuration}s`;
  drop.style.setProperty("--fall-distance", `${containerHeight + size + 36}px`);

  let clicked = false;

  drop.addEventListener("pointerdown", (event) => {
    if (!gameRunning || clicked) return;
    clicked = true;

    const points = isCleanDrop ? 1 : -1;
    applyScore(points);

    createSplash(event.clientX, event.clientY, isCleanDrop);
    createScorePop(event.clientX, event.clientY, points);

    drop.classList.add(isCleanDrop ? "hit-good" : "hit-bad");
    setTimeout(() => drop.remove(), 120);
  });

  drop.addEventListener("animationend", () => {
    drop.remove();
  });

  gameContainer.appendChild(drop);
}

function applyScore(amount) {
  score += amount;
  if (score < 0) score = 0;

  renderUI();
}

function renderUI() {
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;

  const progressRatio = Math.min(score / GOAL_SCORE, 1);
  const progressPercent = Math.round(progressRatio * 100);
  goalProgressEl.textContent = `${progressPercent}%`;
  canFillEl.style.height = `${progressPercent}%`;

  stageNameEl.textContent = getCurrentStage().name;
}

function setStageUI(stage) {
  stageTextEl.textContent = stage.label;
  stageTipEl.textContent = stage.tip;
}

function endGame() {
  stopGameLoop();
  gameRunning = false;

  startBtn.disabled = false;
  startBtn.textContent = "Start Again";

  const playerWon = score >= GOAL_SCORE;
  const selectedMessage = pickRandom(playerWon ? WIN_MESSAGES : LOSE_MESSAGES);

  endTitleEl.textContent = playerWon ? "You Win!" : "Keep Going!";
  endMessageEl.textContent = selectedMessage;
  endScreenEl.classList.remove("hidden");

  if (playerWon) {
    burstConfetti();
  }
}

function hideEndScreen() {
  endScreenEl.classList.add("hidden");
}

function stopGameLoop() {
  clearInterval(timerId);
  clearTimeout(spawnTimeoutId);
  timerId = null;
  spawnTimeoutId = null;
}

function removeAllDropsAndEffects() {
  gameContainer.querySelectorAll(".drop, .splash, .score-pop, .confetti").forEach((node) => {
    node.remove();
  });
}

function createSplash(clientX, clientY, isCleanDrop) {
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
  const rect = gameContainer.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function burstConfetti() {
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
  return options[Math.floor(Math.random() * options.length)];
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
