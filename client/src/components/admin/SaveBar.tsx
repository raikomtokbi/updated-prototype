import { Loader2, Save } from "lucide-react";

interface SaveBarProps {
  show: boolean;
  saving?: boolean;
  saved?: boolean;
  onSave: () => void;
  label?: string;
  sidebarWidth?: number;
}

export function SaveBar({ show, saving, saved, onSave, label = "You have unsaved changes", sidebarWidth = 236 }: SaveBarProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        pointerEvents: show ? "auto" : "none",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
        transform: show ? "translateY(0)" : "translateY(110%)",
        opacity: show ? 1 : 0,
      }}
    >
      <div
        style={{
          marginLeft: `${sidebarWidth}px`,
          padding: "10px 20px",
          background: "hsl(var(--card))",
          borderTop: "1px solid hsl(220,15%,18%)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "6px" }}>
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
          {saved ? "Changes saved!" : label}
        </span>

        <button
          data-testid="button-save-changes-bar"
          onClick={onSave}
          disabled={saving || saved}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 16px",
            borderRadius: "6px",
            background: saved ? "hsl(142,71%,38%)" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
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
            ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            : <Save size={12} />
          }
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
