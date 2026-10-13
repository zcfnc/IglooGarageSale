const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE_PLAYER = "itsa-ghost-player";
const STORAGE_SCORES = "itsa-ghost-scores";
const STORAGE_PENDING_SCORES = "itsa-ghost-pending-scores";
const STORAGE_LANGUAGE = "itsa-ghost-language";
const GAME_SECONDS = 30;
const RANKING_REFRESH_MS = 5000;
const SUPABASE_URL = "https://hemvwmjfkbhqxhvcruvv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ihYv1vFt4UBWdIKZtZKrAw_h4cCujsL";

const screens = $$(".screen");
let rankingRefreshTimer = null;
let rankingRequestNumber = 0;
let musicMuted = false;
let currentLanguage = localStorage.getItem(STORAGE_LANGUAGE) === "en" ? "en" : "zh";
let scoreSyncState = { key: "uploading", bestScore: null };
const words = {
  zh: {
    cover: "游戏封面", instructions: "游戏说明", profile: "填写玩家信息", character: "选择角色", game: "游戏画面", gameover: "游戏结束", ranking: "实时排名",
    viewInstructions: "查看游戏说明", viewLeaderboard: "查看实时排名", startGame: "开始游戏", fillStart: "填写资料并开始", backCover: "返回封面", backInstructions: "返回说明",
    name: "姓名", email: "邮箱", submit: "确认提交", left: "向左移动", right: "向右移动", sound: "关闭背景音乐和音效", resume: "继续游戏", pause: "暂停游戏",
    paused: "游戏暂停", finalPoints: "分", rankAria: "玩家排行榜", sync: "正在同步所有玩家的成绩…", shared: "所有玩家共享榜单 · 每 5 秒自动刷新", failed: "连接失败，暂时显示本设备成绩",
    uploading: "正在上传成绩…", offline: "网络暂时不可用，成绩将在稍后自动重试", syncedBest: (n) => `本局已同步，个人最高分仍为 ${n} 分`, submitted: "成绩已计入所有玩家排行榜",
    emptyName: "请填写姓名", invalidEmail: "请填写有效邮箱，方便获奖后联系", switch: "Switch to English", languageButton: "EN"
  },
  en: {
    cover: "Game cover", instructions: "How to Play", profile: "Player details", character: "Choose a character", game: "Game screen", gameover: "Game over", ranking: "Live leaderboard",
    viewInstructions: "View game instructions", viewLeaderboard: "View live leaderboard", startGame: "Start game", fillStart: "Enter your details and start", backCover: "Back to cover", backInstructions: "Back to instructions",
    name: "Name", email: "Email", submit: "Submit", left: "Move left", right: "Move right", sound: "Turn off music and sound effects", resume: "Resume game", pause: "Pause game",
    paused: "Game paused", finalPoints: "pts", rankAria: "Player leaderboard", sync: "Syncing player scores…", shared: "Shared leaderboard · updates every 5s", failed: "Connection failed. Showing scores from this device.",
    uploading: "Uploading score…", offline: "Network unavailable. Your score will be retried later.", syncedBest: (n) => `Score synced. Your personal best is still ${n} pts.`, submitted: "Your score is on the shared leaderboard.",
    emptyName: "Please enter your name.", invalidEmail: "Enter a valid email so we can contact you if you win.", switch: "切换到中文", languageButton: "中文"
  }
};
const t = (key, ...args) => {
  const value = words[currentLanguage][key];
  return typeof value === "function" ? value(...args) : value;
};
const englishInstructions = `
  <h1>Ghostlight Chase</h1>
  <p class="instructions-subtitle">Halloween Special Edition<br>Presented by CDU Chinese Students and Scholars Association (CSSA) × IT Student Association</p>
  <h2>Think You're Smarter Than a Ghost? Prove It!</h2>
  <p class="instructions-tagline">Catch the Flames. Dodge the Charms. Survive the Night.</p>
  <h2>The Story</h2>
  <p>Halloween is just around the corner, and Darwin is getting into the spooky spirit!</p>
  <p>Jack-o'-lanterns are glowing, Halloween decorations are popping up around CDU, and everyone's getting ready for a night of tricks and treats.</p>
  <p>But something strange is happening...</p>
  <p>A mysterious portal has opened, bringing a bunch of adorable little Chinese hopping zombies, known as Jiangshi, all the way to the Top End!</p>
  <p>Don't worry, they're not here to cause trouble.</p>
  <p>These little fellas are actually pretty harmless. They're just a bit lost, struggling with the Aussie climate and running low on spirit energy.</p>
  <p>To keep themselves going, they need to collect magical spirit flames scattered throughout the night.</p>
  <p>But there's a problem!</p>
  <p>Some ancient Taoist talismans have also made their way through the portal. These powerful charms can stop a Jiangshi right in its tracks!</p>
  <p>Touch one, and you're frozen for 3 seconds. Get hit 3 times, and it's game over!</p>
  <p>That's where you come in!</p>
  <p>Help your little Jiangshi collect spirit flames, dodge those pesky talismans and make it through Halloween in one piece.</p>
  <p>Sounds easy? Give it a go!</p>
  <h2>Meet Your Characters</h2>
  <p>Pick your favourite little Jiangshi before the game begins!</p>
  <p>Both characters have the same abilities, so it's all about choosing your favourite look.</p>
  <ul class="character-notes"><li><strong>1. Little Official</strong><br>Meet our classic little Jiangshi! Sporting a traditional Qing Dynasty official's hat and an adorable round face, this little legend is ready to hop into action.</li><li><strong>2. Little Princess</strong><br>A little bit of royalty, a whole lot of cuteness! With her beautiful traditional headdress, floral decorations and elegant style, this little princess is ready for a spooky adventure.</li></ul>
  <h2>Know Your Items</h2>
  <ul><li><img src="assets/itsa/item-a-en.png" alt="Blue spirit flame"><span><strong>Blue Spirit Flame — +1 Point</strong><br>Your everyday spirit energy! These little blue flames are scattered throughout the game and are your main source of points. Catch one and score 1 point.</span></li><li><img src="assets/itsa/item-b-en.png" alt="Yellow spirit flame"><span><strong>Yellow Spirit Flame — +5 Points</strong><br>Spot a golden flame? You're in luck! These rare flames contain powerful spirit energy and are worth much more than the blue ones. Catch one and score 5 points.</span></li><li><img src="assets/itsa/item-hazard-en.png" alt="Taoist talisman"><span><strong>Taoist Talisman — Watch Out!</strong><br>These ancient charms are bad news for your little Jiangshi! Touch one and you'll be frozen for 3 seconds, unable to move. Get hit 3 times and it's Game Over! Keep your eyes peeled and dodge them whenever you can!</span></li></ul>
  <h2>How the Game Works</h2>
  <ol class="instructions-steps"><li><strong>Beat the Clock</strong><br>You've got 30 seconds to complete each level. Make every second count!</li><li><strong>Things Get Trickier</strong><br>The further you go, the faster the items move and the more often those pesky talismans appear. Think you can keep up?</li><li><strong>Rack Up the Points</strong><br>Your score carries over from level to level, so keep collecting those flames to build your total.</li><li><strong>Climb the Leaderboard</strong><br>Your personal best score is automatically saved. Check the live leaderboard to see how you stack up against other players.</li><li><strong>Win Mystery Prizes!</strong><br>Fancy a little reward? The top three players on the leaderboard during the event will score mystery prizes!</li></ol>
  <h2>Controls and Levels</h2>
  <p class="instructions-controls">On a computer, move with ← → or A/D. On a phone, use the buttons at the bottom of the screen. Each level lasts 30 seconds; the next level begins automatically. Your score and talisman hits carry over, and items move faster while talismans appear more often as you progress.</p>
  <h2>A Little Bit About Us</h2>
  <p>Ghostlight Chase is a Halloween collaboration between the CDU Chinese Students and Scholars Association (CSSA) and the IT Student Association.</p>
  <p>We've brought a little Chinese folklore to a classic Western celebration, creating a fun cultural mash-up right here in Darwin.</p>
  <p>Whether you're between classes, taking a study break or just keen for a quick challenge, this mobile-friendly game is ready whenever you are.</p>
  <p>It's all about having a laugh, sharing a bit of culture and bringing students together, no matter where they call home.</p>
  <p>Your email is only used to contact prize winners and is never shown publicly.</p>
  <p>Ready to give it a crack?</p>
  <p class="instructions-credit">Catch the flames. Dodge the charms. Beat the clock.<br>Let's see if you've got what it takes to top the leaderboard!</p>`;
const chineseInstructions = $(".instructions-copy").innerHTML;

function applyLanguage() {
  document.documentElement.lang = currentLanguage === "en" ? "en" : "zh-CN";
  const coverArtworkSuffix = currentLanguage === "en" ? "-en" : "";
  $("#open-instructions img").src = `assets/itsa/cover-instructions${coverArtworkSuffix}.png`;
  $("#open-profile img").src = `assets/itsa/cover-start${coverArtworkSuffix}.png`;
  $("#open-instructions img").alt = currentLanguage === "en" ? "Instructions" : "说明";
  $("#open-profile img").alt = currentLanguage === "en" ? "Start" : "开始";
  const localizedButtonArtwork = [
    ["#instructions-start img", "instructions-start.png", "instructions-start-en.png"],
    ["#player-form .profile-submit img", "profile-submit.png", "profile-submit-en.png"],
    ["#view-ranking img", "view-ranking.png", "view-ranking-en.png"],
    ["#ranking-back img", "ranking-back.png", "ranking-back-en.png"],
    [".gameover-actions .play-again img", "play-again.png", "play-again-en.png"],
    [".ranking-actions .play-again img", "ranking-play-again.png", "ranking-play-again-en.png"]
  ];
  for (const [selector, chineseArtwork, englishArtwork] of localizedButtonArtwork) {
    $(selector).src = `assets/itsa/${currentLanguage === "en" ? englishArtwork : chineseArtwork}`;
  }
  $("#move-left img").src = `assets/itsa/move-left${currentLanguage === "en" ? "-en" : ""}.png`;
  $("#move-right img").src = `assets/itsa/move-right${currentLanguage === "en" ? "-en" : ""}.png`;
  $("#move-left img").alt = currentLanguage === "en" ? "Move left" : "向左";
  $("#move-right img").alt = currentLanguage === "en" ? "Move right" : "向右";
  const localizedBackgrounds = {
    "screen-cover": currentLanguage === "en" ? "cover-en.webp" : "cover.webp",
    "screen-instructions": currentLanguage === "en" ? "instructions-en.webp" : "instructions.webp",
    "screen-profile": currentLanguage === "en" ? "profile-en.webp" : "profile.webp",
    "screen-character": currentLanguage === "en" ? "character-select-en.webp" : "character-select.webp",
    "screen-gameover": currentLanguage === "en" ? "game-over-en.webp" : "game-over.webp",
    "screen-ranking": currentLanguage === "en" ? "leaderboard-en.webp" : "leaderboard.webp"
  };
  for (const [screenId, filename] of Object.entries(localizedBackgrounds)) {
    $(`#${screenId}`).style.backgroundImage = `url("/assets/itsa/${filename}")`;
  }
  document.title = currentLanguage === "en" ? "Ghost Chase — Halloween Game" : "鬼冥追光";
  const toggle = $("#language-toggle");
  toggle.textContent = t("languageButton");
  toggle.setAttribute("aria-label", t("switch"));
  const labels = {
    "#screen-cover": "cover", "#screen-instructions": "instructions", "#screen-profile": "profile", "#screen-character": "character", "#screen-game": "game", "#screen-gameover": "gameover", "#screen-ranking": "ranking",
    "#open-instructions": "viewInstructions", "#open-profile": "startGame", "#instructions-start": "fillStart", "#player-form .profile-submit": "submit",
    "#move-left": "left", "#move-right": "right", "#ranking-list": "rankAria"
  };
  for (const [selector, key] of Object.entries(labels)) $(selector)?.setAttribute("aria-label", t(key));
  $("#screen-cover").setAttribute("aria-label", t("cover"));
  $("#screen-instructions").setAttribute("aria-label", t("instructions"));
  $("#screen-profile").setAttribute("aria-label", t("profile"));
  $("#screen-character").setAttribute("aria-label", t("character"));
  $("#screen-game").setAttribute("aria-label", t("game"));
  $("#screen-gameover").setAttribute("aria-label", t("gameover"));
  $("#screen-ranking").setAttribute("aria-label", t("ranking"));
  $("#open-instructions").setAttribute("aria-label", t("viewInstructions"));
  $("#open-profile").setAttribute("aria-label", t("startGame"));
  $("#instructions-start").setAttribute("aria-label", t("fillStart"));
  $("#player-name").placeholder = t("name");
  $("#player-email").placeholder = t("email");
  $("#player-name").previousElementSibling.textContent = t("name");
  $("#player-email").previousElementSibling.textContent = t("email");
  $("#instructions-start + .text-back").textContent = currentLanguage === "en" ? "Back to cover" : "返回封面";
  $("#screen-profile .text-back").textContent = t("backInstructions");
  const instructionCopy = $(".instructions-copy");
  if (instructionCopy) instructionCopy.innerHTML = currentLanguage === "en" ? englishInstructions : chineseInstructions;
  $("#pause-title").textContent = t("paused");
  $("#resume-game").textContent = t("resume");
  $("#pause-toggle").setAttribute("aria-label", game?.paused ? t("resume") : t("pause"));
  $("#sound-toggle").setAttribute("aria-label", musicMuted ? (currentLanguage === "en" ? "Turn on music and sound effects" : "开启背景音乐和音效") : t("sound"));
  $(".ranking-title").textContent = t("ranking");
  $("#ranking-note").textContent = t("sync");
  $("#final-score").nextSibling.textContent = ` ${t("finalPoints")}`;
  const status = $("#score-sync-status");
  if (status && scoreSyncState.key) status.textContent = t(scoreSyncState.key, scoreSyncState.bestScore);
  $$(".text-back").forEach((button) => {
    if (button.closest("#screen-instructions")) button.textContent = t("backCover");
    else if (button.closest("#screen-profile")) button.textContent = t("backInstructions");
  });
  $$('[data-character]').forEach((button, index) => {
    const characterName = index === 0 ? "official-hat" : "princess";
    button.setAttribute("aria-label", currentLanguage === "en" ? `Choose ${characterName} jiangshi` : `选择角色${index === 0 ? "甲" : "乙"}`);
    const image = button.querySelector("img");
    image.alt = currentLanguage === "en" ? `${characterName} jiangshi` : `角色${index === 0 ? "甲" : "乙"}`;
    image.src = `assets/itsa/character-${index === 0 ? "a" : "b"}-select${currentLanguage === "en" ? "-en" : ""}.png`;
  });
  $("#view-ranking").setAttribute("aria-label", currentLanguage === "en" ? "View live leaderboard" : "查看实时排名");
  $("#ranking-back").setAttribute("aria-label", currentLanguage === "en"
    ? (rankingReturnScreen === "screen-cover" ? "Back to cover" : "Back to game over")
    : (rankingReturnScreen === "screen-cover" ? "返回封面" : "返回游戏结束页面"));
  $$(".play-again").forEach((button) => button.setAttribute("aria-label", currentLanguage === "en" ? "Play again" : "再玩一次"));
  const altLabels = currentLanguage === "en"
    ? { "cover-instructions.png": "Instructions", "cover-instructions-en.png": "Instructions", "cover-start.png": "Start", "cover-start-en.png": "Start", "instructions-start.png": "Start", "instructions-start-en.png": "Start", "profile-submit.png": "Submit", "profile-submit-en.png": "Submit", "view-ranking.png": "Live ranking", "view-ranking-en.png": "Live ranking", "play-again.png": "Play again", "play-again-en.png": "Play again", "ranking-back.png": "Back", "ranking-back-en.png": "Back", "ranking-play-again-en.png": "Play again", "ranking-play-again.png": "Play again" }
    : { "cover-instructions.png": "说明", "cover-start.png": "开始", "instructions-start.png": "开始", "profile-submit.png": "确认提交", "view-ranking.png": "查看实时排名", "play-again.png": "再玩一次", "ranking-back.png": "返回", "ranking-play-again.png": "再玩一次" };
  $$(".image-button img").forEach((img) => {
    const file = img.getAttribute("src").split("/").pop();
    if (altLabels[file]) img.alt = altLabels[file];
  });
  if (canvas) canvas.setAttribute("aria-label", currentLanguage === "en" ? "Ghost Chase game canvas" : "鬼冥追光游戏画布");
}
const coverBgm = $("#cover-bgm");
const gameBgm = $("#game-bgm");

function syncBackgroundMusic(screenId) {
  const isCoverSection = ["screen-cover", "screen-instructions", "screen-profile"].includes(screenId);
  const isGameSection = ["screen-character", "screen-game", "screen-gameover", "screen-ranking"].includes(screenId);
  const activeTrack = musicMuted ? null : isCoverSection ? coverBgm : isGameSection ? gameBgm : null;
  for (const audio of [coverBgm, gameBgm]) {
    if (audio === activeTrack) {
      audio.volume = audio === gameBgm ? 0.25 : 0.55;
      if (audio.paused) void audio.play().catch(() => {});
    } else if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

function showScreen(id) {
  if (id !== "screen-ranking" && rankingRefreshTimer) {
    clearInterval(rankingRefreshTimer);
    rankingRefreshTimer = null;
  }
  screens.forEach((screen) => screen.classList.toggle("is-active", screen.id === id));
  syncBackgroundMusic(id);
}

function getStoredPlayer() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PLAYER)) || {};
  } catch (_) {
    return {};
  }
}

function savePlayer(player) {
  localStorage.setItem(STORAGE_PLAYER, JSON.stringify(player));
}

function getScores() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_SCORES));
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function saveScore(result) {
  const player = getStoredPlayer();
  if (!player.name || !player.email) return;

  const scores = getScores();
  const normalizedEmail = player.email.trim().toLowerCase();
  const existing = scores.find((entry) => entry.email === normalizedEmail);
  const record = {
    name: player.name.trim(),
    email: normalizedEmail,
    score: result.score,
    level: result.level,
    hazardHits: result.hazardHits,
    character: player.character,
    submittedAt: new Date().toISOString(),
  };

  if (!existing) {
    scores.push(record);
  } else if (result.score > existing.score) {
    Object.assign(existing, record);
  }

  localStorage.setItem(STORAGE_SCORES, JSON.stringify(scores));
}

function getPendingScores() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_PENDING_SCORES));
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function queueRemoteScore(result) {
  const player = getStoredPlayer();
  if (!player.name || !player.email || !player.character) return;

  const pending = getPendingScores();
  const email = player.email.trim().toLowerCase();
  const existingIndex = pending.findIndex((entry) => entry.player.email === email);
  const record = {
    player: {
      name: player.name.trim(),
      email,
      character: player.character,
    },
    result,
  };

  if (existingIndex === -1) {
    pending.push(record);
  } else if (result.score >= pending[existingIndex].result.score) {
    pending[existingIndex] = record;
  }

  localStorage.setItem(STORAGE_PENDING_SCORES, JSON.stringify(pending));
}

async function callScoreApi(functionName, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`排行榜服务返回 ${response.status}`);
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeout);
  }
}

async function submitRemoteScore(entry) {
  return callScoreApi("submit_ghost_score", {
    p_name: entry.player.name,
    p_email: entry.player.email,
    p_score: entry.result.score,
    p_level: entry.result.level,
    p_hazard_hits: entry.result.hazardHits,
    p_character: entry.player.character,
  });
}

async function flushPendingScores() {
  const pending = getPendingScores();
  if (!pending.length) return { submitted: 0, failed: 0, bestScore: null };

  const failed = [];
  let submitted = 0;
  let bestScore = null;
  for (const entry of pending) {
    try {
      const response = await submitRemoteScore(entry);
      const result = Array.isArray(response) ? response[0] : response;
      if (Number.isFinite(Number(result?.best_score))) {
        bestScore = Math.max(bestScore ?? 0, Number(result.best_score));
      }
      submitted += 1;
    } catch (_) {
      failed.push(entry);
    }
  }

  if (failed.length) {
    localStorage.setItem(STORAGE_PENDING_SCORES, JSON.stringify(failed));
  } else {
    localStorage.removeItem(STORAGE_PENDING_SCORES);
  }
  return { submitted, failed: failed.length, bestScore };
}

async function getRemoteScores() {
  const scores = await callScoreApi("get_ghost_leaderboard", { p_limit: 10 });
  return Array.isArray(scores) ? scores : [];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

class GhostGame {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.callbacks = callbacks;
    this.keys = { left: false, right: false };
    this.running = false;
    this.paused = false;
    this.soundEnabled = true;
    this.sounds = {
      pickup: new Audio("assets/itsa/sfx/item-pickup.wav"),
      thunder: new Audio("assets/itsa/sfx/thunder-loud.wav"),
      levelUp: new Audio("assets/itsa/sfx/level-up-loud.wav"),
      gameOver: new Audio("assets/itsa/sfx/game-over.wav"),
    };
    this.rafId = null;
    this.images = null;
    this.assetsPromise = this.loadAssets();
    this.loop = this.loop.bind(this);
  }

  async loadAssets() {
    const sources = {
      background: "assets/itsa/game.webp",
      backgroundEnglish: "assets/itsa/game-en.webp",
      timerHud: "assets/itsa/hud-timer.png",
      timerHudEnglish: "assets/itsa/hud-timer-en.png",
      scoreHud: "assets/itsa/hud-score.png",
      scoreHudEnglish: "assets/itsa/hud-score-en.png",
      characterA: "assets/itsa/character-a.png",
      characterB: "assets/itsa/character-b.png",
      characterAEnglish: "assets/itsa/character-a-en.png",
      characterBEnglish: "assets/itsa/character-b-en.png",
      itemA: "assets/itsa/item-a.png",
      itemB: "assets/itsa/item-b.png",
      hazard: "assets/itsa/item-hazard.png",
      itemAEnglish: "assets/itsa/item-a-en.png",
      itemBEnglish: "assets/itsa/item-b-en.png",
      hazardEnglish: "assets/itsa/item-hazard-en.png",
    };
    const entries = await Promise.all(
      Object.entries(sources).map(async ([key, src]) => [key, await loadImage(src)])
    );
    this.images = Object.fromEntries(entries);
  }

  async start(character = "a") {
    await this.assetsPromise;
    this.stop(false);
    this.character = character;
    this.level = 1;
    this.remaining = GAME_SECONDS;
    this.score = 0;
    this.hazardHits = 0;
    this.frozenUntil = 0;
    this.canvas.classList.remove("is-frozen");
    this.objects = [];
    this.spawnClock = 0;
    this.player = { x: 275, y: 735, width: 150, height: 205 };
    this.lastFrame = performance.now();
    this.running = true;
    this.paused = false;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(notify = false) {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    const wasRunning = this.running;
    this.running = false;
    this.paused = false;
    this.canvas.classList.remove("is-frozen");
    this.keys.left = false;
    this.keys.right = false;
    if (notify && wasRunning && this.callbacks.onGameOver) {
      this.playSfx("gameOver");
      this.callbacks.onGameOver({
        score: this.score,
        level: this.level,
        hazardHits: this.hazardHits,
      });
    }
  }

  loop(now) {
    if (!this.running || this.paused) return;
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    this.update(dt, now);
    this.draw(now);
    if (this.running && !this.paused) this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (!this.running || this.paused) return false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.paused = true;
    this.pauseStartedAt = performance.now();
    this.keys.left = false;
    this.keys.right = false;
    return true;
  }

  resume() {
    if (!this.running || !this.paused) return false;
    const now = performance.now();
    if (this.frozenUntil > this.pauseStartedAt) {
      this.frozenUntil += now - this.pauseStartedAt;
    }
    this.paused = false;
    this.lastFrame = now;
    this.rafId = requestAnimationFrame(this.loop);
    return true;
  }

  update(dt, now) {
    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.level += 1;
      this.remaining += GAME_SECONDS;
      this.playSfx("levelUp");
      if (this.callbacks.onLevelUp) this.callbacks.onLevelUp(this.level);
    }

    const frozen = now < this.frozenUntil;
    if (!frozen) {
      const direction = Number(this.keys.right) - Number(this.keys.left);
      this.player.x += direction * 390 * dt;
      this.player.x = Math.max(24, Math.min(this.canvas.width - this.player.width - 24, this.player.x));
    }

    const spawnInterval = Math.max(0.48, 1.28 - (this.level - 1) * 0.055);
    this.spawnClock += dt;
    while (this.spawnClock >= spawnInterval) {
      this.spawnClock -= spawnInterval;
      this.spawnObject();
    }

    for (const object of this.objects) {
      object.age += dt;
      object.x += (object.vx + Math.sin(object.age * object.waveSpeed + object.phase) * object.wave) * dt;
      object.y += object.vy * dt;
      object.rotation += object.spin * dt;
    }

    const playerBox = {
      x: this.player.x + 24,
      y: this.player.y + 30,
      width: this.player.width - 48,
      height: this.player.height - 35,
    };

    this.objects = this.objects.filter((object) => {
      if (object.y > this.canvas.height + 140 || object.x < -180 || object.x > this.canvas.width + 180) {
        return false;
      }

      if (!this.collides(playerBox, object)) return true;

      if (frozen) return false;
      if (object.type === "a") {
        this.score += 1;
        this.playSfx("pickup");
      } else if (object.type === "b") {
        this.score += 5;
        this.playSfx("pickup");
      } else {
        this.hazardHits += 1;
        this.playSfx("thunder");
        if (this.hazardHits >= 3) {
          this.stop(true);
          return false;
        }
        this.frozenUntil = now + 3000;
        this.keys.left = false;
        this.keys.right = false;
      }
      return false;
    });
  }

  spawnObject() {
    const roll = Math.random();
    const hazardChance = Math.min(0.3, 0.16 + (this.level - 1) * 0.007);
    const bonusChance = 0.26;
    const type = roll < hazardChance ? "hazard" : roll < hazardChance + bonusChance ? "b" : "a";
    const side = Math.floor(Math.random() * 3);
    const levelMultiplier = 1 + (this.level - 1) * 0.2;
    const speed = (92 + Math.random() * 38) * levelMultiplier;
    const size = type === "hazard" ? 92 : 82;
    let x;
    let y;
    let vx;
    let vy;

    if (side === 0) {
      x = 70 + Math.random() * (this.canvas.width - 140 - size);
      y = -size;
      vx = -42 + Math.random() * 84;
      vy = speed;
    } else if (side === 1) {
      x = -size;
      y = 150 + Math.random() * 360;
      vx = 72 + Math.random() * 58;
      vy = speed * (.68 + Math.random() * .2);
    } else {
      x = this.canvas.width + size;
      y = 150 + Math.random() * 360;
      vx = -(72 + Math.random() * 58);
      vy = speed * (.68 + Math.random() * .2);
    }

    this.objects.push({
      type,
      x,
      y,
      vx,
      vy,
      width: size,
      height: size * 1.15,
      age: 0,
      phase: Math.random() * Math.PI * 2,
      wave: 25 + Math.random() * 36,
      waveSpeed: 1.5 + Math.random() * 1.8,
      rotation: 0,
      spin: (-.7 + Math.random() * 1.4),
    });
  }

  collides(a, b) {
    const marginX = b.width * .2;
    const marginY = b.height * .18;
    return (
      a.x < b.x + b.width - marginX &&
      a.x + a.width > b.x + marginX &&
      a.y < b.y + b.height - marginY &&
      a.y + a.height > b.y + marginY
    );
  }

  draw(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const background = currentLanguage === "en" ? this.images.backgroundEnglish : this.images.background;
    ctx.drawImage(background, 0, 0, this.canvas.width, this.canvas.height);

    const hudWidth = 210;
    const hudHeight = 198;
    const timerHud = currentLanguage === "en" ? this.images.timerHudEnglish : this.images.timerHud;
    const scoreHud = currentLanguage === "en" ? this.images.scoreHudEnglish : this.images.scoreHud;
    ctx.drawImage(timerHud, 12, 8, hudWidth, hudHeight);
    ctx.drawImage(scoreHud, this.canvas.width - hudWidth - 12, 8, hudWidth, hudHeight);
    const hudNumberSize = 32;
    const hudNumberY = currentLanguage === "en" ? 126 : 145;
    this.drawHudText(String(Math.max(0, Math.ceil(this.remaining))), 132, hudNumberY, hudNumberSize);
    this.drawHudText(String(this.score), this.canvas.width - 117, hudNumberY, hudNumberSize);
    this.drawHudText(currentLanguage === "en" ? `LEVEL ${this.level}` : "第 " + this.level + " 关", 350, 43, currentLanguage === "en" ? 19 : 22, "#ffe09a", "#6f2b13");
    this.drawHudText("HP " + Math.max(0, 3 - this.hazardHits) + "/3", 350, 78, 24, "#fff0c4", "#6f2b13");

    for (const object of this.objects) {
      const image = object.type === "a"
        ? (currentLanguage === "en" ? this.images.itemAEnglish : this.images.itemA)
        : object.type === "b"
          ? (currentLanguage === "en" ? this.images.itemBEnglish : this.images.itemB)
          : (currentLanguage === "en" ? this.images.hazardEnglish : this.images.hazard);
      ctx.save();
      ctx.translate(object.x + object.width / 2, object.y + object.height / 2);
      ctx.rotate(object.rotation);
      ctx.drawImage(image, -object.width / 2, -object.height / 2, object.width, object.height);
      ctx.restore();
    }

    const frozen = now < this.frozenUntil;
    this.canvas.classList.toggle("is-frozen", frozen);
    ctx.save();
    const playerImage = this.character === "b"
      ? (currentLanguage === "en" ? this.images.characterBEnglish : this.images.characterB)
      : (currentLanguage === "en" ? this.images.characterAEnglish : this.images.characterA);
    ctx.drawImage(playerImage, this.player.x, this.player.y, this.player.width, this.player.height);
    ctx.restore();

    if (frozen) {
      const seconds = Math.max(1, Math.ceil((this.frozenUntil - now) / 1000));
      ctx.fillStyle = "rgba(5, 14, 34, .72)";
      ctx.fillRect(this.player.x - 5, this.player.y - 40, this.player.width + 10, 36);
      this.drawHudText(currentLanguage === "en" ? `FROZEN ${seconds}s` : "定身 " + seconds + " 秒", this.player.x + this.player.width / 2, this.player.y - 15, 21, "#fff1c6");
    }
  }

  drawHudText(text, x, y, size, color = "#7b1b10", strokeColor = "rgba(255, 244, 204, .9)") {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `900 ${size}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(1.5, size / 12);
    ctx.strokeStyle = strokeColor;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  setDirection(direction, pressed) {
    if (direction === "left") this.keys.left = pressed;
    if (direction === "right") this.keys.right = pressed;
  }

  playSfx(name) {
    if (!this.soundEnabled) return;
    const playback = this.sounds[name].cloneNode();
    playback.volume = name === "thunder" || name === "levelUp" ? 1 : 0.75;
    void playback.play().catch(() => {});
  }
}

const canvas = $("#game-canvas");
let levelMessageTimer;
const pauseOverlay = $("#pause-overlay");
const pauseToggle = $("#pause-toggle");

function setPauseUi(paused) {
  pauseOverlay.hidden = !paused;
  pauseToggle.textContent = paused ? "▶" : "P";
  pauseToggle.setAttribute("aria-label", paused ? t("resume") : t("pause"));
}

const game = new GhostGame(canvas, {
  onLevelUp(level) {
    clearTimeout(levelMessageTimer);
    canvas.setAttribute("aria-label", currentLanguage === "en" ? `Ghost Chase game canvas, level ${level}` : `鬼冥追光游戏画布 当前等级 ${level}`);
    levelMessageTimer = setTimeout(() => canvas.setAttribute("aria-label", currentLanguage === "en" ? "Ghost Chase game canvas" : "鬼冥追光游戏画布"), 1200);
  },
  onGameOver(result) {
    setPauseUi(false);
    saveScore(result);
    queueRemoteScore(result);
    $("#final-score").textContent = result.score;
    const status = $("#score-sync-status");
    scoreSyncState = { key: "uploading", bestScore: null };
    status.textContent = t("uploading");
    showScreen("screen-gameover");
    void flushPendingScores().then(({ failed, bestScore }) => {
      if (failed) {
        scoreSyncState = { key: "offline", bestScore: null };
        status.textContent = t("offline");
      } else if (bestScore !== null && bestScore > result.score) {
        scoreSyncState = { key: "syncedBest", bestScore };
        status.textContent = t("syncedBest", bestScore);
      } else {
        scoreSyncState = { key: "submitted", bestScore: null };
        status.textContent = t("submitted");
      }
    });
  },
});

function beginGame() {
  const player = getStoredPlayer();
  if (!player.character) {
    showScreen("screen-character");
    return;
  }
  setPauseUi(false);
  showScreen("screen-game");
  game.start(player.character);
}

function renderRankingRows(scores) {
  const currentName = (getStoredPlayer().name || "").trim();
  const list = $("#ranking-list");
  list.replaceChildren();

  for (let index = 0; index < 10; index += 1) {
    const entry = scores[index];
    const row = document.createElement("li");
    if (entry && entry.name === currentName) row.classList.add("is-current");
    const name = document.createElement("span");
    name.className = "rank-name";
    name.textContent = entry ? entry.name : "—";
    const score = document.createElement("span");
    score.className = "rank-score";
    score.textContent = entry ? `${entry.score} ${t("finalPoints")}` : "";
    row.append(name, score);
    list.append(row);
  }
}

async function renderRanking() {
  const requestNumber = ++rankingRequestNumber;
  const note = $("#ranking-note");
  note.textContent = t("sync");

  try {
    await flushPendingScores();
    const scores = await getRemoteScores();
    if (requestNumber !== rankingRequestNumber) return;
    renderRankingRows(scores);
    note.textContent = t("shared");
  } catch (_) {
    if (requestNumber !== rankingRequestNumber) return;
    const localScores = getScores().sort(
      (a, b) => b.score - a.score || a.submittedAt.localeCompare(b.submittedAt)
    );
    renderRankingRows(localScores);
    note.textContent = t("failed");
  }
}

$("#open-instructions").addEventListener("click", () => showScreen("screen-instructions"));
$("#open-profile").addEventListener("click", () => showScreen("screen-profile"));
$("#instructions-start").addEventListener("click", () => showScreen("screen-profile"));
$$('[data-go]').forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.go)));

const storedPlayer = getStoredPlayer();
$("#player-name").value = storedPlayer.name || "";
$("#player-email").value = storedPlayer.email || "";

$("#player-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("#player-name").value.trim();
  const email = $("#player-email").value.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const error = $("#form-error");

  if (!name) {
    error.textContent = t("emptyName");
    $("#player-name").focus();
    return;
  }
  if (!emailLooksValid) {
    error.textContent = t("invalidEmail");
    $("#player-email").focus();
    return;
  }

  error.textContent = "";
  savePlayer({ ...getStoredPlayer(), name, email });
  showScreen("screen-character");
});

$$('[data-character]').forEach((button) => {
  button.addEventListener("click", () => {
    savePlayer({ ...getStoredPlayer(), character: button.dataset.character });
    beginGame();
  });
});

function bindMoveButton(id, direction) {
  const button = $(id);
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    game.setDirection(direction, true);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    button.addEventListener(eventName, (event) => {
      event.preventDefault();
      game.setDirection(direction, false);
    });
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

bindMoveButton("#move-left", "left");
bindMoveButton("#move-right", "right");

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target.isContentEditable) return;
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "a", "d"].includes(key)) event.preventDefault();
  if (key === "arrowleft" || key === "a") game.setDirection("left", true);
  if (key === "arrowright" || key === "d") game.setDirection("right", true);
});

window.addEventListener("keyup", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target.isContentEditable) return;
  const key = event.key.toLowerCase();
  if (key === "arrowleft" || key === "a") game.setDirection("left", false);
  if (key === "arrowright" || key === "d") game.setDirection("right", false);
});

window.addEventListener("blur", () => {
  game.setDirection("left", false);
  game.setDirection("right", false);
});

$("#sound-toggle").addEventListener("click", (event) => {
  musicMuted = !musicMuted;
  game.soundEnabled = !musicMuted;
  event.currentTarget.textContent = musicMuted ? "×" : "♪";
  event.currentTarget.setAttribute("aria-label", musicMuted
    ? (currentLanguage === "en" ? "Turn on music and sound effects" : "开启背景音乐和音效")
    : t("sound"));
  const activeScreen = screens.find((screen) => screen.classList.contains("is-active"));
  if (activeScreen) syncBackgroundMusic(activeScreen.id);
});

pauseToggle.addEventListener("click", () => {
  if (game.paused) {
    game.resume();
    setPauseUi(false);
  } else if (game.pause()) {
    setPauseUi(true);
  }
});

$("#resume-game").addEventListener("click", () => {
  if (game.resume()) setPauseUi(false);
});

let rankingReturnScreen = "screen-gameover";
function openRanking(returnScreen) {
  rankingReturnScreen = returnScreen;
  $("#ranking-back").setAttribute("aria-label", currentLanguage === "en"
    ? (returnScreen === "screen-cover" ? "Back to cover" : "Back to game over")
    : (returnScreen === "screen-cover" ? "返回封面" : "返回游戏结束页面"));
  showScreen("screen-ranking");
  void renderRanking();
  if (rankingRefreshTimer) clearInterval(rankingRefreshTimer);
  rankingRefreshTimer = setInterval(() => void renderRanking(), RANKING_REFRESH_MS);
}

$("#view-ranking").addEventListener("click", () => openRanking("screen-gameover"));

$("#ranking-back").addEventListener("click", () => showScreen(rankingReturnScreen));
$$('.play-again').forEach((button) => button.addEventListener("click", beginGame));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.setDirection("left", false);
    game.setDirection("right", false);
    if (game.pause()) setPauseUi(true);
  }
});

document.addEventListener("pointerdown", () => {
  const activeScreen = screens.find((screen) => screen.classList.contains("is-active"));
  if (activeScreen) syncBackgroundMusic(activeScreen.id);
});

$("#language-toggle").addEventListener("click", () => {
  currentLanguage = currentLanguage === "zh" ? "en" : "zh";
  localStorage.setItem(STORAGE_LANGUAGE, currentLanguage);
  applyLanguage();
  if ($("#screen-ranking").classList.contains("is-active")) void renderRanking();
});

applyLanguage();
syncBackgroundMusic("screen-cover");

void flushPendingScores();
