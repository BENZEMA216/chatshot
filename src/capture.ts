import html2canvas from "html2canvas";

/**
 * Capture a Q&A conversation pair as a single image and copy to clipboard.
 *
 * Key trick: before capturing, temporarily expand all scrollable ancestor
 * containers so html2canvas can see the FULL content, not just the viewport.
 */
export async function captureAndCopy(
  userEl: HTMLElement | null,
  assistantEl: HTMLElement,
  platformName: string
): Promise<boolean> {
  const restoreFns: (() => void)[] = [];

  try {
    // Expand all scroll containers so html2canvas sees full content
    expandScrollAncestors(assistantEl, restoreFns);
    if (userEl) expandScrollAncestors(userEl, restoreFns);

    const opts: Partial<Parameters<typeof html2canvas>[1]> = {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      // Tell html2canvas to use the full element size, not the window
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    };

    const canvases: HTMLCanvasElement[] = [];

    if (userEl) {
      canvases.push(await html2canvas(userEl, opts));
    }
    canvases.push(await html2canvas(assistantEl, opts));

    // Stitch canvases + watermark into one final image
    const final = stitchCanvases(canvases, platformName);

    const blob = await canvasToBlob(final);
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch (err) {
    console.error("[AI Chat Screenshot] Capture failed:", err);
    return false;
  } finally {
    // ALWAYS restore original styles, even on error
    for (const fn of restoreFns) fn();
  }
}

/**
 * Walk up the DOM from `el` and temporarily force every ancestor
 * with hidden/scroll overflow to show all content.
 * Each change pushes a restore function into `restoreFns`.
 */
function expandScrollAncestors(
  el: HTMLElement,
  restoreFns: (() => void)[]
) {
  let node: HTMLElement | null = el;
  while (node && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    const ov = cs.overflow + cs.overflowX + cs.overflowY;

    if (/hidden|scroll|auto/.test(ov) || cs.maxHeight !== "none") {
      const original = {
        overflow: node.style.overflow,
        overflowX: node.style.overflowX,
        overflowY: node.style.overflowY,
        maxHeight: node.style.maxHeight,
        height: node.style.height,
      };
      const ref = node; // capture for closure

      ref.style.overflow = "visible";
      ref.style.overflowX = "visible";
      ref.style.overflowY = "visible";
      ref.style.maxHeight = "none";
      // Don't unset height if it's auto/empty - only unset fixed heights
      if (cs.height !== "auto" && /scroll|hidden/.test(ov)) {
        ref.style.height = "auto";
      }

      restoreFns.push(() => {
        ref.style.overflow = original.overflow;
        ref.style.overflowX = original.overflowX;
        ref.style.overflowY = original.overflowY;
        ref.style.maxHeight = original.maxHeight;
        ref.style.height = original.height;
      });
    }

    node = node.parentElement;
  }
}

function stitchCanvases(
  canvases: HTMLCanvasElement[],
  platformName: string
): HTMLCanvasElement {
  const padding = 48;
  const gap = 16;
  const watermarkHeight = 52;
  const dpr = 2;

  const maxW = Math.max(...canvases.map((c) => c.width));
  const contentWidth = maxW + padding * 2 * dpr;
  const totalContentH = canvases.reduce((sum, c) => sum + c.height, 0);
  const totalH =
    totalContentH +
    gap * dpr * (canvases.length - 1) +
    padding * 2 * dpr +
    watermarkHeight * dpr;

  const final = document.createElement("canvas");
  final.width = contentWidth;
  final.height = totalH;
  const ctx = final.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, final.width, final.height);

  // Draw each captured canvas
  let y = padding * dpr;
  for (let i = 0; i < canvases.length; i++) {
    const c = canvases[i];
    const x = Math.round((contentWidth - c.width) / 2);
    ctx.drawImage(c, x, y);
    y += c.height;

    // Separator line between user & assistant
    if (i < canvases.length - 1) {
      y += (gap / 2) * dpr;
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = dpr;
      ctx.beginPath();
      ctx.moveTo(padding * dpr, y);
      ctx.lineTo(contentWidth - padding * dpr, y);
      ctx.stroke();
      y += (gap / 2) * dpr;
    }
  }

  // Watermark
  y += 20 * dpr;
  ctx.strokeStyle = "#eee";
  ctx.lineWidth = dpr;
  ctx.beginPath();
  ctx.moveTo(padding * dpr, y);
  ctx.lineTo(contentWidth - padding * dpr, y);
  ctx.stroke();

  y += 24 * dpr;
  const ts = formatDate(new Date());
  ctx.fillStyle = "#aaaabb";
  ctx.font = `${11 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${platformName} · ${ts}`, contentWidth / 2, y);

  return final;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/png"
    );
  });
}

function formatDate(d: Date): string {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}`;
}
