/**
 * Sidebar Tags (Data Layer - Computed)
 *
 * Reads all markdown posts and extracts tag frequency data.
 * Uses taxonomy.js mapping for URL-safe slugs.
 * Used by the right sidebar tag cloud component.
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
      const tagMatch = frontmatter.match(/^tags:\s*\n((\s+- .+\n?)+)/m);
      if (tagMatch) {
        const tags = tagMatch[1]
          .split("\n")
          .map((l) => l.replace(/^\s+-\s*/, "").trim())
          .filter(Boolean);
        for (const tag of tags) {
          if (!map[tag]) map[tag] = 0;
          map[tag]++;
        }
      }
    }
  } catch (e) {
    // Return empty array if posts directory does not exist
  }

  return Object.entries(map)
    .map(([name, count]) => ({
      name,
      slug: taxonomy.tags[name] || name.toLowerCase().replace(/\s+/g, "-"),
      count,
    }))
    .sort((a, b) => b.count - a.count);
};
