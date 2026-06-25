/**
 * Sidebar Categories (Data Layer - Computed)
 *
 * Reads all markdown posts and extracts category frequency data.
 * Uses taxonomy.js mapping for URL-safe slugs.
 * Used by the right sidebar categories list component.
 */
const fs = require("fs");
const path = require("path");
const taxonomy = require("./taxonomy.js")();

module.exports = function () {
  const postsDir = path.join(__dirname, "..", "_posts");
  const map = {};

  try {
    const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const content = fs.readFileSync(path.join(postsDir, file), "utf8");
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;

      const frontmatter = match[1];
      const catMatch = frontmatter.match(/^categories:\s*\n((\s+- .+\n?)+)/m);
      if (catMatch) {
        const cats = catMatch[1]
          .split("\n")
          .map((l) => l.replace(/^\s+-\s*/, "").trim())
          .filter(Boolean);
        for (const cat of cats) {
          if (!map[cat]) map[cat] = 0;
          map[cat]++;
        }
      }
    }
  } catch (e) {
    // Return empty array if posts directory does not exist
  }

  return Object.entries(map)
    .map(([name, count]) => ({
      name,
      slug: taxonomy.categories[name] || name.toLowerCase().replace(/\s+/g, "-"),
      count,
    }))
    .sort((a, b) => b.count - a.count);
};
