import { getAdapter, type PlatformAdapter } from "./adapters";
import { captureAndCopy } from "./capture";

const MARKER = "data-acs-injected";

function init() {
  const adapter = getAdapter(window.location.href);
  if (!adapter) return;

  // Initial scan
  injectButtons(adapter);

  // Watch for new messages — debounced to avoid hammering during streaming
  const target = adapter.getObserveTarget();
  if (!target) return;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => injectButtons(adapter), 300);
  });
  observer.observe(target, { childList: true, subtree: true });
}

function injectButtons(adapter: PlatformAdapter) {
  const assistantMessages = adapter.getAssistantMessages();

  for (const msg of assistantMessages) {
    if (msg.getAttribute(MARKER)) continue;
    msg.setAttribute(MARKER, "1");

    const anchor = adapter.getButtonAnchor(msg);
    if (!anchor) continue;

    // Guard: don't inject if this exact anchor already has our button
    if (anchor.container.querySelector(".acs-btn")) continue;

    const btn = createButton(adapter, msg);
    anchor.container.insertAdjacentElement(anchor.position, btn);
  }
}

function createButton(
  adapter: PlatformAdapter,
  assistantEl: HTMLElement
): HTMLElement {
  const btn = document.createElement("button");
  btn.className = "acs-btn";
  btn.title = "Screenshot & Copy";
  btn.innerHTML = `
    <svg class="acs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
    <span class="acs-label">Screenshot</span>
  `;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Visual: set loading
    btn.classList.add("acs-loading");
    btn.innerHTML = `
      <svg class="acs-icon acs-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span class="acs-label">Capturing...</span>
    `;

    const userEl = adapter.getUserMessageBefore(assistantEl);
    const ok = await captureAndCopy(userEl, assistantEl, adapter.platformName);

    if (ok) {
      btn.classList.remove("acs-loading");
      btn.classList.add("acs-done");
      btn.innerHTML = `
        <svg class="acs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span class="acs-label">Copied!</span>
      `;
      showToast("Screenshot copied to clipboard!");
    } else {
      btn.classList.remove("acs-loading");
      btn.innerHTML = `
        <svg class="acs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span class="acs-label">Failed</span>
      `;
      showToast("Screenshot failed. Try again.", true);
    }

    // Reset button after 2s
    setTimeout(() => {
      btn.classList.remove("acs-done");
      btn.innerHTML = `
        <svg class="acs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span class="acs-label">Screenshot</span>
      `;
    }, 2000);
  });

  return btn;
}

function showToast(message: string, isError = false) {
  // Remove existing toast
  document.querySelector(".acs-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = `acs-toast ${isError ? "acs-toast-error" : "acs-toast-success"}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add("acs-toast-show");
  });

  setTimeout(() => {
    toast.classList.remove("acs-toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
