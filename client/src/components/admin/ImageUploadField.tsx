import { useRef, useState } from "react";
import { Upload, Loader2, Trash2, ImageIcon } from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";

export type AspectRatio = "any" | "square" | "rectangle";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  ratio?: AspectRatio;
  showRatioSelector?: boolean;
}

const RATIO_META: Record<AspectRatio, { aspect: string | undefined; hint: string | null }> = {
  any:       { aspect: undefined,   hint: null },
  square:    { aspect: "1 / 1",     hint: "Recommended: 500 × 500 px (1:1)" },
  rectangle: { aspect: "3 / 2",    hint: "Recommended: 1500 × 1000 px (3:2 landscape)" },
};

export function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = "https://...",
  inputStyle,
  labelStyle,
  ratio: externalRatio,
  showRatioSelector = false,
}: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratio, setRatio] = useState<AspectRatio>(externalRatio ?? "any");

  const { aspect, hint } = RATIO_META[ratio];
  const isWide = ratio === "rectangle";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { user } = useAuthStore.getState();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-admin-role": user?.role ?? "super_admin" },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onChange(data.url);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!value) return;
    setDeleting(true);
    setError(null);
    try {
      const { user } = useAuthStore.getState();
      const res = await fetch("/api/admin/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": user?.role ?? "super_admin",
        },
        body: JSON.stringify({ url: value }),
      });
      if (!res.ok) throw new Error(await res.text());
      onChange("");
    } catch {
      setError("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    border: "1px solid",
  };

  return (
    <div>
      <label style={labelStyle}>{label}</label>

      {showRatioSelector && (
        <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
          {(["any", "square", "rectangle"] as AspectRatio[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatio(r)}
              style={{
                padding: "2px 10px",
                borderRadius: "4px",
                border: `1px solid ${ratio === r ? "rgba(124,58,237,0.6)" : "rgba(124,58,237,0.2)"}`,
                background: ratio === r ? "rgba(124,58,237,0.18)" : "transparent",
                color: ratio === r ? "#a78bfa" : "rgba(148,163,184,0.6)",
                fontSize: "10px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {r === "any" ? "Free" : r === "square" ? "Square (1:1)" : "Banner (16:5)"}
            </button>
          ))}
        </div>
      )}

      {/* Wide (rectangle) ratio: stacked layout — preview full width, controls below */}
      {isWide ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Full-width 16:5 preview */}
          <div
            style={{
              width: "100%",
              aspectRatio: aspect,
              borderRadius: "6px",
              border: value ? "1px solid hsl(var(--border))" : "1px dashed hsl(220,15%,22%)",
              background: value ? "transparent" : "hsl(var(--background))",
              overflow: "hidden",
              position: "relative",
              cursor: !value ? "pointer" : "default",
            }}
            onClick={!value ? () => fileRef.current?.click() : undefined}
          >
            {value ? (
              <img
                src={value}
                alt="preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center center",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <ImageIcon size={22} style={{ color: "hsl(220,10%,30%)" }} />
                <span style={{ fontSize: "10px", color: "hsl(220,10%,35%)", letterSpacing: "0.04em" }}>
                  No image — click to upload
                </span>
              </div>
            )}
          </div>

          {/* URL input + buttons in a row */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <input
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
            />
            <button
              type="button"
              title="Upload image"
              disabled={uploading || deleting}
              onClick={() => fileRef.current?.click()}
              style={{
                ...btnBase,
                background: "hsl(var(--primary) / 0.12)",
                borderColor: "rgba(124,58,237,0.3)",
                color: "#a78bfa",
                opacity: uploading || deleting ? 0.7 : 1,
                cursor: uploading || deleting ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={12} />}
              {uploading ? "Uploading..." : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                title="Remove image"
                disabled={uploading || deleting}
                onClick={handleDelete}
                style={{
                  ...btnBase,
                  background: "rgba(239,68,68,0.08)",
                  borderColor: "rgba(239,68,68,0.25)",
                  color: "hsl(0,72%,60%)",
                  opacity: uploading || deleting ? 0.7 : 1,
                  cursor: uploading || deleting ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
              </button>
            )}
          </div>

          {hint && (
            <p style={{ fontSize: "10px", color: "hsl(220,10%,42%)", margin: 0 }}>
              {hint} — the preview above shows exactly what will be visible in the hero.
            </p>
          )}
        </div>
      ) : (
        /* Square / free ratio: side-by-side layout */
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          {/* Compact square preview on the left */}
          <div
            style={{
              width: "120px",
              height: aspect ? undefined : "120px",
              aspectRatio: aspect,
              flexShrink: 0,
              borderRadius: "6px",
              border: value ? "1px solid hsl(var(--border))" : "1px dashed hsl(220,15%,22%)",
              background: value ? "transparent" : "hsl(var(--background))",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {value ? (
              <img
                src={value}
                alt="preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  cursor: "pointer",
                }}
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon size={18} style={{ color: "hsl(220,10%,30%)" }} />
                <span style={{ fontSize: "9px", color: "hsl(220,10%,35%)", letterSpacing: "0.04em", textAlign: "center" }}>
                  No image
                </span>
              </div>
            )}
          </div>

          {/* Controls on the right */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
            <input
              style={{ ...inputStyle, width: "100%" }}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
            />
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                title="Upload image"
                disabled={uploading || deleting}
                onClick={() => fileRef.current?.click()}
                style={{
                  ...btnBase,
                  background: "hsl(var(--primary) / 0.12)",
                  borderColor: "rgba(124,58,237,0.3)",
                  color: "#a78bfa",
                  opacity: uploading || deleting ? 0.7 : 1,
                  cursor: uploading || deleting ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={12} />}
                {uploading ? "Uploading..." : "Upload"}
              </button>
              {value && (
                <button
                  type="button"
                  title="Remove image"
                  disabled={uploading || deleting}
                  onClick={handleDelete}
                  style={{
                    ...btnBase,
                    background: "rgba(239,68,68,0.08)",
                    borderColor: "rgba(239,68,68,0.25)",
                    color: "hsl(0,72%,60%)",
                    opacity: uploading || deleting ? 0.7 : 1,
                    cursor: uploading || deleting ? "not-allowed" : "pointer",
                  }}
                >
                  {deleting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
                </button>
              )}
            </div>
            {hint && (
              <p style={{ fontSize: "10px", color: "hsl(220,10%,42%)", margin: 0 }}>{hint}</p>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      {error && <p style={{ fontSize: "11px", color: "hsl(0,72%,55%)", margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
