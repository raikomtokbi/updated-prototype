export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  accent: string;
  bg: string;
  foreground?: string;
  card?: string;
  cardForeground?: string;
  muted?: string;
  mutedForeground?: string;
  border?: string;
  input?: string;
  primaryForeground?: string;
  btnBuy?: string;
  isLight?: boolean;
}

const DARK_BASE = {
  foreground: "210 40% 95%",
  card: "220 20% 9%",
  cardForeground: "210 40% 95%",
  muted: "220 15% 14%",
  mutedForeground: "220 10% 55%",
  border: "220 15% 16%",
  input: "220 15% 14%",
  primaryForeground: "0 0% 100%",
  accentForeground: "220 20% 6%",
};

export const PRESET_THEMES: ThemePreset[] = [
  { id: "dark-purple", name: "Dark", primary: "258 90% 66%", accent: "196 100% 50%", bg: "220 20% 6%" },
  {
    id: "light-blue",
    name: "Light",
    primary: "217 91% 50%",
    accent: "142 71% 40%",
    bg: "0 0% 100%",
    foreground: "220 20% 8%",
    card: "220 13% 94%",
    cardForeground: "220 20% 10%",
    muted: "220 14% 97%",
    mutedForeground: "220 12% 38%",
    border: "220 13% 87%",
    input: "220 14% 96%",
    primaryForeground: "0 0% 100%",
    btnBuy: "142 71% 36%",
    isLight: true,
  },
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
  let preset: ThemePreset | undefined;

  if (themeId === "custom" && customPrimary && customAccent) {
    primary = customPrimary;
    accent = customAccent;
    preset = undefined;
  } else {
    preset = PRESET_THEMES.find((t) => t.id === themeId) ?? PRESET_THEMES[0];
    primary = preset.primary;
    accent = preset.accent;
  }

  const bg = preset?.bg ?? "220 20% 8%";
  const vars: Record<string, string> = {
    "--primary": primary,
    "--ring": primary,
    "--accent": accent,
    "--background": bg,
    "--foreground": preset?.foreground ?? DARK_BASE.foreground,
    "--card": preset?.card ?? DARK_BASE.card,
    "--card-foreground": preset?.cardForeground ?? DARK_BASE.cardForeground,
    "--muted": preset?.muted ?? DARK_BASE.muted,
    "--muted-foreground": preset?.mutedForeground ?? DARK_BASE.mutedForeground,
    "--border": preset?.border ?? DARK_BASE.border,
    "--input": preset?.input ?? DARK_BASE.input,
    "--primary-foreground": preset?.primaryForeground ?? DARK_BASE.primaryForeground,
    "--btn-buy": preset?.btnBuy ?? primary,
  };

  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

  try { localStorage.setItem("nexcoin_theme_vars", JSON.stringify(vars)); } catch (_) {}

  if (preset?.isLight) {
    root.setAttribute("data-theme", "light");
  } else {
    root.setAttribute("data-theme", "dark");
  }

  const hex = hslToHex(primary);
  let metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement("meta");
    metaTheme.name = "theme-color";
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = hex;
}
