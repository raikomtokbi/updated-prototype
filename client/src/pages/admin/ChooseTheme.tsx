import AdminLayout from "@/components/admin/AdminLayout";

const themes = [
  { id: "dark-purple", name: "Dark Purple", primary: "hsl(258, 90%, 66%)", accent: "hsl(196, 100%, 50%)", bg: "hsl(220, 20%, 6%)", active: true },
  { id: "dark-blue", name: "Dark Blue", primary: "hsl(217, 91%, 60%)", accent: "hsl(180, 100%, 50%)", bg: "hsl(220, 30%, 6%)", active: false },
  { id: "dark-green", name: "Dark Green", primary: "hsl(142, 71%, 45%)", accent: "hsl(160, 84%, 39%)", bg: "hsl(160, 20%, 6%)", active: false },
  { id: "dark-red", name: "Dark Red", primary: "hsl(0, 72%, 51%)", accent: "hsl(25, 95%, 53%)", bg: "hsl(0, 20%, 6%)", active: false },
  { id: "dark-gold", name: "Dark Gold", primary: "hsl(38, 92%, 50%)", accent: "hsl(48, 96%, 53%)", bg: "hsl(40, 20%, 6%)", active: false },
  { id: "midnight", name: "Midnight", primary: "hsl(270, 50%, 60%)", accent: "hsl(210, 80%, 60%)", bg: "hsl(240, 25%, 5%)", active: false },
];

export default function ChooseTheme() {
  return (
    <AdminLayout title="Choose Theme">
      <div>
        <p style={{ fontSize: "12px", color: "hsl(220, 10%, 46%)", marginBottom: "16px" }}>
          Select a color theme for the storefront. The currently active theme is highlighted.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
          {themes.map((theme) => (
            <div
              key={theme.id}
              data-testid={`card-theme-${theme.id}`}
              style={{
                background: "hsl(220, 20%, 9%)",
                border: theme.active ? `2px solid ${theme.primary}` : "1px solid hsl(220, 15%, 13%)",
                borderRadius: "8px",
                padding: "14px",
                cursor: "pointer",
              }}
            >
              <div style={{ borderRadius: "6px", height: "72px", background: theme.bg, marginBottom: "10px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: theme.primary }} />
                <div style={{ display: "flex", gap: "6px", padding: "10px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: theme.primary }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: theme.accent }} />
                </div>
                <div style={{ display: "flex", gap: "6px", padding: "0 10px" }}>
                  <div style={{ height: "6px", borderRadius: "3px", background: theme.primary, width: "45%", opacity: 0.7 }} />
                  <div style={{ height: "6px", borderRadius: "3px", background: theme.accent, width: "28%", opacity: 0.5 }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 500, color: "hsl(210, 40%, 90%)" }}>{theme.name}</span>
                {theme.active && (
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: 500, background: `${theme.primary}25`, color: theme.primary }}>
                    Active
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
