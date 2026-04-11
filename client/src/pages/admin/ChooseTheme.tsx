import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Palette, RotateCcw, Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { applyThemeVars, PRESET_THEMES, type ThemePreset } from "@/lib/theme";
import { useNavGuard } from "@/hooks/useNavGuard";
import { UnsavedChangesDialog } from "@/components/admin/UnsavedChangesDialog";

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: `hsl(${color})`, flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }} />
      <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}>hsl({color})</span>
    </div>
  );
}

function HslPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const parts = value.split(" ");
  const h = parseInt(parts[0] ?? "0", 10);
  const s = parseInt((parts[1] ?? "0").replace("%", ""), 10);
  const l = parseInt((parts[2] ?? "0").replace("%", ""), 10);

  function setH(v: number) { onChange(`${v} ${s}% ${l}%`); }
  function setS(v: number) { onChange(`${h} ${v}% ${l}%`); }
  function setL(v: number) { onChange(`${h} ${s}% ${v}%`); }

  const labelSt: React.CSSProperties = { fontSize: "10px", color: "hsl(220,10%,48%)", marginBottom: "2px" };
  const inp: React.CSSProperties = {
    width: "100%",
    padding: "3px 6px",
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "4px",
    color: "hsl(var(--foreground))",
    fontSize: "11px",
    outline: "none",
  };

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "hsl(210,40%,72%)", marginBottom: "6px" }}>{label}</div>
      <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "6px", flexShrink: 0, background: `hsl(${value})`, border: "1px solid hsl(var(--border))" }} />
        <div style={{ flex: 1 }}>
          <div style={labelSt}>Hue (0–360)</div>
          <input style={inp} type="number" min={0} max={360} value={h} onChange={(e) => setH(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelSt}>Sat %</div>
          <input style={inp} type="number" min={0} max={100} value={s} onChange={(e) => setS(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelSt}>Light %</div>
          <input style={inp} type="number" min={0} max={100} value={l} onChange={(e) => setL(Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}

export default function ChooseTheme() {
  const qc = useQueryClient();

  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
  });

  const activeTheme = settings.active_theme ?? "dark-purple";

  const [customPrimary, setCustomPrimary] = useState("258 90% 66%");
  const [customAccent, setCustomAccent] = useState("196 100% 50%");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.theme_custom_primary) setCustomPrimary(settings.theme_custom_primary);
    if (settings.theme_custom_accent) setCustomAccent(settings.theme_custom_accent);
  }, [settings.theme_custom_primary, settings.theme_custom_accent]);

  const savedPrimary = settings.theme_custom_primary ?? "258 90% 66%";
  const savedAccent = settings.theme_custom_accent ?? "196 100% 50%";
  const customDirty = customPrimary !== savedPrimary || customAccent !== savedAccent;

  const { leaveDialog, cancelLeave, doLeave } = useNavGuard(customDirty);

  const saveMut = useMutation({
    mutationFn: (data: Record<string, string>) => adminApi.put("/settings", data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/site-settings"] });
      applyThemeVars(vars.active_theme, vars.theme_custom_primary, vars.theme_custom_accent);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function applyPreset(id: string) {
    saveMut.mutate({ active_theme: id, theme_custom_primary: customPrimary, theme_custom_accent: customAccent });
  }

  function applyCustom() {
    saveMut.mutate({ active_theme: "custom", theme_custom_primary: customPrimary, theme_custom_accent: customAccent });
  }

  function resetToDefault() {
    const def = PRESET_THEMES.find((t) => t.id === "dark-purple")!;
    setCustomPrimary(def.primary);
    setCustomAccent(def.accent);
    saveMut.mutate({ active_theme: "dark-purple", theme_custom_primary: def.primary, theme_custom_accent: def.accent });
  }

  function leaveAndDiscard() {
    setCustomPrimary(savedPrimary);
    setCustomAccent(savedAccent);
    doLeave();
  }

  function leaveAndSave() {
    saveMut.mutate({ active_theme: "custom", theme_custom_primary: customPrimary, theme_custom_accent: customAccent }, {
      onSuccess: () => doLeave(),
    });
  }

  const card: React.CSSProperties = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(220,15%,13%)",
    borderRadius: "8px",
  };

  const sectionHeader: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    borderBottom: "1px solid hsl(var(--input))",
  };

  const saveBtn = customDirty ? (
    <button
      onClick={applyCustom}
      disabled={saveMut.isPending}
      style={{
        display: "inline-flex", alignItems: "center", gap: "7px",
        padding: "8px 18px", borderRadius: "6px",
        background: saved ? "hsl(142,71%,38%)" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
        color: "white", fontSize: "13px", fontWeight: 600,
        cursor: saveMut.isPending ? "not-allowed" : "pointer",
        border: "none", flexShrink: 0, opacity: saveMut.isPending ? 0.8 : 1,
      }}
    >
      {saveMut.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
      {saved ? "Saved!" : "Save Changes"}
    </button>
  ) : undefined;

  return (
    <AdminLayout title="Theme" actions={saveBtn}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Preset themes */}
        <div style={card}>
          <div style={sectionHeader}>
            <Palette size={14} style={{ color: "hsl(var(--primary))" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Preset Themes</span>
          </div>
          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
            {PRESET_THEMES.map((theme) => {
              const isActive = activeTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  data-testid={`card-theme-${theme.id}`}
                  disabled={saveMut.isPending}
                  onClick={() => applyPreset(theme.id)}
                  style={{
                    background: "hsl(var(--card))",
                    border: isActive ? `2px solid hsl(${theme.primary})` : "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: saveMut.isPending ? "not-allowed" : "pointer",
                    textAlign: "left",
                    position: "relative",
                    transition: "border-color 0.15s",
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: `hsl(${theme.primary})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Check size={10} style={{ color: "white" }} />
                    </div>
                  )}
                  {/* Mini preview */}
                  <div style={{ borderRadius: "5px", height: "60px", background: `hsl(${theme.bg})`, marginBottom: "8px", overflow: "hidden", position: "relative", border: theme.isLight ? "1px solid hsl(220,13%,87%)" : "none" }}>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `hsl(${theme.primary})` }} />
                    <div style={{ display: "flex", gap: "5px", padding: "8px", alignItems: "center" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: `hsl(${theme.primary})` }} />
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: `hsl(${theme.accent})` }} />
                      {theme.btnBuy && (
                        <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: `hsl(${theme.btnBuy})` }} title="Buy button color" />
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "5px", padding: "0 8px" }}>
                      <div style={{ height: "5px", borderRadius: "2px", background: `hsl(${theme.primary})`, width: "42%", opacity: 0.75 }} />
                      <div style={{ height: "5px", borderRadius: "2px", background: `hsl(${theme.accent})`, width: "26%", opacity: 0.5 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{theme.name}</span>
                    {theme.isLight && (
                      <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: "hsla(217,91%,50%,0.2)", color: "hsl(217,91%,70%)", border: "1px solid hsla(217,91%,50%,0.35)", fontWeight: 700, letterSpacing: "0.04em" }}>LIGHT</span>
                    )}
                  </div>
                  <ColorSwatch color={theme.primary} label="Primary" />
                  <div style={{ marginTop: "3px" }}>
                    <ColorSwatch color={theme.accent} label="Accent" />
                  </div>
                  {theme.btnBuy && (
                    <div style={{ marginTop: "3px" }}>
                      <ColorSwatch color={theme.btnBuy} label="Buy btn" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom color pickers */}
        <div style={card}>
          <div style={sectionHeader}>
            <Palette size={14} style={{ color: "hsl(196,100%,50%)" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Custom Colors</span>
            {activeTheme === "custom" && (
              <span style={{ marginLeft: "6px", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(124,58,237,0.15)", color: "hsl(var(--primary))", border: "1px solid rgba(124,58,237,0.3)", fontWeight: 600 }}>
                Active
              </span>
            )}
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0 }}>
              Tune the hue, saturation, and lightness to create a unique look. Changes apply site-wide instantly.
            </p>
            <HslPicker label="Primary Color" value={customPrimary} onChange={setCustomPrimary} />
            <HslPicker label="Accent Color" value={customAccent} onChange={setCustomAccent} />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
              <button
                onClick={applyCustom}
                disabled={saveMut.isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 18px",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: saveMut.isPending ? "not-allowed" : "pointer",
                  border: "none",
                  opacity: saveMut.isPending ? 0.75 : 1,
                }}
              >
                {saveMut.isPending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={12} />}
                Apply Custom Colors
              </button>
              <button
                onClick={resetToDefault}
                disabled={saveMut.isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  background: "transparent",
                  color: "hsl(var(--muted-foreground))",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: saveMut.isPending ? "not-allowed" : "pointer",
                  border: "1px solid hsl(220,15%,20%)",
                }}
              >
                <RotateCcw size={11} /> Reset to Default
              </button>
            </div>
          </div>
        </div>

      </div>

      <UnsavedChangesDialog
        open={leaveDialog}
        saving={saveMut.isPending}
        onStay={cancelLeave}
        onDiscard={leaveAndDiscard}
        onSave={leaveAndSave}
      />
    </AdminLayout>
  );
}
