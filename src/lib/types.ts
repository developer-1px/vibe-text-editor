export interface Hotkey {
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

export interface HotkeyConfig {
  hotkey: string;
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
} 