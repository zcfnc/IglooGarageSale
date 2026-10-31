const SUPABASE_URL = "https://hemvwmjfkbhqxhvcruvv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ihYv1vFt4UBWdIKZtZKrAw_h4cCujsL";
const STORAGE_LANGUAGE = "itsa-ghost-language";
const REFRESH_MS = 30000;

const copy = {
  zh: {
    back: "返回游戏", backAria: "返回游戏首页", gameTitle: "鬼冥追光", pageTitle: "活动数据",
    subtitle: "公开展示活动参与情况，玩家邮箱及个人联系方式不会出现在本页面。",
    live: "实时数据 · 每 30 秒更新", players: "参与玩家", playersIcon: "人", peopleUnit: " 人", playersNote: "提交过成绩的独立玩家",
    plays: "总游玩次数", playsIcon: "局", playsUnit: " 局", trackedNote: "统计功能上线后记录", totalTime: "累计游玩时长", timeIcon: "时", averageIcon: "均",
    timeNote: "已排除暂停时间", averageTime: "平均每局时长", averageNote: "只计算正常完成场次",
    trend: "最近游玩趋势", sevenDays: "7 天", completion: "游戏完成情况", completionRate: "完成率",
    completed: "正常完成", unfinished: "未完成", audience: "玩家使用情况", device: "设备", language: "语言",
    playerData: "玩家参与数据", emailHidden: "邮箱已隐藏", player: "玩家", playCount: "游玩次数",
    cumulativeTime: "累计时长", highestScore: "最高分", loading: "正在读取统计数据…", updated: "数据更新时间：",
    desktop: "电脑端", mobile: "手机端", english: "英文", chinese: "中文", today: "今天", loadError: "暂时无法读取统计数据，请稍后刷新。"
  },
  en: {
    back: "Back to game", backAria: "Back to game home", gameTitle: "Ghost Chase", pageTitle: "Event Statistics",
    subtitle: "Public event participation data. Player emails and contact details are never displayed on this page.",
    live: "Live data · refreshes every 30 seconds", players: "Players", playersIcon: "P", peopleUnit: "", playersNote: "Unique players who submitted a score",
    plays: "Total plays", playsIcon: "×", playsUnit: "", trackedNote: "Recorded since analytics launched", totalTime: "Total play time", timeIcon: "T", averageIcon: "AVG",
    timeNote: "Paused time is excluded", averageTime: "Average play time", averageNote: "Completed games only",
    trend: "Recent activity", sevenDays: "7 days", completion: "Game completion", completionRate: "completion",
    completed: "Completed", unfinished: "Unfinished", audience: "Player usage", device: "Device", language: "Language",
    playerData: "Player participation", emailHidden: "Emails hidden", player: "Player", playCount: "Plays",
    cumulativeTime: "Total time", highestScore: "High score", loading: "Loading statistics…", updated: "Last updated: ",
    desktop: "Desktop", mobile: "Mobile", english: "English", chinese: "Chinese", today: "Today", loadError: "Statistics are temporarily unavailable. Please refresh later."
  }
};

let language = localStorage.getItem(STORAGE_LANGUAGE) === "en" ? "en" : "zh";
let stats = null;
const $ = (selector) => document.querySelector(selector);

function text(key) { return copy[language][key]; }

function formatDuration(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (language === "zh") return hours ? `${hours} 小时 ${minutes} 分` : `${minutes} 分 ${String(secs).padStart(2, "0")} 秒`;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${String(secs).padStart(2, "0")}s`;
}

function applyLanguage() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = language === "zh" ? "鬼冥追光 · 活动数据" : "Ghost Chase · Event Statistics";
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = text(element.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => { element.setAttribute("aria-label", text(element.dataset.i18nAria)); });
  const toggle = $("#language-toggle");
  toggle.textContent = language === "zh" ? "EN" : "中文";
  toggle.setAttribute("aria-label", language === "zh" ? "Switch to English" : "切换到中文");
  if (stats) render(stats);
}

function renderTrend(items) {
  const chart = $("#trend-chart");
  chart.querySelectorAll(".bar").forEach((bar) => bar.remove());
  const maximum = Math.max(1, ...items.map((item) => Number(item.plays) || 0));
  items.forEach((item, index) => {
    const bar = document.createElement("div");
    bar.className = `bar${index === items.length - 1 ? " today" : ""}`;
    bar.style.setProperty("--value", `${Math.max(5, ((Number(item.plays) || 0) / maximum) * 100)}%`);
    const label = document.createElement("span");
    const date = new Date(`${item.date}T00:00:00`);
    label.textContent = index === items.length - 1 ? text("today") : new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-AU", { day: "2-digit", month: "2-digit" }).format(date);
    const count = document.createElement("b");
    count.textContent = item.plays;
    bar.append(label, count);
    chart.append(bar);
  });
}

function renderPlayers(players) {
  const body = $("#player-rows");
  body.replaceChildren();
  if (!players.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.className = "loading";
    cell.textContent = language === "zh" ? "暂无已记录的玩家数据" : "No tracked player data yet";
    return;
  }
  players.forEach((player, index) => {
    const row = body.insertRow();
    const playerCell = row.insertCell();
    const rank = document.createElement("b");
    rank.className = `rank ${["gold", "silver", "bronze"][index] || ""}`.trim();
    rank.textContent = index + 1;
    const name = document.createElement("span");
    name.textContent = player.name;
    playerCell.append(rank, name);
    row.insertCell().textContent = `${player.play_count}${language === "zh" ? " 局" : ""}`;
    row.insertCell().textContent = formatDuration(player.total_active_seconds);
    const score = document.createElement("strong");
    score.textContent = Number(player.highest_score).toLocaleString(language === "zh" ? "zh-CN" : "en-AU");
    row.insertCell().append(score);
  });
}

function render(data) {
  const summary = data.summary || {};
  $("#player-count").textContent = Number(summary.player_count || 0).toLocaleString();
  $("#total-plays").textContent = Number(summary.total_plays || 0).toLocaleString();
  $("#total-time").textContent = formatDuration(summary.total_active_seconds);
  $("#average-time").textContent = formatDuration(summary.average_active_seconds);
  const completed = Number(summary.completed_plays || 0);
  const unfinished = Number(summary.unfinished_plays || 0);
  const completion = completed + unfinished ? (completed / (completed + unfinished)) * 100 : 0;
  $("#completion-rate").textContent = `${completion.toFixed(1)}%`;
  $("#completion-donut").style.setProperty("--completion", `${completion}%`);
  $("#completed-plays").textContent = `${completed}${language === "zh" ? " 局" : ""}`;
  $("#unfinished-plays").textContent = `${unfinished}${language === "zh" ? " 局" : ""}`;

  const devices = data.devices || {};
  const desktop = Number(devices.desktop || 0), mobile = Number(devices.mobile || 0), deviceTotal = desktop + mobile;
  const desktopRate = deviceTotal ? Math.round((desktop / deviceTotal) * 100) : 0;
  $("#device-main").textContent = `${text("desktop")} ${desktopRate}%`;
  $("#device-progress").style.width = `${desktopRate}%`;
  $("#desktop-label").textContent = `${text("desktop")} · ${desktop}`;
  $("#mobile-label").textContent = `${text("mobile")} · ${mobile}`;

  const languages = data.languages || {};
  const english = Number(languages.en || 0), chinese = Number(languages.zh || 0), languageTotal = english + chinese;
  const englishRate = languageTotal ? Math.round((english / languageTotal) * 100) : 0;
  $("#language-main").textContent = `${text("english")} ${englishRate}%`;
  $("#language-progress").style.width = `${englishRate}%`;
  $("#english-label").textContent = `${text("english")} · ${english}`;
  $("#chinese-label").textContent = `${text("chinese")} · ${chinese}`;

  renderTrend(data.trend || []);
  renderPlayers(data.players || []);
  $("#updated-at").textContent = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Darwin" }).format(new Date(data.updated_at));
}

async function loadStats() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_ghost_public_stats`, {
      method: "POST",
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Stats request failed: ${response.status}`);
    stats = await response.json();
    render(stats);
  } catch (error) {
    console.error(error);
    const body = $("#player-rows");
    body.innerHTML = "";
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.className = "loading";
    cell.textContent = text("loadError");
  }
}

$("#language-toggle").addEventListener("click", () => {
  language = language === "zh" ? "en" : "zh";
  localStorage.setItem(STORAGE_LANGUAGE, language);
  applyLanguage();
});

applyLanguage();
loadStats();
setInterval(loadStats, REFRESH_MS);
