export default async function decorate(block) {
  const rows = [...block.children];

  // First row = header
  const headerRow = rows.shift();

  // ================= HEADER =================
  const icon = headerRow.querySelector("picture")?.outerHTML || "";
  const title = headerRow.querySelector("h2")?.textContent || "";
  const subtitle = headerRow.querySelectorAll("p")[1]?.textContent || "";
  const riskLabel = headerRow.querySelectorAll("p")[2]?.textContent || "";

  block.textContent = "";

  const header = document.createElement("div");
  header.className = "accessibility-header";

  header.innerHTML = `
    <div class="header-left">
      <div class="icon-wrapper">${icon}</div>
      <div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
    </div>
    <div class="risk-wrapper">
      <div class="risk-score">72</div>
      <div class="risk-label">${riskLabel}</div>
    </div>
  `;

  block.append(header);

  // ================= GRID =================
  const grid = document.createElement("div");
  grid.className = "accessibility-grid";

  rows.forEach((row) => {
    const list = row.querySelector("ul");

    // 🔥 If row contains UL → WCAG Severity Card
    if (list) {
      const title = row.querySelector("p")?.textContent || "";
      const items = [...list.querySelectorAll("li")].map((li) => {
        const item = li.textContent;

        return item;
      });

      const wcagCard = document.createElement("div");
      wcagCard.className = "metric-card list-card";

      wcagCard.innerHTML = `
        <h3>${title}</h3>
        <ul>
          ${items
            .map(
              (item) => `
              <li class="${item}">
                <span class="severity-value">${item}</span>
                <span class="severity-label">5</span>
              </li>
            `,
            )
            .join("")}
        </ul>
      `;

      grid.append(wcagCard);
    }

    // 🔥 Otherwise → Normal Metric Card
    else {
      const text = row.textContent.trim();

      if (!text) return;

      const card = document.createElement("div");
      card.className = "metric-card";

      card.innerHTML = `
        <div class="metric-value"></div>
        <div class="metric-label">${text}</div>
      `;

      grid.append(card);
    }
  });

  block.append(grid);
}
