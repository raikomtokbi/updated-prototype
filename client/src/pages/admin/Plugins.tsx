import { useRef, useState } from "react";
import { UploadCloud, FileArchive, CheckCircle } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { card } from "@/components/admin/shared";

export default function Plugins() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "done">("idle");

  function handleFile(file: File | null) {
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setFileName(null);
      setStatus("idle");
      alert("Please upload a .zip plugin file.");
      return;
    }
    setFileName(file.name);
    setStatus("ready");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleInstall() {
    setStatus("done");
    setTimeout(() => setStatus("idle"), 3000);
    setFileName(null);
  }

  return (
    <AdminLayout title="Plugins">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "560px" }}>

        <div style={{ fontSize: "13px", color: "hsl(220,10%,45%)", lineHeight: 1.6 }}>
          Upload a plugin package to extend platform functionality. Full plugin support is coming soon.
        </div>

        <div style={card}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Upload Plugin</span>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "4px 0 0" }}>
              Accepted format: <code style={{ fontFamily: "monospace", color: "#a78bfa" }}>.zip</code>
            </p>
          </div>

          <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                width: "100%",
                border: `2px dashed ${dragOver ? "hsl(258,90%,66%)" : "hsl(220,15%,22%)"}`,
                borderRadius: "10px",
                padding: "40px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                background: dragOver ? "rgba(124,58,237,0.05)" : "transparent",
                transition: "border-color 0.15s, background 0.15s",
                boxSizing: "border-box",
              }}
            >
              {fileName ? (
                <>
                  <FileArchive size={36} color="#a78bfa" />
                  <span style={{ fontSize: "13px", color: "hsl(210,40%,85%)", fontWeight: 600 }}>{fileName}</span>
                  <span style={{ fontSize: "11px", color: "hsl(220,10%,42%)" }}>Ready to install</span>
                </>
              ) : (
                <>
                  <UploadCloud size={36} color="hsl(220,10%,35%)" />
                  <span style={{ fontSize: "13px", color: "hsl(210,40%,75%)", fontWeight: 500 }}>
                    Drag & drop your plugin here
                  </span>
                  <span style={{ fontSize: "11px", color: "hsl(220,10%,40%)" }}>or click to browse</span>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={handleChange}
            />

            {/* Browse button */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "7px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white",
                border: "none", cursor: "pointer",
              }}
            >
              <UploadCloud size={13} /> Browse File
            </button>

            {/* Install button shown only when a file is selected */}
            {status === "ready" && (
              <button
                type="button"
                onClick={handleInstall}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "7px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                  background: "rgba(74,222,128,0.12)", color: "hsl(142,71%,48%)",
                  border: "1px solid rgba(74,222,128,0.25)", cursor: "pointer",
                }}
              >
                Install Plugin
              </button>
            )}

            {/* Success status */}
            {status === "done" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "hsl(142,71%,48%)" }}>
                <CheckCircle size={14} /> Plugin queued — full installation support coming soon.
              </div>
            )}

            <p style={{ fontSize: "11px", color: "hsl(220,10%,35%)", margin: 0, textAlign: "center", lineHeight: 1.6 }}>
              Plugin installation is under development. Stay tuned for updates.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
