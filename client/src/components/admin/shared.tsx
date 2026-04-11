import { Search } from "lucide-react";

// ─── Common styles ─────────────────────────────────────────────────────────────
export const card: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
  outline: "none",
  boxSizing: "border-box",
};

export const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
  outline: "none",
  cursor: "pointer",
  flexShrink: 0,
};

export const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 14px",
  borderRadius: "6px",
  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
  color: "white",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  whiteSpace: "nowrap",
};

export const btnSuccess: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  borderRadius: "5px",
  background: "rgba(74, 222, 128, 0.1)",
  border: "1px solid rgba(74, 222, 128, 0.25)",
  color: "hsl(142, 71%, 48%)",
  fontSize: "11px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const btnDanger: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  borderRadius: "5px",
  background: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "hsl(0, 72%, 62%)",
  fontSize: "11px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const btnEdit: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  borderRadius: "5px",
  background: "hsl(var(--primary) / 0.1)",
  border: "1px solid hsl(var(--primary) / 0.25)",
  color: "hsl(var(--primary))",
  fontSize: "11px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const btnNeutral: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  borderRadius: "5px",
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  color: "hsl(var(--muted-foreground))",
  fontSize: "11px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  completed: "hsl(142, 71%, 45%)",
  success: "hsl(142, 71%, 45%)",
  active: "hsl(142, 71%, 45%)",
  open: "hsl(196, 100%, 50%)",
  pending: "hsl(38, 92%, 50%)",
  processing: "hsl(38, 92%, 50%)",
  in_progress: "hsl(38, 92%, 50%)",
  "in-progress": "hsl(38, 92%, 50%)",
  failed: "hsl(0, 72%, 51%)",
  refunded: "hsl(var(--primary))",
  resolved: "hsl(142, 71%, 45%)",
  closed: "hsl(var(--muted-foreground))",
  inactive: "hsl(0, 72%, 51%)",
  maintenance: "hsl(38, 92%, 50%)",
  high: "hsl(0, 72%, 51%)",
  medium: "hsl(38, 92%, 50%)",
  low: "hsl(142, 71%, 45%)",
  urgent: "hsl(0, 72%, 51%)",
  super_admin: "hsl(var(--primary))",
  admin: "hsl(196, 100%, 50%)",
  staff: "hsl(38, 92%, 50%)",
  user: "hsl(var(--muted-foreground))",
};

export function StatusBadge({ value }: { value: string }) {
  const color = statusColors[value] ?? "hsl(var(--muted-foreground))";
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 500,
        background: `${color}20`,
        color,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

// ─── SearchInput ──────────────────────────────────────────────────────────────
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative", minWidth: "200px" }}>
      <Search size={13} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))", pointerEvents: "none" }} />
      <input
        style={{ ...inputStyle, paddingLeft: "28px" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────
export function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select style={selectStyle} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({ message = "No data available yet." }: { message?: string }) {
  return (
    <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
      <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.3 }}>📭</div>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>{message}</p>
    </div>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────
export const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.05em",
  color: "hsl(var(--muted-foreground))",
  borderBottom: "1px solid hsl(220, 15%, 13%)",
  whiteSpace: "nowrap",
};

export const tdStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderBottom: "1px solid hsl(220, 15%, 11%)",
  verticalAlign: "middle",
};

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: wide ? "820px" : "520px", maxHeight: "85vh", overflowY: "auto", background: "hsl(var(--background))", border: "1px solid hsl(var(--primary) / 0.25)", borderRadius: "10px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(var(--muted-foreground))", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Toolbar wrapper ──────────────────────────────────────────────────────────
export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "14px 16px",
        borderBottom: "1px solid hsl(220, 15%, 13%)",
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}
