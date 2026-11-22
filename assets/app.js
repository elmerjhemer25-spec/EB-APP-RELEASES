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
document.querySelectorAll(".details-btn").forEach(button => button.addEventListener("click", () => {
  const name = button.dataset.app;
  document.getElementById("dialogTitle").textContent = name;
  document.getElementById("dialogDescription").textContent = apps[name] || "EB application.";
  dialog.showModal();
}));
document.getElementById("dialogClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});
document.getElementById("year").textContent = new Date().getFullYear();