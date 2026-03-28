import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = "https://...",
  inputStyle,
  labelStyle,
}: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          title="Upload image"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "6px",
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.3)",
            color: "#a78bfa",
            fontSize: "11px",
            fontWeight: 600,
            cursor: uploading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            opacity: uploading ? 0.7 : 1,
          }}
        >
          {uploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={12} />}
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </div>
      {error && <p style={{ fontSize: "11px", color: "hsl(0,72%,55%)", margin: "3px 0 0" }}>{error}</p>}
      {value && value.startsWith("/uploads/") && (
        <img
          src={value}
          alt="preview"
          style={{ marginTop: "6px", height: "40px", borderRadius: "4px", border: "1px solid hsl(220,15%,16%)", objectFit: "cover" }}
        />
      )}
    </div>
  );
}
