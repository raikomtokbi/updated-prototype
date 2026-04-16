import { AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  saving?: boolean;
  onStay: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedChangesDialog({ open, saving, onStay, onDiscard, onSave }: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onStay}
    >
      <div
        style={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "10px",
          padding: "28px 24px 22px",
          maxWidth: "420px",
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "20px" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "42px", height: "42px", borderRadius: "8px",
            backgroundColor: "hsl(38, 92%, 45%)", flexShrink: 0,
          }}>
            <AlertTriangle size={20} color="white" />
          </div>
          <div>
            <h3 style={{ margin: "0 0 5px 0", fontSize: "15px", fontWeight: 700, color: "hsl(210,40%,96%)" }}>
              Unsaved Changes
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "hsl(var(--muted-foreground))", lineHeight: "1.5" }}>
              You have unsaved changes. What would you like to do before leaving?
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            data-testid="button-stay-page"
            onClick={onStay}
            style={{
              padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500,
              backgroundColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))",
              border: "1px solid hsl(220, 15%, 22%)", cursor: "pointer",
            }}
          >
            Stay
          </button>
          <button
            data-testid="button-discard-leave"
            onClick={onDiscard}
            style={{
              padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500,
              backgroundColor: "hsl(0, 65%, 40%)", color: "white",
              border: "none", cursor: "pointer",
            }}
          >
            Discard & Leave
          </button>
          <button
            data-testid="button-save-leave"
            onClick={onSave}
            disabled={saving}
            style={{
              padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600,
              background: "hsl(var(--primary))", color: "white",
              border: "none", cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.75 : 1,
              display: "inline-flex", alignItems: "center", gap: "6px",
            }}
          >
            {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Save & Leave
          </button>
        </div>
      </div>
    </div>
  );
}
