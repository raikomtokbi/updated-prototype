import { Loader2, Save } from "lucide-react";

interface SaveBarProps {
  show: boolean;
  saving?: boolean;
  saved?: boolean;
  onSave: () => void;
  label?: string;
  sidebarWidth?: number;
}

export function SaveBar({ show, saving, saved, onSave, label = "Unsaved changes", sidebarWidth = 236 }: SaveBarProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: sidebarWidth,
        right: 0,
        zIndex: 200,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
        transform: show ? "translateY(0)" : "translateY(calc(100% + 30px))",
        opacity: show ? 1 : 0,
      }}
    >
      <div
        style={{
          pointerEvents: show ? "auto" : "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 10px 8px 14px",
          background: "hsl(var(--card))",
          border: "1px solid hsl(220,15%,20%)",
          borderRadius: "999px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.55)",
        }}
      >
        <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: saved ? "hsl(142,71%,45%)" : "hsl(38,92%,50%)",
              flexShrink: 0,
            }}
          />
          {saved ? "Saved!" : label}
        </span>

        <button
          data-testid="button-save-changes-bar"
          onClick={onSave}
          disabled={saving || saved}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 12px",
            borderRadius: "999px",
            background: saved ? "hsl(142,71%,38%)" : "hsl(var(--primary))",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            border: "none",
            cursor: saving || saved ? "default" : "pointer",
            opacity: saving ? 0.75 : 1,
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          {saving
            ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
            : <Save size={11} />
          }
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}
