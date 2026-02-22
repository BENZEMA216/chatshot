export interface PlatformAdapter {
  platformName: string;
  matchUrl(url: string): boolean;
  /** Find all assistant response elements currently in the DOM */
  getAssistantMessages(): HTMLElement[];
  /** Given an assistant message element, find the user question element before it */
  getUserMessageBefore(assistantEl: HTMLElement): HTMLElement | null;
  /** Find a good place to inject our button near the assistant message */
  getButtonAnchor(assistantEl: HTMLElement): {
    container: HTMLElement;
    position: InsertPosition;
  } | null;
  /** Selector for the container to observe for new messages */
  getObserveTarget(): HTMLElement | null;
}

// ─── ChatGPT ────────────────────────────────────────────

class ChatGPTAdapter implements PlatformAdapter {
  platformName = "ChatGPT";

  matchUrl(url: string): boolean {
    return /^https:\/\/(chatgpt\.com|chat\.openai\.com)/.test(url);
  }

  getAssistantMessages(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-message-author-role='assistant']"
      )
    );
  }

  getUserMessageBefore(assistantEl: HTMLElement): HTMLElement | null {
    // Walk up to the article turn, then find the previous sibling turn with user role
    const turn = assistantEl.closest("article[data-testid]")
      ?? assistantEl.closest("[data-message-author-role]")?.parentElement?.closest("article");
    if (!turn) return null;

    let prev = turn.previousElementSibling as HTMLElement | null;
    while (prev) {
      const userMsg = prev.querySelector<HTMLElement>(
        "[data-message-author-role='user']"
      );
      if (userMsg) return userMsg;
      prev = prev.previousElementSibling as HTMLElement | null;
    }
    return null;
  }

  getButtonAnchor(assistantEl: HTMLElement): {
    container: HTMLElement;
    position: InsertPosition;
  } | null {
    // ChatGPT has action buttons in a div after the markdown content
    const turn = assistantEl.closest("article") ?? assistantEl;
    // Look for the copy button or action button group
    const actionGroup = turn.querySelector<HTMLElement>(
      'div.flex.justify-start, [class*="flex"][class*="justify-start"]'
    );
    if (actionGroup) {
      return { container: actionGroup, position: "beforeend" };
    }
    // Fallback: append to the turn itself
    return { container: turn as HTMLElement, position: "beforeend" };
  }

  getObserveTarget(): HTMLElement | null {
    return document.querySelector<HTMLElement>("main");
  }
}

// ─── Claude ─────────────────────────────────────────────

class ClaudeAdapter implements PlatformAdapter {
  platformName = "Claude";

  matchUrl(url: string): boolean {
    return /^https:\/\/claude\.ai/.test(url);
  }

  getAssistantMessages(): HTMLElement[] {
    // Try multiple selectors for robustness
    const msgs = document.querySelectorAll<HTMLElement>(
      ".font-claude-message"
    );
    if (msgs.length > 0) return Array.from(msgs);

    return Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-testid='assistant-turn'], [data-testid='assistant-message']"
      )
    );
  }

  getUserMessageBefore(assistantEl: HTMLElement): HTMLElement | null {
    // Claude groups messages in turn containers
    const turn =
      assistantEl.closest("[data-testid='conversation-turn']") ??
      assistantEl.parentElement;
    if (!turn) return null;

    let prev = turn.previousElementSibling as HTMLElement | null;
    while (prev) {
      const userMsg = prev.querySelector<HTMLElement>(
        "[data-testid='user-message'], .font-user-message"
      );
      if (userMsg) return userMsg;
      prev = prev.previousElementSibling as HTMLElement | null;
    }
    return null;
  }

  getButtonAnchor(assistantEl: HTMLElement): {
    container: HTMLElement;
    position: InsertPosition;
  } | null {
    const turn =
      assistantEl.closest("[data-testid='conversation-turn']") ??
      assistantEl;
    // Look for Claude's action bar
    const actionBar = turn.querySelector<HTMLElement>(
      "fieldset, [data-testid='chat-actions']"
    );
    if (actionBar) {
      return { container: actionBar, position: "beforeend" };
    }
    return { container: turn as HTMLElement, position: "beforeend" };
  }

  getObserveTarget(): HTMLElement | null {
    return document.querySelector<HTMLElement>("main");
  }
}

// ─── Doubao ─────────────────────────────────────────────

class DoubaoAdapter implements PlatformAdapter {
  platformName = "Doubao";

  matchUrl(url: string): boolean {
    return /^https:\/\/(www\.)?doubao\.com/.test(url);
  }

  getAssistantMessages(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-testid='receive_message']"
      )
    );
  }

  getUserMessageBefore(assistantEl: HTMLElement): HTMLElement | null {
    // Doubao: walk backwards to find a send_message
    const allMessages = document.querySelectorAll<HTMLElement>(
      "[data-testid='union_message']"
    );
    const arr = Array.from(allMessages);
    const idx = arr.findIndex(
      (el) => el === assistantEl || el.contains(assistantEl)
    );
    if (idx <= 0) return null;

    // Walk backwards from idx to find a user (send) message
    for (let i = idx - 1; i >= 0; i--) {
      if (
        arr[i].querySelector("[data-testid='send_message']") ||
        !arr[i].querySelector("[data-testid='receive_message']")
      ) {
        return arr[i];
      }
    }
    return null;
  }

  getButtonAnchor(assistantEl: HTMLElement): {
    container: HTMLElement;
    position: InsertPosition;
  } | null {
    // Find action buttons area (near copy/dislike buttons)
    const copyBtn = assistantEl.querySelector<HTMLElement>(
      "[data-testid='message_action_copy']"
    );
    if (copyBtn?.parentElement) {
      return { container: copyBtn.parentElement, position: "beforeend" };
    }
    return { container: assistantEl, position: "beforeend" };
  }

  getObserveTarget(): HTMLElement | null {
    return document.querySelector<HTMLElement>("main") ?? document.body;
  }
}

// ─── Manager ────────────────────────────────────────────

const adapters: PlatformAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new DoubaoAdapter(),
];

export function getAdapter(url: string): PlatformAdapter | null {
  return adapters.find((a) => a.matchUrl(url)) ?? null;
}
