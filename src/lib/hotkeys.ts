import type { Hotkey, HotkeyConfig } from "./types";

const IS_MAC = navigator.userAgent.includes("Mac");

function parseHotkey(hotkey: string): Hotkey {
  const parts = hotkey.toLowerCase().split("+").map(p => p.trim());
  const meta = parts.includes("mod") || parts.includes("cmd") || parts.includes("meta");
  const ctrl = parts.includes("ctrl");
  const shift = parts.includes("shift");
  const alt = parts.includes("alt");
  const key = parts.filter(p => !["mod", "cmd", "meta", "ctrl", "shift", "alt"].includes(p)).pop();

  if (!key) {
    throw new Error(`Invalid hotkey format: ${hotkey}`);
  }

  return { meta, ctrl, shift, alt, key };
}

function matchHotkey(event: KeyboardEvent, hotkey: Hotkey): boolean {
  const eventMeta = IS_MAC ? event.metaKey : event.ctrlKey;
  const eventCtrl = IS_MAC ? event.ctrlKey : false; // On Mac, Ctrl is a separate modifier

  return (
    event.key.toLowerCase() === hotkey.key &&
    eventMeta === hotkey.meta &&
    eventCtrl === hotkey.ctrl &&
    event.shiftKey === hotkey.shift &&
    event.altKey === hotkey.alt
  );
}


export function createHotkeyHandler(configs: HotkeyConfig[]) {
  const hotkeys = configs.map(config => ({
    parsed: parseHotkey(config.hotkey),
    handler: config.handler,
    preventDefault: config.preventDefault ?? true,
  }));

  return function handleKeyDown(event: React.KeyboardEvent | KeyboardEvent) {
    for (const hotkey of hotkeys) {
      if (matchHotkey(event as KeyboardEvent, hotkey.parsed)) {
        if (hotkey.preventDefault) {
          event.preventDefault();
        }
        hotkey.handler(event as KeyboardEvent);
        return; // Stop after first match
      }
    }
  };
}

export * from "./types"; 