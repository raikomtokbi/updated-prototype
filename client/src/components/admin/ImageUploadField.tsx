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

  const previewAspect =
    ratio === "square" ? "1 / 1" : ratio === "rectangle" ? "16 / 5" : undefined;

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

  const placeholderH = previewAspect ? undefined : "72px";

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
              {r === "any" ? "Free" : r === "square" ? "Square (1:1)" : "Rectangle (16:5)"}
            </button>
          ))}
        </div>
      )}

      {/* Horizontal layout: Preview on left, controls on right */}
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        {/* Preview area — compact on the left */}
        <div
          style={{
            width: "120px",
            height: "120px",
            flexShrink: 0,
            borderRadius: "6px",
            border: value ? "1px solid hsl(220,15%,16%)" : "1px dashed hsl(220,15%,22%)",
            background: value ? "transparent" : "hsl(220,20%,8%)",
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
                background: "rgba(124,58,237,0.12)",
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
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </div>
      {error && <p style={{ fontSize: "11px", color: "hsl(0,72%,55%)", margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
