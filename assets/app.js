const apps = {
  "EB GoRider": "Rider navigation and delivery workflow platform within the EB ecosystem.",
  "EB Map Explorer": "Map exploration and location tools for the EB platform.",
  "Delivery Line Up": "A companion workflow for coordinating delivery line-ups.",
  "EB POS": "Point-of-sale tools for day-to-day business operations."
};

const search = document.getElementById("searchInput");
const cards = [...document.querySelectorAll(".app-card")];
const filters = [...document.querySelectorAll(".filter")];
const empty = document.getElementById("emptyState");
let activeFilter = "all";

function applyFilters() {
  const q = (search.value || "").toLowerCase().trim();
  let shown = 0;
  cards.forEach(card => {
    const matchesText = card.dataset.name.toLowerCase().includes(q);
    const matchesCategory = activeFilter === "all" || card.dataset.category === activeFilter;
    card.hidden = !(matchesText && matchesCategory);
    if (!card.hidden) shown++;
  });
  empty.hidden = shown !== 0;
}
search.addEventListener("input", applyFilters);
filters.forEach(button => button.addEventListener("click", () => {
  filters.forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  activeFilter = button.dataset.filter;
  applyFilters();
}));

const dialog = document.getElementById("appDialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogDescription = document.getElementById("dialogDescription");
const dialogStatus = document.getElementById("dialogStatus");
const dialogDownload = document.getElementById("dialogDownload");
const dialogSmall = document.getElementById("dialogSmall");

function setDownloadLink(el, url, label) {
  if (!el) return;
  if (url) {
    el.href = url;
    el.removeAttribute("aria-disabled");
    el.classList.remove("button-disabled");
    el.classList.add("button-light");
    if (label) el.textContent = label;
  } else {
    el.href = "#";
    el.setAttribute("aria-disabled", "true");
    el.classList.add("button-disabled");
    el.classList.remove("button-light");
  }
}

document.querySelectorAll(".details-btn").forEach(button => button.addEventListener("click", () => {
  const name = button.dataset.app;
  dialogTitle.textContent = name;
  dialogDescription.textContent = apps[name] || "EB application.";
  if (name === "EB GoRider" && window.goriderRelease) {
    const r = window.goriderRelease;
    dialogStatus.textContent = "RELEASE AVAILABLE — " + r.version;
    dialogSmall.textContent = r.sizeText + " · released " + r.dateText + " · SHA-256 " + r.sha256;
    setDownloadLink(dialogDownload, r.downloadUrl, "Download APK");
  } else {
    dialogStatus.textContent = "NO RELEASE PUBLISHED YET";
    dialogSmall.textContent = "Official APK downloads will be enabled after a verified release is published.";
    setDownloadLink(dialogDownload, null, "Download unavailable");
  }
  dialog.showModal();
}));
document.getElementById("dialogClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});
document.getElementById("year").textContent = new Date().getFullYear();

// ---- GitHub Releases integration (public, no token) ----
const GITHUB_REPO = "elmerjhemer25-spec/EB-APP-RELEASES";
const GORIDER_TAG = "eb-gorider-v1.0.5";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(2) + " MB";
}

function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toISOString().slice(0, 10); }
  catch (e) { return iso.slice(0, 10); }
}

async function loadGoriderRelease() {
  const summary = document.getElementById("gorider-summary");
  const download = document.getElementById("gorider-download");
  const relVersion = document.getElementById("rel-version");
  const relBuild = document.getElementById("rel-build");
  const relDate = document.getElementById("rel-date");
  const relSize = document.getElementById("rel-size");
  const relSha = document.getElementById("rel-sha");
  const relDownload = document.getElementById("rel-download");
  const relPage = document.getElementById("rel-page");
  const relChangelog = document.getElementById("rel-changelog");
  const relStatus = document.getElementById("rel-status");

  try {
    const res = await fetch("https://api.github.com/repos/" + GITHUB_REPO + "/releases/tags/" + GORIDER_TAG, {
      headers: { "Accept": "application/vnd.github+json" }
    });
    if (!res.ok) throw new Error("GitHub API responded " + res.status);
    const data = await res.json();
    const asset = (data.assets || []).find(a => /\.apk$/i.test(a.name)) || (data.assets || [])[0];
    if (!asset || !asset.browser_download_url) throw new Error("No APK asset found in release");

    const version = ((data.name || data.tag_name || "").replace(/^EB GoRider\s*/i, "").replace(/^v/i, "").trim()) || "1.0.5";
    const build = "6";
    const dateText = formatDate(data.published_at || data.created_at);
    const sizeText = formatBytes(asset.size);
    const sha256 = (asset.digest || "").replace(/^sha256:/i, "") || "—";

    window.goriderRelease = {
      version: version,
      build: build,
      dateText: dateText,
      sizeText: sizeText,
      sha256: sha256,
      downloadUrl: asset.browser_download_url,
      releaseUrl: data.html_url
    };

    if (summary) summary.textContent = version + " · " + sizeText + " · " + dateText;
    if (relVersion) relVersion.textContent = version;
    if (relBuild) relBuild.textContent = build;
    if (relDate) relDate.textContent = dateText;
    if (relSize) relSize.textContent = sizeText + " (" + asset.size + " bytes)";
    if (relSha) relSha.textContent = sha256;
    setDownloadLink(download, asset.browser_download_url, "Download APK");
    setDownloadLink(relDownload, asset.browser_download_url, "Download APK");
    if (relPage) {
      relPage.href = data.html_url;
      relPage.removeAttribute("aria-disabled");
    }
    if (relChangelog) {
      const items = [
        "Rider group chat enhancements, including image sharing and unsend support.",
        "GPS navigation engine and live address search improvements.",
        "Customer location sharing and admin pin management updates.",
        "Push notification support (Firebase Cloud Messaging) for new deliveries.",
        "Supabase schema migrations for chat, delivery photos, and push dispatch.",
        "General stability and build improvements."
      ];
      relChangelog.innerHTML = items.map(t => "<li>" + t + "</li>").join("");
    }
    if (relStatus) relStatus.textContent = "Verified release loaded from GitHub.";
  } catch (err) {
    if (summary) summary.textContent = "Release unavailable";
    if (relStatus) relStatus.textContent = "Could not load release: " + (err && err.message ? err.message : err);
  }
}

loadGoriderRelease();

// ---- EB RIDE MOMENTS slideshow ----
const slides = [...document.querySelectorAll(".slide")];
const slidePrev = document.getElementById("slidePrev");
const slideNext = document.getElementById("slideNext");
const slideDots = document.getElementById("slideDots");
let slideIndex = 0;
let slideTimer = null;

function renderDots() {
  if (!slideDots) return;
  slideDots.innerHTML = "";
  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slide-dot" + (i === slideIndex ? " active" : "");
    dot.setAttribute("aria-label", "Go to slide " + (i + 1));
    dot.addEventListener("click", () => goToSlide(i));
    slideDots.appendChild(dot);
  });
}

function goToSlide(i) {
  if (!slides.length) return;
  slideIndex = (i + slides.length) % slides.length;
  slides.forEach((s, idx) => s.classList.toggle("active", idx === slideIndex));
  if (slideDots) slideDots.querySelectorAll(".slide-dot").forEach((d, idx) => d.classList.toggle("active", idx === slideIndex));
  stopTimer();
}

function startTimer() {
  stopTimer();
  if (!slides.length) return;
  slideTimer = setInterval(() => goToSlide(slideIndex + 1), 6000);
}
function stopTimer() { if (slideTimer) { clearInterval(slideTimer); slideTimer = null; } }

if (slides.length) {
  renderDots();
  startTimer();
  slidePrev && slidePrev.addEventListener("click", () => goToSlide(slideIndex - 1));
  slideNext && slideNext.addEventListener("click", () => goToSlide(slideIndex + 1));
  if (slideDots) slideDots.addEventListener("click", event => {
    const dot = event.target.closest(".slide-dot");
    if (dot) goToSlide(Number(String(dot.getAttribute("aria-label")).replace(/\D/g, "")) - 1);
  });
}

window.addEventListener("focus", startTimer);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") startTimer(); });
