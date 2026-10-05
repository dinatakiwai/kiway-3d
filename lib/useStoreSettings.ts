"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BASE_COLORS, DEFAULT_CAP_COLORS, DEFAULT_FONT_COLORS, STORE, type ClickerColor } from "@/lib/store";

export type StoreSettings = {
  whatsapp: string;
  whatsappGreeting: string;
  baseColors: ClickerColor[];
  capColors: ClickerColor[];
  fontColors: ClickerColor[];
};

const SETTINGS_CHANGED_EVENT = "keilab-store-settings-updated";
const defaultSettings: StoreSettings = {
  whatsapp: STORE.whatsapp,
  whatsappGreeting: STORE.whatsappGreeting,
  baseColors: DEFAULT_BASE_COLORS,
  capColors: DEFAULT_CAP_COLORS,
  fontColors: DEFAULT_FONT_COLORS,
};

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/store-settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active && data.settings) {
          setSettings({
            ...defaultSettings,
            ...data.settings,
            baseColors: Array.isArray(data.settings.baseColors) && data.settings.baseColors.length
              ? data.settings.baseColors
              : DEFAULT_BASE_COLORS,
            capColors: Array.isArray(data.settings.capColors) && data.settings.capColors.length
              ? data.settings.capColors
              : DEFAULT_CAP_COLORS,
            fontColors: Array.isArray(data.settings.fontColors) && data.settings.fontColors.length
              ? data.settings.fontColors
              : DEFAULT_FONT_COLORS,
          } as StoreSettings);
        }
      } catch {
        // Keep the defaults embedded in the app if the settings endpoint is unavailable.
      }
    };

    loadSettings();
    window.addEventListener(SETTINGS_CHANGED_EVENT, loadSettings);
    return () => {
      active = false;
      window.removeEventListener(SETTINGS_CHANGED_EVENT, loadSettings);
    };
  }, []);

  return settings;
}

export function notifyStoreSettingsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
  }
}