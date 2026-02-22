const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const s = size;

  // ─── Rounded rectangle background with gradient ───
  const radius = s * 0.22;
  const margin = s * 0.02;

  // Purple gradient background
  const grad = ctx.createLinearGradient(0, 0, s * 0.3, s);
  grad.addColorStop(0, "#6366f1"); // indigo-500
  grad.addColorStop(1, "#4f46e5"); // indigo-600

  ctx.beginPath();
  roundRect(ctx, margin, margin, s - margin * 2, s - margin * 2, radius);
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle inner shadow / depth
  const innerGrad = ctx.createLinearGradient(0, 0, 0, s);
  innerGrad.addColorStop(0, "rgba(255,255,255,0.15)");
  innerGrad.addColorStop(0.5, "rgba(255,255,255,0)");
  innerGrad.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // ─── Camera icon ───
  const cx = s / 2;
  const cy = s / 2 + s * 0.03;
  const scale = s / 128;

  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 3 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Camera body (rounded rect)
  const bw = 56 * scale;
  const bh = 38 * scale;
  const bx = cx - bw / 2;
  const by = cy - bh / 2 + 4 * scale;
  const br = 6 * scale;

  ctx.beginPath();
  roundRect(ctx, bx, by, bw, bh, br);
  ctx.stroke();

  // Camera top part (viewfinder hump)
  const tw = 20 * scale;
  const th = 8 * scale;
  ctx.beginPath();
  ctx.moveTo(cx - tw / 2 - 4 * scale, by);
  ctx.lineTo(cx - tw / 2, by - th);
  ctx.lineTo(cx + tw / 2, by - th);
  ctx.lineTo(cx + tw / 2 + 4 * scale, by);
  ctx.stroke();

  // Camera lens (circle)
  const lr = 12 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy + 4 * scale, lr, 0, Math.PI * 2);
  ctx.stroke();

  // Inner lens dot
  ctx.beginPath();
  ctx.arc(cx, cy + 4 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Small flash dot (top right of camera body)
  ctx.beginPath();
  ctx.arc(bx + bw - 8 * scale, by + 8 * scale, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // ─── Chat bubble badge (top-right) ───
  const badgeR = 12 * scale;
  const badgeCx = cx + 24 * scale;
  const badgeCy = cy - 24 * scale;

  // White circle background
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR + 2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#4f46e5";
  ctx.fill();

  // Green badge
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = "#22c55e";
  ctx.fill();

  // Tiny chat lines inside badge
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 * scale;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(badgeCx - 5 * scale, badgeCy - 2 * scale);
  ctx.lineTo(badgeCx + 5 * scale, badgeCy - 2 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(badgeCx - 5 * scale, badgeCy + 2 * scale);
  ctx.lineTo(badgeCx + 3 * scale, badgeCy + 2 * scale);
  ctx.stroke();

  return canvas.toBuffer("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Generate all sizes
const iconsDir = path.resolve(__dirname, "../icons");
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const buf = generateIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`  icon${size}.png (${buf.length} bytes)`);
}

console.log("\nDone! Icons saved to icons/");
