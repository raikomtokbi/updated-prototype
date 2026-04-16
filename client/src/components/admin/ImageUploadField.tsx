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
  const [dragOver, setDragOver] = useState(false);

  const { aspect, hint } = RATIO_META[ratio];
  const isWide = ratio === "rectangle";

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please drop an image file");
      return;
    }
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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

  const dragBorder = dragOver
    ? "2px dashed hsl(var(--primary) / 0.7)"
    : value
      ? "1px solid hsl(var(--border))"
      : "1px dashed hsl(220,15%,22%)";

  const dragBg = dragOver ? "hsl(var(--primary) / 0.07)" : value ? "transparent" : "hsl(var(--background))";

  const dropHandlers = {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
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
                border: `1px solid ${ratio === r ? "hsl(var(--primary) / 0.6)" : "hsl(var(--primary) / 0.2)"}`,
                background: ratio === r ? "hsl(var(--primary) / 0.18)" : "transparent",
                color: ratio === r ? "hsl(var(--primary))" : "rgba(148,163,184,0.6)",
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

      {/* Wide (rectangle) ratio: stacked layout */}
      {isWide ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            {...dropHandlers}
            style={{
              width: "100%",
              aspectRatio: aspect,
              borderRadius: "6px",
              border: dragBorder,
              background: dragBg,
              overflow: "hidden",
              position: "relative",
              cursor: !value ? "pointer" : "default",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onClick={!value ? () => fileRef.current?.click() : undefined}
          >
            {value ? (
              <img
                src={value}
                alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", pointerEvents: "none" }}>
                <ImageIcon size={22} style={{ color: dragOver ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                <span style={{ fontSize: "10px", color: dragOver ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", letterSpacing: "0.04em" }}>
                  {dragOver ? "Drop to upload" : "Click or drag & drop to upload"}
                </span>
              </div>
            )}
            {/* Drag overlay on top of existing image */}
            {dragOver && value && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", background: "hsl(var(--primary) / 0.25)", backdropFilter: "blur(2px)", pointerEvents: "none" }}>
                <Upload size={24} style={{ color: "white" }} />
                <span style={{ fontSize: "11px", color: "white", fontWeight: 600 }}>Drop to replace</span>
              </div>
            )}
          </div>

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
                borderColor: "hsl(var(--primary) / 0.3)",
                color: "hsl(var(--primary))",
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
            <p style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", margin: 0 }}>
              {hint} — the preview above shows exactly what will be visible in the hero.
            </p>
          )}
        </div>
      ) : (
        /* Square / free ratio: side-by-side layout */
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          {/* Compact square preview on the left — full drop zone */}
          <div
            {...dropHandlers}
            onClick={() => fileRef.current?.click()}
            style={{
              width: "120px",
              height: aspect ? undefined : "120px",
              aspectRatio: aspect,
              flexShrink: 0,
              borderRadius: "6px",
              border: dragBorder,
              background: dragBg,
              overflow: "hidden",
              position: "relative",
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            {value ? (
              <img
                src={value}
                alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", pointerEvents: "none" }}>
                <ImageIcon size={18} style={{ color: dragOver ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                <span style={{ fontSize: "9px", color: dragOver ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", letterSpacing: "0.04em", textAlign: "center" }}>
                  {dragOver ? "Drop" : "No image"}
                </span>
              </div>
            )}
            {dragOver && value && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--primary) / 0.3)", backdropFilter: "blur(2px)", pointerEvents: "none" }}>
                <Upload size={18} style={{ color: "white" }} />
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
                  borderColor: "hsl(var(--primary) / 0.3)",
                  color: "hsl(var(--primary))",
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
              <p style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", margin: 0 }}>{hint}</p>
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
