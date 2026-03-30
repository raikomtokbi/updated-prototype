export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  accent: string;
  bg: string;
}

export const PRESET_THEMES: ThemePreset[] = [
  { id: "dark-purple", name: "Dark Purple", primary: "258 90% 66%", accent: "196 100% 50%", bg: "220 20% 6%" },
  { id: "dark-blue",   name: "Dark Blue",   primary: "217 91% 60%", accent: "180 100% 50%", bg: "220 30% 6%" },
  { id: "dark-green",  name: "Dark Green",  primary: "142 71% 45%", accent: "160 84% 39%",  bg: "160 20% 6%" },
  { id: "dark-red",    name: "Dark Red",    primary: "0 72% 51%",   accent: "25 95% 53%",   bg: "0 20% 6%"   },
  { id: "dark-gold",   name: "Dark Gold",   primary: "38 92% 50%",  accent: "48 96% 53%",   bg: "40 20% 6%"  },
  { id: "midnight",    name: "Midnight",    primary: "270 50% 60%", accent: "210 80% 60%",  bg: "240 25% 5%" },
];

function hslToHex(hsl: string): string {
  const parts = hsl.split(" ");
  const h = parseInt(parts[0], 10);
  const s = parseInt((parts[1] ?? "0").replace("%", ""), 10) / 100;
  const l = parseInt((parts[2] ?? "0").replace("%", ""), 10) / 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function applyThemeVars(
  themeId: string | undefined,
  customPrimary?: string,
  customAccent?: string,
) {
  const root = document.documentElement;

  let primary: string;
  let accent: string;

  if (themeId === "custom" && customPrimary && customAccent) {
    primary = customPrimary;
    accent = customAccent;
  } else {
    const preset = PRESET_THEMES.find((t) => t.id === themeId) ?? PRESET_THEMES[0];
    primary = preset.primary;
    accent = preset.accent;
  }

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--accent", accent);
}
