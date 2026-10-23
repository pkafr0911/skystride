// Render obstacle-study.cjs output with depth-tested triangles (requires sharp).
// node scripts/obstacle-study.cjs --equipment
// node scripts/render-obstacle-study.cjs docs/implemented-obstacles-v2.png
const fs = require("node:fs");
const sharp = require("sharp");
const panels = JSON.parse(
  fs.readFileSync("/tmp/skystride-obstacle-study.json", "utf8"),
);
const width = 1800,
  cardWidth = 852,
  cardHeight = 350;
const height = 142 + Math.ceil(panels.length / 2) * 374 + 36;
const pixels = Buffer.alloc(width * height * 4);
const depths = new Float64Array(width * height).fill(Infinity);
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#0c1420"/><text x="36" y="58" fill="#f1eadf" font-family="sans-serif" font-size="34" font-weight="700">SKYSTRIDE / ROOFTOP EQUIPMENT</text><text x="36" y="98" fill="#9caec3" font-family="sans-serif" font-size="19">Current in-game geometry · Real-world rooftop equipment</text>`,
];
const edge = (a, b, x, y) =>
  (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
panels.forEach((panel, i) => {
  const x = 36 + (i % 2) * 876,
    y = 142 + Math.floor(i / 2) * 374;
  svg.push(
    `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="16" fill="#162334" stroke="#2b3b50"/><text x="${x + 24}" y="${y + 36}" fill="#f3ae65" font-family="sans-serif" font-size="17" font-weight="700">${String(i + 1).padStart(2, "0")} / ${panel.title}</text>`,
  );
  const points = panel.triangles.flatMap((t) =>
    t.points.map((v) => [v[0], v[1] * 0.76]),
  );
  const minX = Math.min(...points.map((v) => v[0])),
    maxX = Math.max(...points.map((v) => v[0]));
  const minY = Math.min(...points.map((v) => v[1])),
    maxY = Math.max(...points.map((v) => v[1]));
  const scale = Math.min(
    (cardWidth - 72) / (maxX - minX),
    (cardHeight - 104) / (maxY - minY),
  );
  const ox = x + cardWidth / 2 - ((minX + maxX) / 2) * scale,
    oy = y + 64 + (cardHeight - 88) / 2 - ((minY + maxY) / 2) * scale;
  for (const triangle of panel.triangles) {
    const [a, b, c] = triangle.points.map((v) => [
      ox + v[0] * scale,
      oy + v[1] * 0.76 * scale,
      v[2],
    ]);
    const area = edge(a, b, c[0], c[1]);
    if (Math.abs(area) < 1e-10) continue;
    const color = parseInt(triangle.color.slice(1), 16);
    for (
      let py = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
      py <= Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      py++
    ) {
      for (
        let px = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
        px <= Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
        px++
      ) {
        const u = edge(b, c, px + 0.5, py + 0.5) / area,
          v = edge(c, a, px + 0.5, py + 0.5) / area,
          t = 1 - u - v;
        if (u < 0 || v < 0 || t < 0) continue;
        const depth = u * a[2] + v * b[2] + t * c[2],
          index = py * width + px;
        if (depth >= depths[index]) continue;
        depths[index] = depth;
        pixels[index * 4] = color >> 16;
        pixels[index * 4 + 1] = (color >> 8) & 255;
        pixels[index * 4 + 2] = color & 255;
        pixels[index * 4 + 3] = 255;
      }
    }
  }
});
svg.push("</svg>");
sharp(Buffer.from(svg.join("")))
  .composite([{ input: pixels, raw: { width, height, channels: 4 } }])
  .png()
  .toFile(process.argv[2] || "docs/implemented-obstacles-v2.png")
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
