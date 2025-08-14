// dashboard.js
const SESSION_HISTORY_KEY = "sessionHistory";
const CATEGORY_MAP = {
  "Réseaux sociaux": [
    "facebook.com", "twitter.com", "instagram.com", "linkedin.com", "snapchat.com",
    "tiktok.com", "pinterest.com", "reddit.com", "clubhouse.com", "tumblr.com"
  ],
  "Vidéos / Streaming": [
    "youtube.com", "vimeo.com", "twitch.tv", "netflix.com", "hulu.com",
    "dailymotion.com", "twitch.tv", "primevideo.com", "disneyplus.com", "crunchyroll.com"
  ],
  "Actualités / Médias": [
    "lemonde.fr", "bbc.com", "cnn.com", "nytimes.com", "theguardian.com",
    "foxnews.com", "washingtonpost.com", "buzzfeed.com", "msnbc.com", "aljazeera.com"
  ],
  "Jeux en ligne": [
    "miniclip.com", "kongregate.com", "pogo.com", "armorgames.com", "addictinggames.com",
    "steamcommunity.com", "epicgames.com", "roblox.com", "fortnite.com", "minecraft.net"
  ],
  "Shopping / E-commerce": [
    "amazon.com", "ebay.com", "etsy.com", "aliexpress.com", "walmart.com",
    "bestbuy.com", "wish.com", "target.com", "alibaba.com", "rakuten.com"
  ],
  "Forums / Communautés": [
    "reddit.com", "quora.com", "stackexchange.com", "stackoverflow.com", "discourse.org",
    "vbulletin.com", "phpbb.com", "4chan.org", "craigslist.org", "tumblr.com"
  ],
  "Emails / Messagerie": [
    "gmail.com", "outlook.com", "yahoo.com", "protonmail.com", "zoho.com",
    "hotmail.com", "icloud.com", "mailchimp.com", "slack.com", "discord.com"
  ],
  "Travail / Productivité": [
    "docs.google.com", "drive.google.com", "office.com", "notion.so", "trello.com",
    "asana.com", "jira.com", "microsoftteams.com", "zoom.us", "slack.com"
  ],
  "Finance / Banque": [
    "paypal.com", "chase.com", "wellsfargo.com", "bankofamerica.com", "mint.com",
    "coinbase.com", "robinhood.com", "etrade.com", "vanguard.com", "schwab.com"
  ],
  "Divertissement": [
    "spotify.com", "soundcloud.com", "pandora.com", "netflix.com", "hulu.com",
    "imdb.com", "rottentomatoes.com", "metacritic.com", "fandom.com", "ign.com"
  ],
  "Éducation / Apprentissage": [
    "khanacademy.org", "coursera.org", "edx.org", "udemy.com", "quizlet.com",
    "wikipedia.org", "academicearth.org", "brainly.com", "duolingo.com", "memrise.com"
  ],
  "Santé / Bien-être": [
    "webmd.com", "mayoclinic.org", "healthline.com", "psychologytoday.com", "headspace.com",
    "calm.com", "myfitnesspal.com", "fitbit.com", "nike.com", "strava.com"
  ],
  "Autres": []
};

function categorizeSites(usageData) {
  const categories = {};
  for (const [site, data] of Object.entries(usageData)) {
    let catFound = false;
    for (const [cat, sites] of Object.entries(CATEGORY_MAP)) {
      if (sites.includes(site)) {
        categories[cat] = (categories[cat] || 0) + data.timeSpent;
        catFound = true;
        break;
      }
    }
    if (!catFound) {
      categories["Autres"] = (categories["Autres"] || 0) + data.timeSpent;
    }
  }
  return categories;
}

const usageTableBody = document.querySelector("#usageTable tbody");
const blockedSitesList = document.getElementById("blockedSitesList");
const sessionHistoryList = document.getElementById("sessionHistoryList");
const timeChartCtx = document.getElementById("timeChart").getContext("2d");

let usageData = {};
let blockedSites = [];

function loadSessionHistory(filter = "all") {
  chrome.storage.local.get(SESSION_HISTORY_KEY, data => {
    const history = data[SESSION_HISTORY_KEY] || [];
    const now = Date.now();

    let filtered = history.filter(session => {
      if (!session.endTime) return false;
      const start = session.startTime;
      if (filter === "day") {
        const today = new Date();
        return new Date(start).toDateString() === today.toDateString();
      } else if (filter === "week") {
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        return start >= oneWeekAgo;
      } else if (filter === "month") {
        const nowDate = new Date(now);
        return new Date(start).getMonth() === nowDate.getMonth() &&
               new Date(start).getFullYear() === nowDate.getFullYear();
      }
      return true;
    });

    sessionHistoryList.innerHTML = "";
    if (filtered.length === 0) {
      sessionHistoryList.innerHTML = "<li>Aucune session trouvée.</li>";
      return;
    }

    // Calculer durée totale
    const totalDuration = filtered.reduce((acc, session) => {
      return acc + (session.endTime - session.startTime);
    }, 0);

    const totalDurationMin = (totalDuration / 60000).toFixed(2);
    const totalSummary = document.createElement("p");
    totalSummary.textContent = `Temps total de concentration: ${totalDurationMin} minutes`;
    sessionHistoryList.appendChild(totalSummary);

    filtered.forEach(session => {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      const duration = ((session.endTime - session.startTime) / 60000).toFixed(2);
      const li = document.createElement("li");
      li.textContent = `Début: ${start.toLocaleString()} - Fin: ${end.toLocaleString()} - Durée: ${duration} min - Profil: ${session.profile}`;
      sessionHistoryList.appendChild(li);
    });
  });
}

function initFilters() {
  const filterSelect = document.createElement("select");
  filterSelect.innerHTML = `
    <option value="all">Toutes les sessions</option>
    <option value="day">Aujourd’hui</option>
    <option value="week">Cette semaine</option>
    <option value="month">Ce mois-ci</option>
  `;
  const historySection = document.getElementById("sessionHistoryList").closest(".section");
  historySection.prepend(filterSelect);
  filterSelect.addEventListener("change", () => loadSessionHistory(filterSelect.value));
}


// Charger données au démarrage
function loadData() {
  chrome.runtime.sendMessage({ type: "getUsageData" }, usage => {
    usageData = usage || {};
    renderUsageTable();
    renderTimeChart();
    renderCategoryChart(); // Assure que ce graphique est bien déclenché
  });
  
  chrome.runtime.sendMessage({ type: "getBlockedSites" }, sites => {
    blockedSites = sites || [];
    renderBlockedSites();
  });
}

function renderUsageTable() {
  usageTableBody.innerHTML = "";
  let entries = Object.entries(usageData).map(([site, data]) => {
    return {
      site,
      time: (data.timeSpent / 60).toFixed(2), // convertir en minutes
      visits: data.visits
    };
  });

  // Trier par temps décroissant par défaut
  entries.sort((a, b) => b.time - a.time);

  entries.forEach(({ site, time, visits }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${site}</td>
      <td>${time}</td>
      <td>${visits}</td>
    `;
    usageTableBody.appendChild(tr);
  });
}

function renderBlockedSites() {
  blockedSitesList.innerHTML = "";
  if (blockedSites.length === 0) {
    blockedSitesList.innerHTML = "<li>Aucun site bloqué.</li>";
    return;
  }
  blockedSites.forEach(site => {
    const li = document.createElement("li");
    li.textContent = site;
    blockedSitesList.appendChild(li);
  });
}

let timeChart = null;
function renderTimeChart() {
  const labels = [];
  const data = [];
  for (const [site, info] of Object.entries(usageData)) {
    labels.push(site);
    data.push((info.timeSpent / 60).toFixed(2));
  }

  if (timeChart) timeChart.destroy();

  timeChart = new Chart(timeChartCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Temps passé (minutes)',
        data,
        backgroundColor: 'rgba(75, 192, 192, 0.7)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}


let categoryChart = null;

function renderCategoryChart() {
  const categories = categorizeSites(usageData);
  const labels = Object.keys(categories);
  const data = labels.map(cat => (categories[cat] / 60).toFixed(2));

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(categoryChartCanvas.getContext("2d"), {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          "#4e79a7",
          "#f28e2c",
          "#e15759",
          "#76b7b2",
          "#59a14f"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

// Pour le tri simple de la table
document.querySelectorAll("#usageTable th").forEach(th => {
  th.addEventListener("click", () => {
    const sortType = th.dataset.sort;
    let entries = Object.entries(usageData).map(([site, data]) => ({
      site,
      time: data.timeSpent / 60,
      visits: data.visits
    }));

    if (sortType === "site") {
      entries.sort((a, b) => a.site.localeCompare(b.site));
    } else if (sortType === "time") {
      entries.sort((a, b) => b.time - a.time);
    } else if (sortType === "visits") {
      entries.sort((a, b) => b.visits - a.visits);
    }

    usageTableBody.innerHTML = "";
    entries.forEach(({ site, time, visits }) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${site}</td>
        <td>${time.toFixed(2)}</td>
        <td>${visits}</td>
      `;
      usageTableBody.appendChild(tr);
    });
  });
});

document.addEventListener("DOMContentLoaded", loadData);

const filterSelect = document.createElement("select");

filterSelect.innerHTML = `
  <option value="all">Toutes les sessions</option>
  <option value="day">Aujourd’hui</option>
  <option value="week">Cette semaine</option>
  <option value="month">Ce mois-ci</option>
`;
document.querySelector(".section:nth-child(3)").prepend(filterSelect);

filterSelect.onchange = () => loadSessionHistory(filterSelect.value);

function loadSessionHistory(filter = "all") {
  chrome.storage.local.get(SESSION_HISTORY_KEY, data => {
    const history = data[SESSION_HISTORY_KEY] || [];
    const now = Date.now();

    let filtered = history.filter(session => {
      if (!session.endTime) return false; // session pas terminée ignore
      const start = session.startTime;
      if (filter === "day") {
        const today = new Date();
        return new Date(start).toDateString() === today.toDateString();
      } else if (filter === "week") {
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        return start >= oneWeekAgo;
      } else if (filter === "month") {
        const nowDate = new Date(now);
        return new Date(start).getMonth() === nowDate.getMonth() &&
               new Date(start).getFullYear() === nowDate.getFullYear();
      }
      return true;
    });

    sessionHistoryList.innerHTML = "";
    if (filtered.length === 0) {
      sessionHistoryList.innerHTML = "<li>Aucune session trouvée.</li>";
      return;
    }

    filtered.forEach(session => {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      const duration = ((session.endTime - session.startTime) / 60000).toFixed(2);
      const li = document.createElement("li");
      li.textContent = `Début: ${start.toLocaleString()} - Fin: ${end.toLocaleString()} - Durée: ${duration} min - Profil: ${session.profile}`;
      sessionHistoryList.appendChild(li);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const categoryChartCanvas = document.createElement("canvas");
  categoryChartCanvas.id = "categoryChart";
  document.querySelector(".section:last-child").appendChild(categoryChartCanvas);

  initFilters();
  loadData();
  loadSessionHistory();
});


