const START_EPOCH_MS = new Date("2026-11-18T19:00:00-03:00").getTime();
const diffMs = Date.now() - START_EPOCH_MS;
const calculatedDay = diffMs >= 0 ? Math.floor(diffMs / 86400000) + 1 : 1;

const urlParams = new URLSearchParams(window.location.search);
const currentDayNumber = parseInt(urlParams.get("day")) || Math.max(1, calculatedDay);
const activeDay = dailyData[currentDayNumber] || dailyData[1];

const gameResultsHTML = ["", "", "", "", "", ""];
const gameResultsText = ["", "", "", "", "", ""];

const STORAGE_KEY = "fuckdle_day_" + currentDayNumber;

function getSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveGameState(patch) {
  try {
    const current = getSavedState() || {
      completed: false,
      currentPrompt: 1,
      gameResultsHTML: ["", "", "", "", "", ""],
      gameResultsText: ["", "", "", "", "", ""],
      chosenWords: [],
      savedSelectedWords: [],
      rerollsRemaining: 2
    };
    const updated = Object.assign(current, patch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
}

const introSection = document.getElementById("intro-section");
const playBtn = document.getElementById("play-btn");

playBtn.addEventListener("click", () => {
  introSection.classList.add("hidden");
  prompt1Section.classList.remove("hidden");
  startPrompt1();
});

const prompt1Section = document.getElementById("prompt-1-section");
const prompt2Section = document.getElementById("prompt-2-section");
const discordImg = document.getElementById("discord-img");
const p1Input = document.getElementById("p1-input");
const p1SubmitBtn = document.getElementById("p1-submit-btn");
const p1InputArea = document.getElementById("p1-input-area");
const p1ResultCard = document.getElementById("p1-result-card");
const p1Emoji = document.getElementById("p1-emoji");
const p1NextBtn = document.getElementById("p1-next-btn");
const p1TimerDisplay = document.getElementById("p1-timer-display");

const P1_DURATION = 15;
let p1TimeLeft = P1_DURATION;
let p1TimerId = null;

discordImg.src = activeDay.prompt1.hiddenImage;

function startPrompt1() {
  p1TimeLeft = P1_DURATION;
  p1TimerDisplay.textContent = p1TimeLeft;
  p1Input.focus();

  p1TimerId = setInterval(() => {
    p1TimeLeft--;
    p1TimerDisplay.textContent = p1TimeLeft;

    if (p1TimeLeft <= 0) {
      finishPrompt1(false);
    }
  }, 1000);
}

function finishPrompt1(isCorrect) {
  clearInterval(p1TimerId);
  discordImg.src = activeDay.prompt1.revealedImage;
  p1InputArea.classList.add("hidden");
  const mark = isCorrect ? "✅" : "❌";
  p1Emoji.textContent = mark;
  gameResultsHTML[0] = mark;
  gameResultsText[0] = mark;
  p1ResultCard.classList.remove("hidden");
  saveGameState({ currentPrompt: 2, gameResultsHTML: gameResultsHTML, gameResultsText: gameResultsText });
}

function submitPrompt1() {
  const guess = p1Input.value.trim().toLowerCase();
  if (!guess) return;

  const isCorrect = (activeDay.prompt1.acceptedAnswers || []).map(a => a.toLowerCase()).includes(guess);
  finishPrompt1(isCorrect);
}

p1SubmitBtn.addEventListener("click", submitPrompt1);
p1Input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    submitPrompt1();
  }
});

p1NextBtn.addEventListener("click", () => {
  prompt1Section.classList.add("hidden");
  prompt2Section.classList.remove("hidden");
  startGame();
});

const canvas = document.getElementById("paintCanvas");
const ctx = canvas.getContext("2d");

const timerDisplay = document.getElementById("timer-display");
const doneBtn = document.getElementById("done-btn");
const resultCard = document.getElementById("result-card");
const resultEmoji = document.getElementById("result-emoji");
const resultStats = document.getElementById("result-stats");

const GAME_DURATION = activeDay.prompt2.duration || 10;
const HIT_TOLERANCE = 10;
const STRAY_DISTANCE = 11;

function getScoreBadge(score) {
  if (score >= 90) {
    return `<img src="images/brilliant.png" class="badge-img" alt="Brilliant!">`;
  }
  if (score >= 80) return "🐘";
  if (score >= 70) return "🐈";
  if (score >= 60) return "🦘";
  if (score >= 50) return "🦐";
  return `<img src="images/blunder.png" class="badge-img" alt="Blunder!">`;
}

function extractImageCheckpoints(img) {
  try {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = 400;
    offCanvas.height = 400;
    const offCtx = offCanvas.getContext("2d");

    let dw = 400;
    let dh = 400;
    let dx = 0;
    let dy = 0;
    if (img.width !== 400 || img.height !== 400) {
      const scale = Math.min(340 / img.width, 340 / img.height);
      dw = img.width * scale;
      dh = img.height * scale;
      dx = (400 - dw) / 2;
      dy = (400 - dh) / 2;
    }
    offCtx.drawImage(img, dx, dy, dw, dh);

    const imgData = offCtx.getImageData(0, 0, 400, 400);
    const data = imgData.data;

    let hasTransparency = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 200) {
        hasTransparency = true;
        break;
      }
    }

    const guideCanvas = document.createElement("canvas");
    guideCanvas.width = 400;
    guideCanvas.height = 400;
    const gCtx = guideCanvas.getContext("2d");

    if (hasTransparency) {
      gCtx.drawImage(offCanvas, 0, 0);
      gCtx.globalCompositeOperation = "source-in";
      gCtx.fillStyle = "rgba(161, 161, 170, 0.35)";
      gCtx.fillRect(0, 0, 400, 400);
    } else {
      const guideData = gCtx.createImageData(400, 400);
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg < 200) {
          guideData.data[i] = 161;
          guideData.data[i + 1] = 161;
          guideData.data[i + 2] = 170;
          guideData.data[i + 3] = 90;
        }
      }
      gCtx.putImageData(guideData, 0, 0);
    }

    const minSpacing = 8;
    const grid = {};
    const checkpoints = [];

    for (let y = 0; y < 400; y++) {
      for (let x = 0; x < 400; x++) {
        const idx = (y * 400 + x) * 4;
        const isStroke = hasTransparency ? (data[idx + 3] > 60) : (((data[idx] + data[idx + 1] + data[idx + 2]) / 3) < 200);
        if (isStroke) {
          const gx = Math.floor(x / minSpacing);
          const gy = Math.floor(y / minSpacing);
          const key = gx + "," + gy;
          if (!grid[key]) {
            grid[key] = true;
            checkpoints.push({ x: x, y: y, hit: false });
          }
        }
      }
    }

    const perimeter = Math.max(100, checkpoints.length * minSpacing);
    return { checkpoints, perimeter, guideCanvas };
  } catch (err) {
    return null;
  }
}

function buildHeartCheckpoints() {
  const checkpoints = [];
  const total = 160;
  for (let i = 0; i < total; i++) {
    const t = (i / total) * (Math.PI * 2);
    const xRaw = 16 * Math.pow(Math.sin(t), 3);
    const yRaw = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const x = 200 + xRaw * 8.5;
    const y = 190 + yRaw * 8.5;
    checkpoints.push({ x: x, y: y, hit: false });
  }
  let perimeter = 0;
  for (let i = 0; i < checkpoints.length; i++) {
    const next = checkpoints[(i + 1) % checkpoints.length];
    perimeter += Math.hypot(next.x - checkpoints[i].x, next.y - checkpoints[i].y);
  }
  return { checkpoints: checkpoints, perimeter: perimeter, guideCanvas: null };
}

function buildStarCheckpoints() {
  const starVertices = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? 120 : 50;
    starVertices.push({ x: 200 + r * Math.cos(angle), y: 205 + r * Math.sin(angle) });
  }
  const checkpoints = [];
  for (let i = 0; i < 10; i++) {
    const pA = starVertices[i];
    const pB = starVertices[(i + 1) % 10];
    for (let s = 0; s < 16; s++) {
      const u = s / 16;
      checkpoints.push({
        x: pA.x + (pB.x - pA.x) * u,
        y: pA.y + (pB.y - pA.y) * u,
        hit: false
      });
    }
  }
  let perimeter = 0;
  for (let i = 0; i < checkpoints.length; i++) {
    const next = checkpoints[(i + 1) % checkpoints.length];
    perimeter += Math.hypot(next.x - checkpoints[i].x, next.y - checkpoints[i].y);
  }
  return { checkpoints: checkpoints, perimeter: perimeter, guideCanvas: null };
}

let isPlaying = false;
let isDrawing = false;
let timeLeft = GAME_DURATION;
let timerId = null;

let strokes = [];
let currentStroke = [];
let totalDrawnLength = 0;
let onTargetLength = 0;
let lastPoint = null;

let targetCheckpoints = [];
let targetPerimeter = 0;
let guideCanvas = null;
let guideImg = null;

function setupDrawingTarget2() {
  const config = activeDay && activeDay.prompt2;
  if (config && (config.image || (config.points && config.points.length > 0))) {
    if (config.points && config.points.length > 0) {
      targetCheckpoints = config.points.map(p => ({ x: p[0], y: p[1], hit: false }));
      targetPerimeter = targetCheckpoints.length * 12;
    }
    if (config.image) {
      const img = new Image();
      guideImg = img;
      img.src = config.image;
      img.onload = () => {
        const res = extractImageCheckpoints(img);
        if (res && res.checkpoints.length >= 15) {
          if (!config.points || config.points.length === 0) {
            targetCheckpoints = res.checkpoints;
            targetPerimeter = res.perimeter;
          }
          guideCanvas = res.guideCanvas;
        }
        renderScene();
      };
      img.onerror = () => {
        if (!config.points || config.points.length === 0) {
          const fallback = buildHeartCheckpoints();
          targetCheckpoints = fallback.checkpoints;
          targetPerimeter = fallback.perimeter;
        }
        guideImg = null;
        guideCanvas = null;
        renderScene();
      };
    }
    renderScene();
  } else {
    const fallback = buildHeartCheckpoints();
    targetCheckpoints = fallback.checkpoints;
    targetPerimeter = fallback.perimeter;
    guideCanvas = null;
    guideImg = null;
    renderScene();
  }
}

setupDrawingTarget2();

function renderScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (guideCanvas) {
    ctx.drawImage(guideCanvas, 0, 0);
  } else if (guideImg && guideImg.complete && guideImg.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.drawImage(guideImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(161, 161, 170, 0.3)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([6, 6]);
    for (let i = 0; i < targetCheckpoints.length; i++) {
      const pt = targetCheckpoints[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = "#f4f4f5";
  ctx.fillStyle = "#f4f4f5";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke[0].x, stroke[0].y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }
}

renderScene();

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width ? (canvas.width / rect.width) : 1;
  const scaleY = rect.height ? (canvas.height / rect.height) : 1;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener("pointerdown", (e) => {
  if (!isPlaying) return;
  e.preventDefault();
  isDrawing = true;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (err) {}

  const pos = getCanvasPos(e);
  currentStroke = [pos];
  strokes.push(currentStroke);
  lastPoint = pos;

  recordAndCheckPoint(pos);
  renderScene();
});

canvas.addEventListener("pointermove", (e) => {
  if (!isPlaying || !isDrawing) return;
  e.preventDefault();

  const pos = getCanvasPos(e);
  currentStroke.push(pos);

  if (lastPoint) {
    totalDrawnLength += Math.hypot(pos.x - lastPoint.x, pos.y - lastPoint.y);
    recordAndCheckSegment(lastPoint, pos);
  } else {
    recordAndCheckPoint(pos);
  }
  lastPoint = pos;

  renderScene();
});

canvas.addEventListener("pointerup", (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  isDrawing = false;
  lastPoint = null;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch (err) {}
});

canvas.addEventListener("pointercancel", () => {
  isDrawing = false;
  lastPoint = null;
});

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function recordAndCheckSegment(p1, p2) {
  const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  let isNearShape = false;
  for (const pt of targetCheckpoints) {
    const d = distToSegment(pt.x, pt.y, p1.x, p1.y, p2.x, p2.y);
    if (d <= HIT_TOLERANCE) {
      pt.hit = true;
      isNearShape = true;
    } else if (d <= 14) {
      isNearShape = true;
    }
  }
  if (isNearShape) {
    onTargetLength += segLen;
  }
}

function recordAndCheckPoint(pos) {
  for (const pt of targetCheckpoints) {
    if (!pt.hit) {
      const distance = Math.hypot(pt.x - pos.x, pt.y - pos.y);
      if (distance <= HIT_TOLERANCE) {
        pt.hit = true;
      }
    }
  }
}

function startGame() {
  isPlaying = true;
  isDrawing = false;
  timeLeft = GAME_DURATION;
  strokes = [];
  currentStroke = [];
  totalDrawnLength = 0;
  onTargetLength = 0;
  lastPoint = null;

  for (const pt of targetCheckpoints) {
    pt.hit = false;
  }

  timerDisplay.textContent = timeLeft;
  doneBtn.disabled = false;
  doneBtn.textContent = "Done";
  resultCard.classList.add("hidden");

  renderScene();

  timerId = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  clearInterval(timerId);
  isPlaying = false;
  isDrawing = false;
  
  doneBtn.disabled = true;
  doneBtn.textContent = "Attempt Finished";

  const hitCount = targetCheckpoints.filter(p => p.hit).length;
  const coveragePercent = Math.round((hitCount / (targetCheckpoints.length || 1)) * 100);

  const drawnRatio = totalDrawnLength / (targetPerimeter || 1);
  const onTargetRatio = totalDrawnLength > 0 ? (onTargetLength / totalDrawnLength) : 0;

  let finalScore = 0;
  if (drawnRatio > 2.2 || (drawnRatio > 1.4 && onTargetRatio < 0.40) || onTargetRatio < 0.25 || drawnRatio < 0.15) {
    finalScore = 0;
  } else {
    let underdrawPenalty = 0;
    if (drawnRatio < 0.85) {
      underdrawPenalty = (0.85 - drawnRatio) * 80;
    }
    let overdrawPenalty = 0;
    if (drawnRatio > 1.20) {
      overdrawPenalty = (drawnRatio - 1.20) * 55;
    }
    let strayPenalty = 0;
    if (onTargetRatio < 0.85) {
      strayPenalty = (0.85 - onTargetRatio) * 60;
    }
    finalScore = Math.max(0, Math.min(100, Math.round(coveragePercent - underdrawPenalty - overdrawPenalty - strayPenalty)));
  }

  resultEmoji.innerHTML = getScoreBadge(finalScore);
  resultStats.textContent = `${finalScore}% Accuracy`;
  gameResultsHTML[1] = getScoreBadge(finalScore);
  gameResultsText[1] = getDrawShareEmoji(finalScore);
  resultCard.classList.remove("hidden");
  saveGameState({ currentPrompt: 3, gameResultsHTML: gameResultsHTML, gameResultsText: gameResultsText });
}

doneBtn.addEventListener("click", () => {
  if (isPlaying) {
    endGame();
  }
});

const p2NextBtn = document.getElementById("p2-next-btn");
p2NextBtn.addEventListener("click", () => {
  prompt2Section.classList.add("hidden");
  prompt3Section.classList.remove("hidden");
  startPrompt3();
});

const prompt3Section = document.getElementById("prompt-3-section");
const memoryGrid = document.getElementById("memory-grid");
const p3TimerDisplay = document.getElementById("p3-timer-display");
const p3ResultCard = document.getElementById("p3-result-card");
const p3ResultEmoji = document.getElementById("p3-result-emoji");
const p3ResultStats = document.getElementById("p3-result-stats");

let p3StartTime = null;
let p3TimerId = null;
let flippedCards = [];
let matchedPairs = 0;
let lockBoard = false;

function parseBadgeEntry(raw) {
  if (!raw) return { html: "❓", text: "❓" };
  if (typeof raw === "string") {
    if (raw === ":brilliant:" || raw === "images/brilliant.png") {
      return { html: `<img src="images/brilliant.png" class="badge-img" alt="Brilliant!">`, text: ":brilliant:" };
    }
    if (raw === ":blunder:" || raw === "images/blunder.png") {
      return { html: `<img src="images/blunder.png" class="badge-img" alt="Blunder!">`, text: ":blunder:" };
    }
    return { html: raw, text: raw };
  }
  const html = raw.badge || (raw.emoji === ":brilliant:" || raw.emoji === "images/brilliant.png" ? `<img src="images/brilliant.png" class="badge-img" alt="Brilliant!">` : (raw.emoji === ":blunder:" || raw.emoji === "images/blunder.png" ? `<img src="images/blunder.png" class="badge-img" alt="Blunder!">` : raw.emoji));
  const text = raw.shareEmoji || raw.emoji || (raw.badge ? ":badge:" : "❓");
  return { html, text };
}

function getTimeScoreBadge(sec, tiers) {
  if (!tiers || tiers.length === 0) {
    return { html: "🎯", text: "🎯" };
  }
  for (const tier of tiers) {
    const limit = tier.time !== undefined ? tier.time : (tier.maxTime !== undefined ? tier.maxTime : tier.seconds);
    if (limit === undefined || limit === null || sec <= limit) {
      return parseBadgeEntry(tier);
    }
  }
  return parseBadgeEntry(tiers[tiers.length - 1]);
}

function getMemoryBadge(seconds) {
  const config = activeDay && activeDay.prompt3;
  const defaultP3Tiers = [
    { time: 6.0, emoji: "🐇" },
    { time: 8.0, emoji: "🐘" },
    { time: 10.0, emoji: "🐈" },
    { time: 12.0, emoji: "🦘" },
    { time: 15.0, emoji: "🦐" },
    { emoji: "🐢" }
  ];
  const tiers = (config && config.tiers) || defaultP3Tiers;
  return getTimeScoreBadge(seconds, tiers).html;
}

function startPrompt3() {
  memoryGrid.innerHTML = "";
  flippedCards = [];
  matchedPairs = 0;
  lockBoard = false;
  p3ResultCard.classList.add("hidden");

  const imagesList = activeDay.prompt3.images;
  const deck = [...imagesList, ...imagesList].sort(() => Math.random() - 0.5);

  deck.forEach((imgSrc) => {
    const card = document.createElement("div");
    card.classList.add("memory-card");
    card.dataset.image = imgSrc;

    const img = document.createElement("img");
    img.src = imgSrc;
    card.appendChild(img);

    card.addEventListener("click", () => handleCardClick(card));
    memoryGrid.appendChild(card);
  });

  p3StartTime = Date.now();
  p3TimerDisplay.textContent = "0.0";
  p3TimerId = setInterval(() => {
    const elapsed = ((Date.now() - p3StartTime) / 1000).toFixed(1);
    p3TimerDisplay.textContent = elapsed;
  }, 100);
}

function handleCardClick(card) {
  if (lockBoard) return;
  if (card.classList.contains("revealed") || card.classList.contains("matched")) return;

  card.classList.add("revealed");
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    const [card1, card2] = flippedCards;

    if (card1.dataset.image === card2.dataset.image) {
      card1.classList.add("matched");
      card2.classList.add("matched");
      flippedCards = [];
      matchedPairs++;

      if (matchedPairs === 4) {
        endPrompt3();
      }
    } else {
      lockBoard = true;
      setTimeout(() => {
        card1.classList.remove("revealed");
        card2.classList.remove("revealed");
        flippedCards = [];
        lockBoard = false;
      }, 600);
    }
  }
}

function endPrompt3() {
  clearInterval(p3TimerId);
  const finalSeconds = parseFloat(((Date.now() - p3StartTime) / 1000).toFixed(1));

  const config = activeDay && activeDay.prompt3;
  const defaultP3Tiers = [
    { time: 6.0, emoji: "🐇" },
    { time: 8.0, emoji: "🐘" },
    { time: 10.0, emoji: "🐈" },
    { time: 12.0, emoji: "🦘" },
    { time: 15.0, emoji: "🦐" },
    { emoji: "🐢" }
  ];
  const tiers = (config && config.tiers) || defaultP3Tiers;
  const badgeResult = getTimeScoreBadge(finalSeconds, tiers);

  p3ResultEmoji.innerHTML = badgeResult.html;
  p3ResultStats.textContent = `${finalSeconds}s`;
  gameResultsHTML[2] = badgeResult.html;
  gameResultsText[2] = badgeResult.text;
  p3ResultCard.classList.remove("hidden");
  saveGameState({ currentPrompt: 4, gameResultsHTML: gameResultsHTML, gameResultsText: gameResultsText });
}

const p3NextBtn = document.getElementById("p3-next-btn");
p3NextBtn.addEventListener("click", () => {
  prompt3Section.classList.add("hidden");
  prompt4Section.classList.remove("hidden");
  startPrompt4();
});

const prompt4Section = document.getElementById("prompt-4-section");
const p4Title = document.getElementById("p4-title");
const p4Instruction = document.getElementById("p4-instruction");
const p4Input = document.getElementById("p4-input");
const p4SubmitBtn = document.getElementById("p4-submit-btn");
const p4InputArea = document.getElementById("p4-input-area");
const p4ResultCard = document.getElementById("p4-result-card");
const p4ResultEmoji = document.getElementById("p4-result-emoji");
const p4ResultStats = document.getElementById("p4-result-stats");
const p4TimerDisplay = document.getElementById("p4-timer-display");

let p4TimeLeft = activeDay.prompt4.duration || 15;
let p4TimerId = null;

if (activeDay.prompt4.question) {
  p4Title.textContent = activeDay.prompt4.question;
}
if (activeDay.prompt4.instruction) {
  p4Instruction.textContent = activeDay.prompt4.instruction;
}

function getKrillionBadge(label) {
  if (label === "One in a Krillion") {
    return `<img src="images/krillion.png" class="badge-img" alt="One in a Krillion">`;
  }
  if (label === "Deep Cut") {
    return "🏮";
  }
  if (label === "Rare") {
    return "🦑";
  }
  if (label === "Schooler") {
    return "🐟";
  }
  if (label === "Plankton") {
    return `<img src="images/plankton.png" class="badge-img" alt="Plankton">`;
  }
  return "⬛";
}

function startPrompt4() {
  p4TimeLeft = activeDay.prompt4.duration || 15;
  p4TimerDisplay.textContent = p4TimeLeft;
  p4Input.value = "";
  p4InputArea.classList.remove("hidden");
  p4ResultCard.classList.add("hidden");
  p4Input.focus();

  p4TimerId = setInterval(() => {
    p4TimeLeft--;
    p4TimerDisplay.textContent = p4TimeLeft;

    if (p4TimeLeft <= 0) {
      finishPrompt4(null);
    }
  }, 1000);
}

function finishPrompt4(match) {
  clearInterval(p4TimerId);
  p4InputArea.classList.add("hidden");

  if (match) {
    const badge = getKrillionBadge(match.label);
    p4ResultEmoji.innerHTML = badge;
    p4ResultStats.textContent = match.label;
    gameResultsHTML[3] = badge;
    gameResultsText[3] = getKrillionShareEmoji(match.label);
  } else {
    const badge = getKrillionBadge(null);
    p4ResultEmoji.innerHTML = badge;
    p4ResultStats.textContent = "Miss";
    gameResultsHTML[3] = badge;
    gameResultsText[3] = "⬛";
  }

  p4ResultCard.classList.remove("hidden");
  saveGameState({ currentPrompt: 5, gameResultsHTML: gameResultsHTML, gameResultsText: gameResultsText });
}

function submitPrompt4() {
  const guess = p4Input.value.trim().toLowerCase();
  if (!guess) return;

  const match = activeDay.prompt4.database.find(item => 
    item.names.some(name => name.toLowerCase() === guess || guess.includes(name.toLowerCase()))
  );

  if (!match) {
    p4Input.style.borderColor = "#ef4444";
    setTimeout(() => {
      p4Input.style.borderColor = "";
    }, 400);
    return;
  }

  finishPrompt4(match);
}

p4SubmitBtn.addEventListener("click", submitPrompt4);
p4Input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    submitPrompt4();
  }
});

const p4NextBtn = document.getElementById("p4-next-btn");
p4NextBtn.addEventListener("click", () => {
  prompt4Section.classList.add("hidden");
  prompt5Section.classList.remove("hidden");
  startPrompt5();
});

const prompt5Section = document.getElementById("prompt-5-section");
const p5Title = document.getElementById("p5-title");
const p5Instruction = document.getElementById("p5-instruction");
const p5Canvas = document.getElementById("p5-paintCanvas");
const p5Ctx = p5Canvas.getContext("2d");

const p5ReactionArena = document.getElementById("p5-reaction-arena");
const p5ReactionCountdown = document.getElementById("p5-reaction-countdown");
const p5CountdownText = document.getElementById("p5-countdown-text");
const p5Controls = document.getElementById("p5-controls");

const p5TimerLabel = document.getElementById("p5-timer-label");
const p5TimerDisplay = document.getElementById("p5-timer-display");
const p5DoneBtn = document.getElementById("p5-done-btn");
const p5ResultCard = document.getElementById("p5-result-card");
const p5ResultEmoji = document.getElementById("p5-result-emoji");
const p5ResultStats = document.getElementById("p5-result-stats");

const P5_DURATION = (activeDay.prompt5 && activeDay.prompt5.duration) || 10;
let p5IsPlaying = false;
let p5IsDrawing = false;
let p5TimeLeft = P5_DURATION;
let p5TimerId = null;

let p5Strokes = [];
let p5CurrentStroke = [];
let p5TotalDrawnLength = 0;
let p5OnTargetLength = 0;
let p5LastPoint = null;

let p5TargetCheckpoints = [];
let p5TargetPerimeter = 0;
let p5GuideCanvas = null;
let p5GuideImg = null;

function setupDrawingTarget5() {
  if (isPrompt5Reaction()) return;
  const config = activeDay && activeDay.prompt5;
  if (config && (config.image || (config.points && config.points.length > 0))) {
    if (config.points && config.points.length > 0) {
      p5TargetCheckpoints = config.points.map(p => ({ x: p[0], y: p[1], hit: false }));
      p5TargetPerimeter = p5TargetCheckpoints.length * 12;
    }
    if (config.image) {
      const img = new Image();
      p5GuideImg = img;
      img.src = config.image;
      img.onload = () => {
        const res = extractImageCheckpoints(img);
        if (res && res.checkpoints.length >= 15) {
          if (!config.points || config.points.length === 0) {
            p5TargetCheckpoints = res.checkpoints;
            p5TargetPerimeter = res.perimeter;
          }
          p5GuideCanvas = res.guideCanvas;
        }
        renderScene5();
      };
      img.onerror = () => {
        if (!config.points || config.points.length === 0) {
          const fallback = buildStarCheckpoints();
          p5TargetCheckpoints = fallback.checkpoints;
          p5TargetPerimeter = fallback.perimeter;
        }
        p5GuideImg = null;
        p5GuideCanvas = null;
        renderScene5();
      };
    }
    renderScene5();
  } else {
    const fallback = buildStarCheckpoints();
    p5TargetCheckpoints = fallback.checkpoints;
    p5TargetPerimeter = fallback.perimeter;
    p5GuideCanvas = null;
    p5GuideImg = null;
    renderScene5();
  }
}

setupDrawingTarget5();

function renderScene5() {
  p5Ctx.clearRect(0, 0, p5Canvas.width, p5Canvas.height);

  if (p5GuideCanvas) {
    p5Ctx.drawImage(p5GuideCanvas, 0, 0);
  } else if (p5GuideImg && p5GuideImg.complete && p5GuideImg.naturalWidth > 0) {
    p5Ctx.save();
    p5Ctx.globalAlpha = 0.4;
    p5Ctx.drawImage(p5GuideImg, 0, 0, p5Canvas.width, p5Canvas.height);
    p5Ctx.restore();
  } else {
    p5Ctx.beginPath();
    p5Ctx.strokeStyle = "rgba(161, 161, 170, 0.3)";
    p5Ctx.lineWidth = 6;
    p5Ctx.lineCap = "round";
    p5Ctx.lineJoin = "round";
    p5Ctx.setLineDash([6, 6]);
    for (let i = 0; i < p5TargetCheckpoints.length; i++) {
      const pt = p5TargetCheckpoints[i];
      if (i === 0) p5Ctx.moveTo(pt.x, pt.y);
      else p5Ctx.lineTo(pt.x, pt.y);
    }
    p5Ctx.closePath();
    p5Ctx.stroke();
    p5Ctx.setLineDash([]);
  }

  p5Ctx.strokeStyle = "#f4f4f5";
  p5Ctx.fillStyle = "#f4f4f5";
  p5Ctx.lineWidth = 5;
  p5Ctx.lineCap = "round";
  p5Ctx.lineJoin = "round";

  for (const stroke of p5Strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      p5Ctx.beginPath();
      p5Ctx.arc(stroke[0].x, stroke[0].y, 2.5, 0, Math.PI * 2);
      p5Ctx.fill();
      continue;
    }
    p5Ctx.beginPath();
    p5Ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      p5Ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    p5Ctx.stroke();
  }
}

renderScene5();

function getCanvasPos5(e) {
  const rect = p5Canvas.getBoundingClientRect();
  const scaleX = rect.width ? (p5Canvas.width / rect.width) : 1;
  const scaleY = rect.height ? (p5Canvas.height / rect.height) : 1;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

p5Canvas.addEventListener("pointerdown", (e) => {
  if (!p5IsPlaying) return;
  e.preventDefault();
  p5IsDrawing = true;
  try {
    p5Canvas.setPointerCapture(e.pointerId);
  } catch (err) {}

  const pos = getCanvasPos5(e);
  p5CurrentStroke = [pos];
  p5Strokes.push(p5CurrentStroke);
  p5LastPoint = pos;

  recordAndCheckPoint5(pos);
  renderScene5();
});

p5Canvas.addEventListener("pointermove", (e) => {
  if (!p5IsPlaying || !p5IsDrawing) return;
  e.preventDefault();

  const pos = getCanvasPos5(e);
  p5CurrentStroke.push(pos);

  if (p5LastPoint) {
    p5TotalDrawnLength += Math.hypot(pos.x - p5LastPoint.x, pos.y - p5LastPoint.y);
    recordAndCheckSegment5(p5LastPoint, pos);
  } else {
    recordAndCheckPoint5(pos);
  }
  p5LastPoint = pos;

  renderScene5();
});

p5Canvas.addEventListener("pointerup", (e) => {
  if (!p5IsDrawing) return;
  e.preventDefault();
  p5IsDrawing = false;
  p5LastPoint = null;
  try {
    p5Canvas.releasePointerCapture(e.pointerId);
  } catch (err) {}
});

p5Canvas.addEventListener("pointercancel", () => {
  p5IsDrawing = false;
  p5LastPoint = null;
});

function recordAndCheckSegment5(p1, p2) {
  const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  let isNearShape = false;
  for (const pt of p5TargetCheckpoints) {
    const d = distToSegment(pt.x, pt.y, p1.x, p1.y, p2.x, p2.y);
    if (d <= HIT_TOLERANCE) {
      pt.hit = true;
      isNearShape = true;
    } else if (d <= 14) {
      isNearShape = true;
    }
  }
  if (isNearShape) {
    p5OnTargetLength += segLen;
  }
}

function recordAndCheckPoint5(pos) {
  for (const pt of p5TargetCheckpoints) {
    if (!pt.hit) {
      const distance = Math.hypot(pt.x - pos.x, pt.y - pos.y);
      if (distance <= HIT_TOLERANCE) {
        pt.hit = true;
      }
    }
  }
}

let p5ReactionActive = false;
let p5ReactionStartTime = 0;
let p5PenaltySeconds = 0;
let p5ReactionTargetsTotal = 5;
let p5ReactionTargetsLeft = 5;
let p5ReactionMisses = 0;
let p5CountdownTimer1 = null;
let p5CountdownTimer2 = null;

function isPrompt5Reaction() {
  const p5 = activeDay && activeDay.prompt5;
  if (!p5) return false;
  if (p5.type === "reaction") return true;
  if (currentDayNumber >= 3 && (!p5.points || p5.points.length === 0)) return true;
  return false;
}

function getReactionBadgeHTML(sec) {
  const config = activeDay && activeDay.prompt5;
  const tiers = (config && config.tiers) || [];
  return getTimeScoreBadge(sec, tiers).html;
}

function getReactionShareEmoji(sec) {
  const config = activeDay && activeDay.prompt5;
  const tiers = (config && config.tiers) || [];
  return getTimeScoreBadge(sec, tiers).text;
}

function startPrompt5() {
  if (isPrompt5Reaction()) {
    const config = activeDay && activeDay.prompt5;
    const totalCount = (config && (config.targetCount || config.squares || config.count)) || 5;
    if (p5Title) p5Title.textContent = (config && config.title) || "Prompt #5: Quick Reflexes";
    if (p5Instruction) p5Instruction.textContent = (config && config.instruction) || `Click all ${totalCount} targets as fast as you can!`;
    startPrompt5Reaction();
    return;
  }

  if (p5Title) p5Title.textContent = "Prompt #5: Draw again";
  if (p5Instruction) p5Instruction.textContent = "Time to draw again. Noob.";
  p5Canvas.classList.remove("hidden");
  if (p5ReactionArena) p5ReactionArena.classList.add("hidden");
  if (p5Controls) p5Controls.classList.remove("hidden");

  p5IsPlaying = true;
  p5IsDrawing = false;
  p5TimeLeft = P5_DURATION;
  p5Strokes = [];
  p5CurrentStroke = [];
  p5TotalDrawnLength = 0;
  p5OnTargetLength = 0;
  p5LastPoint = null;

  for (const pt of p5TargetCheckpoints) {
    pt.hit = false;
  }

  p5TimerDisplay.textContent = p5TimeLeft;
  p5DoneBtn.disabled = false;
  p5DoneBtn.textContent = "Done";
  p5ResultCard.classList.add("hidden");

  renderScene5();

  p5TimerId = setInterval(() => {
    p5TimeLeft--;
    p5TimerDisplay.textContent = p5TimeLeft;

    if (p5TimeLeft <= 0) {
      endPrompt5();
    }
  }, 1000);
}

function startPrompt5Reaction() {
  p5ReactionActive = false;
  clearInterval(p5TimerId);
  clearTimeout(p5CountdownTimer1);
  clearTimeout(p5CountdownTimer2);

  const config = activeDay && activeDay.prompt5;
  p5ReactionTargetsTotal = (config && (config.targetCount || config.squares || config.count)) || 5;
  p5ReactionTargetsLeft = p5ReactionTargetsTotal;
  p5ReactionMisses = 0;
  p5PenaltySeconds = 0;

  if (p5TimerLabel) p5TimerLabel.textContent = "Time:";
  p5TimerDisplay.textContent = "0.00";

  p5Canvas.classList.add("hidden");
  if (p5Controls) p5Controls.classList.add("hidden");
  if (p5ReactionArena) {
    p5ReactionArena.classList.remove("hidden");
    p5ReactionArena.querySelectorAll(".reaction-target").forEach(el => el.remove());
    p5ReactionArena.querySelectorAll(".penalty-floater").forEach(el => el.remove());
  }
  p5ResultCard.classList.add("hidden");

  if (p5ReactionCountdown && p5CountdownText) {
    p5ReactionCountdown.classList.remove("hidden");
    p5CountdownText.textContent = "Ready...";
    p5CountdownText.classList.remove("countdown-go");

    p5CountdownTimer1 = setTimeout(() => {
      p5CountdownText.textContent = "GO!";
      p5CountdownText.classList.add("countdown-go");

      p5CountdownTimer2 = setTimeout(() => {
        p5ReactionCountdown.classList.add("hidden");
        p5ReactionActive = true;
        p5ReactionStartTime = performance.now();
        spawnReactionTargets();

        p5TimerId = setInterval(() => {
          if (!p5ReactionActive) return;
          const currentTotal = ((performance.now() - p5ReactionStartTime) / 1000) + p5PenaltySeconds;
          p5TimerDisplay.textContent = currentTotal.toFixed(2);
        }, 25);
      }, 400);
    }, 900);
  } else {
    p5ReactionActive = true;
    p5ReactionStartTime = performance.now();
    spawnReactionTargets();
    p5TimerId = setInterval(() => {
      if (!p5ReactionActive) return;
      const currentTotal = ((performance.now() - p5ReactionStartTime) / 1000) + p5PenaltySeconds;
      p5TimerDisplay.textContent = currentTotal.toFixed(2);
    }, 25);
  }
}

function spawnReactionTargets() {
  if (!p5ReactionArena) return;
  p5ReactionArena.querySelectorAll(".reaction-target").forEach(el => el.remove());

  const config = activeDay && activeDay.prompt5;
  const imgSrc = config && config.image;
  const count = p5ReactionTargetsTotal;
  const placed = [];

  const sizePct = count > 8 ? 13 : 16;
  const minDist = count > 8 ? 14 : (count > 6 ? 16 : 18);

  for (let i = 0; i < count; i++) {
    let x = 10;
    let y = 10;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 150) {
      attempts++;
      x = 6 + Math.random() * (88 - sizePct - 6);
      y = 6 + Math.random() * (88 - sizePct - 6);

      valid = true;
      for (const p of placed) {
        const dx = x - p.x;
        const dy = y - p.y;
        if (Math.hypot(dx, dy) < minDist) {
          valid = false;
          break;
        }
      }
    }

    placed.push({ x, y });

    const target = document.createElement("div");
    target.className = "reaction-target";
    target.style.left = x + "%";
    target.style.top = y + "%";

    if (imgSrc) {
      target.style.backgroundImage = `url("${imgSrc}")`;
    } else {
      target.textContent = "🎯";
    }

    target.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!p5ReactionActive) return;

      target.classList.add("hit");
      setTimeout(() => target.remove(), 140);

      p5ReactionTargetsLeft--;
      if (p5ReactionTargetsLeft <= 0) {
        endPrompt5Reaction();
      }
    });

    p5ReactionArena.appendChild(target);
  }
}

if (p5ReactionArena) {
  p5ReactionArena.addEventListener("pointerdown", (e) => {
    if (!p5ReactionActive) return;
    if (e.target.closest(".reaction-target") || e.target.closest(".reaction-countdown-overlay")) return;

    p5ReactionMisses++;
    p5PenaltySeconds += 0.5;

    const currentTotal = ((performance.now() - p5ReactionStartTime) / 1000) + p5PenaltySeconds;
    p5TimerDisplay.textContent = currentTotal.toFixed(2);

    p5ReactionArena.classList.add("miss-flash");
    setTimeout(() => p5ReactionArena.classList.remove("miss-flash"), 150);

    const rect = p5ReactionArena.getBoundingClientRect();
    const floater = document.createElement("div");
    floater.className = "penalty-floater";
    floater.textContent = "+0.5s";
    floater.style.left = (e.clientX - rect.left) + "px";
    floater.style.top = (e.clientY - rect.top) + "px";
    p5ReactionArena.appendChild(floater);
    setTimeout(() => floater.remove(), 700);
  });
}

function endPrompt5Reaction() {
  if (!p5ReactionActive) return;
  p5ReactionActive = false;
  clearInterval(p5TimerId);

  const finalTimeSec = parseFloat((((performance.now() - p5ReactionStartTime) / 1000) + p5PenaltySeconds).toFixed(2));
  p5TimerDisplay.textContent = finalTimeSec.toFixed(2);

  const badgeHTML = getReactionBadgeHTML(finalTimeSec);
  const shareEmoji = getReactionShareEmoji(finalTimeSec);

  p5ResultEmoji.innerHTML = badgeHTML;
  if (p5ReactionMisses > 0) {
    p5ResultStats.textContent = `${finalTimeSec.toFixed(2)}s (+${(p5ReactionMisses * 0.5).toFixed(1)}s penalty)`;
  } else {
    p5ResultStats.textContent = `${finalTimeSec.toFixed(2)}s`;
  }

  gameResultsHTML[4] = badgeHTML;
  gameResultsText[4] = shareEmoji;
  p5ResultCard.classList.remove("hidden");
  saveGameState({ currentPrompt: 6, gameResultsHTML: gameResultsHTML, gameResultsText: gameResultsText });
}

function endPrompt5() {
  clearInterval(p5TimerId);
  p5IsPlaying = false;
  p5IsDrawing = false;

  p5DoneBtn.disabled = true;
  p5DoneBtn.textContent = "Attempt Finished";

  const hitCount = p5TargetCheckpoints.filter(p => p.hit).length;
  const coveragePercent = Math.round((hitCount / (p5TargetCheckpoints.length || 1)) * 100);

  const drawnRatio = p5TotalDrawnLength / (p5TargetPerimeter || 1);
  const onTargetRatio = p5TotalDrawnLength > 0 ? (p5OnTargetLength / p5TotalDrawnLength) : 0;

  let finalScore = 0;
  if (drawnRatio > 2.2 || (drawnRatio > 1.4 && onTargetRatio < 0.40) || onTargetRatio < 0.25 || drawnRatio < 0.15) {
    finalScore = 0;
  } else {
    let underdrawPenalty = 0;
    if (drawnRatio < 0.85) {
      underdrawPenalty = (0.85 - drawnRatio) * 80;
    }
    let overdrawPenalty = 0;
    if (drawnRatio > 1.20) {
      overdrawPenalty = (drawnRatio - 1.20) * 55;
    }
    let strayPenalty = 0;
    if (onTargetRatio < 0.85) {
      strayPenalty = (0.85 - onTargetRatio) * 60;
    }
    finalScore = Math.max(0, Math.min(100, Math.round(coveragePercent - underdrawPenalty - overdrawPenalty - strayPenalty)));
  }

  p5ResultEmoji.innerHTML = getScoreBadge(finalScore);
  p5ResultStats.textContent = `${finalScore}% Accuracy`;
  gameResultsHTML[4] = getScoreBadge(finalScore);
  gameResultsText[4] = getDrawShareEmoji(finalScore);
  p5ResultCard.classList.remove("hidden");
  saveGameState({ currentPrompt: 6, gameResultsHTML: gameResultsHTML, gameResultsText: gameResultsText });
}

p5DoneBtn.addEventListener("click", () => {
  if (p5IsPlaying) {
    endPrompt5();
  }
});

const p5NextBtn = document.getElementById("p5-next-btn");
p5NextBtn.addEventListener("click", () => {
  prompt5Section.classList.add("hidden");
  prompt6Section.classList.remove("hidden");
  startPrompt6();
});

const prompt6Section = document.getElementById("prompt-6-section");
const p6FoodImg = document.getElementById("p6-food-img");
const p6Input = document.getElementById("p6-input");
const p6SubmitBtn = document.getElementById("p6-submit-btn");
const p6InputArea = document.getElementById("p6-input-area");
const p6ResultCard = document.getElementById("p6-result-card");
const p6ResultEmoji = document.getElementById("p6-result-emoji");
const p6ResultStats = document.getElementById("p6-result-stats");
const p6TimerDisplay = document.getElementById("p6-timer-display");

const P6_DURATION = (activeDay.prompt6 && activeDay.prompt6.duration) || 15;
let p6TimeLeft = P6_DURATION;
let p6TimerId = null;

if (activeDay.prompt6 && activeDay.prompt6.foodImage) {
  p6FoodImg.src = activeDay.prompt6.foodImage;
}

function startPrompt6() {
  p6TimeLeft = P6_DURATION;
  p6TimerDisplay.textContent = p6TimeLeft;
  p6Input.value = "";
  p6InputArea.classList.remove("hidden");
  p6ResultCard.classList.add("hidden");
  p6Input.focus();

  p6TimerId = setInterval(() => {
    p6TimeLeft--;
    p6TimerDisplay.textContent = p6TimeLeft;

    if (p6TimeLeft <= 0) {
      finishPrompt6(false);
    }
  }, 1000);
}

function finishPrompt6(isCorrect) {
  clearInterval(p6TimerId);

  if (activeDay.prompt6 && activeDay.prompt6.revealedImage) {
    p6FoodImg.src = activeDay.prompt6.revealedImage;
  }

  p6InputArea.classList.add("hidden");
  const mark = isCorrect ? "✅" : "❌";
  p6ResultEmoji.textContent = mark;
  gameResultsHTML[5] = mark;
  gameResultsText[5] = mark;

  if (isCorrect) {
    p6ResultStats.textContent = "";
  } else {
    const author = (activeDay.prompt6 && activeDay.prompt6.author) || (activeDay.prompt6 && activeDay.prompt6.acceptedAnswers[0]) || "";
    p6ResultStats.textContent = "It was " + author;
  }

  p6ResultCard.classList.remove("hidden");
  saveGameState({ completed: true, currentPrompt: 7, gameResultsHTML: gameResultsHTML, gameResultsText: gameResultsText });
}

function submitPrompt6() {
  const guess = p6Input.value.trim().toLowerCase();
  if (!guess) return;

  const isCorrect = (activeDay.prompt6.acceptedAnswers || []).map(a => a.toLowerCase()).includes(guess);
  finishPrompt6(isCorrect);
}

p6SubmitBtn.addEventListener("click", submitPrompt6);
p6Input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    submitPrompt6();
  }
});

function getDrawShareEmoji(score) {
  if (score >= 95) return ":brilliant:";
  if (score >= 80) return "🐘";
  if (score >= 75) return "🐈";
  if (score >= 60) return "🦘";
  if (score >= 40) return "🦐";
  return ":blunder:";
}

function getKrillionShareEmoji(label) {
  if (label === "One in a Krillion") return ":moaigold:";
  if (label === "Deep Cut") return "🏮";
  if (label === "Rare") return "🦑";
  if (label === "Schooler") return "🐟";
  if (label === "Plankton") return ":livelegcreaction:";
  return "⬛";
}

const p6NextBtn = document.getElementById("p6-next-btn");
const finalScreen = document.getElementById("final-screen");
const finalDayNum = document.getElementById("final-day-num");
const finalEmojisRow = document.getElementById("final-emojis-row");
const wordsChips = document.getElementById("words-chips");
const rerollWordsBtn = document.getElementById("reroll-words-btn");
const poemAssembled = document.getElementById("poem-assembled");
const clearPoemBtn = document.getElementById("clear-poem-btn");
const sharePreview = document.getElementById("share-text-preview");
const copyShareBtn = document.getElementById("copy-share-btn");

let selectedPoemWords = [];
let rerollsRemaining = 2;

p6NextBtn.addEventListener("click", () => {
  prompt6Section.classList.add("hidden");
  finalScreen.classList.remove("hidden");
  renderFinalScreen();
});

function updateRerollButton() {
  if (!rerollWordsBtn) return;
  rerollWordsBtn.textContent = `Reroll (${rerollsRemaining} left) 🎲`;
  if (rerollsRemaining <= 0) {
    rerollWordsBtn.disabled = true;
  } else {
    rerollWordsBtn.disabled = false;
  }
}

if (rerollWordsBtn) {
  rerollWordsBtn.addEventListener("click", () => {
    if (rerollsRemaining <= 0) return;
    rerollsRemaining--;
    updateRerollButton();
    generateWords();
  });
}

let currentChosenWords = [];

function saveCurrentPoemState() {
  saveGameState({
    completed: true,
    chosenWords: currentChosenWords,
    savedSelectedWords: selectedPoemWords.map(item => ({ word: item.word, idx: item.idx })),
    rerollsRemaining: rerollsRemaining,
    gameResultsHTML: gameResultsHTML,
    gameResultsText: gameResultsText
  });
}

function buildWordsAndPoem(savedSelected) {
  wordsChips.innerHTML = "";
  selectedPoemWords = [];

  const chipRefs = [];
  currentChosenWords.forEach((w, idx) => {
    const chip = document.createElement("div");
    chip.className = "word-chip";
    chip.textContent = w;

    chip.addEventListener("click", () => {
      if (chip.classList.contains("used")) return;
      chip.classList.add("used");
      selectedPoemWords.push({ word: w, idx: idx, chipRef: chip });
      renderPoemAssembled();
      saveCurrentPoemState();
    });

    wordsChips.appendChild(chip);
    chipRefs.push(chip);
  });

  if (savedSelected && savedSelected.length > 0) {
    savedSelected.forEach(item => {
      if (chipRefs[item.idx]) {
        chipRefs[item.idx].classList.add("used");
        selectedPoemWords.push({ word: item.word, idx: item.idx, chipRef: chipRefs[item.idx] });
      }
    });
  }

  updateRerollButton();
  renderPoemAssembled();
  updateSharePreview();
}

function generateWords() {
  wordsChips.innerHTML = "";
  selectedPoemWords = [];
  renderPoemAssembled();

  const pool = (activeDay && activeDay.wordPool && activeDay.wordPool.length > 0) ? activeDay.wordPool : ((typeof wordPool !== "undefined") ? wordPool : []);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  currentChosenWords = shuffled.slice(0, 15);

  if (currentChosenWords.length > 0) {
    buildWordsAndPoem([]);
    saveCurrentPoemState();
  } else {
    const emptyNotice = document.createElement("div");
    emptyNotice.style.color = "#71717a";
    emptyNotice.style.fontSize = "0.85rem";
    emptyNotice.textContent = "(No words in pool yet)";
    wordsChips.appendChild(emptyNotice);
    updateSharePreview();
  }
}

function renderFinalScreen() {
  finalDayNum.textContent = currentDayNumber;

  finalEmojisRow.innerHTML = "";
  gameResultsHTML.forEach(item => {
    const el = document.createElement("div");
    el.innerHTML = item;
    finalEmojisRow.appendChild(el);
  });

  const saved = getSavedState();
  if (saved && saved.chosenWords && saved.chosenWords.length > 0) {
    currentChosenWords = saved.chosenWords;
    rerollsRemaining = (typeof saved.rerollsRemaining === "number") ? saved.rerollsRemaining : 2;
    buildWordsAndPoem(saved.savedSelectedWords || []);
  } else {
    rerollsRemaining = 2;
    generateWords();
  }
}

function renderPoemAssembled() {
  poemAssembled.innerHTML = "";

  if (selectedPoemWords.length === 0) {
    const placeholder = document.createElement("span");
    placeholder.className = "poem-placeholder";
    placeholder.textContent = "Click words above to assemble your poem...";
    poemAssembled.appendChild(placeholder);
  } else {
    selectedPoemWords.forEach((item, index) => {
      const wordEl = document.createElement("span");
      wordEl.className = "poem-word-item";
      wordEl.textContent = item.word;

      wordEl.addEventListener("click", () => {
        item.chipRef.classList.remove("used");
        selectedPoemWords.splice(index, 1);
        renderPoemAssembled();
        saveCurrentPoemState();
      });

      poemAssembled.appendChild(wordEl);
    });
  }

  updateSharePreview();
}

clearPoemBtn.addEventListener("click", () => {
  selectedPoemWords.forEach(item => {
    item.chipRef.classList.remove("used");
  });
  selectedPoemWords = [];
  renderPoemAssembled();
  saveCurrentPoemState();
});

function updateSharePreview() {
  const emojisLine = gameResultsText.filter(Boolean).join(" ");
  const poem = selectedPoemWords.map(item => item.word).join(" ");
  const poemBlock = poem ? `"${poem}"\n\n` : "";
  const siteUrl = window.location.href.split("?")[0];
  const shareText = `Fuckdle #${currentDayNumber}\n\n${emojisLine}\n\n${poemBlock}${siteUrl}`;
  sharePreview.textContent = shareText;
  return shareText;
}

copyShareBtn.addEventListener("click", () => {
  const text = updateSharePreview();
  navigator.clipboard.writeText(text);
  copyShareBtn.textContent = "Copied! ✅";
  setTimeout(() => {
    copyShareBtn.textContent = "Copy Result 📋";
  }, 2000);
});

function checkSavedGame() {
  if (urlParams.get("reset") === "true" || urlParams.get("reset") === "1") {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  const saved = getSavedState();
  if (!saved) return;

  if (saved.gameResultsHTML) {
    for (let i = 0; i < 6; i++) {
      if (saved.gameResultsHTML[i]) gameResultsHTML[i] = saved.gameResultsHTML[i];
      if (saved.gameResultsText && saved.gameResultsText[i]) gameResultsText[i] = saved.gameResultsText[i];
    }
  }

  if (saved.completed) {
    introSection.classList.add("hidden");
    prompt1Section.classList.add("hidden");
    prompt2Section.classList.add("hidden");
    prompt3Section.classList.add("hidden");
    prompt4Section.classList.add("hidden");
    prompt5Section.classList.add("hidden");
    prompt6Section.classList.add("hidden");
    finalScreen.classList.remove("hidden");
    renderFinalScreen();
  } else if (saved.currentPrompt > 1) {
    introSection.classList.add("hidden");
    prompt1Section.classList.add("hidden");
    prompt2Section.classList.add("hidden");
    prompt3Section.classList.add("hidden");
    prompt4Section.classList.add("hidden");
    prompt5Section.classList.add("hidden");
    prompt6Section.classList.add("hidden");

    if (saved.currentPrompt === 2) {
      prompt2Section.classList.remove("hidden");
      startGame();
    } else if (saved.currentPrompt === 3) {
      prompt3Section.classList.remove("hidden");
      startPrompt3();
    } else if (saved.currentPrompt === 4) {
      prompt4Section.classList.remove("hidden");
      startPrompt4();
    } else if (saved.currentPrompt === 5) {
      prompt5Section.classList.remove("hidden");
      startPrompt5();
    } else if (saved.currentPrompt === 6) {
      prompt6Section.classList.remove("hidden");
      startPrompt6();
    }
  }
}

checkSavedGame();
