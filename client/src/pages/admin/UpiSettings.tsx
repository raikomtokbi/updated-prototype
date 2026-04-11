import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Eye, EyeOff, Info, CheckCircle, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { btnPrimary } from "@/components/admin/shared";

interface UpiSettingsData {
  id?: string;
  upiId?: string;
  qrCodeUrl?: string;
  emailAddress?: string;
  emailPassword?: string;
  imapHost?: string;
  imapPort?: number;
  imapLabel?: string;
  isActive?: boolean;
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid hsl(220,15%,20%)",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const label: React.CSSProperties = {
  fontSize: "12px",
  color: "hsl(var(--muted-foreground))",
  marginBottom: "4px",
  display: "block",
};

const section: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  padding: "1.25rem",
  marginBottom: "1rem",
};

const row: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  flexWrap: "wrap",
};

export default function UpiSettings() {
  const [form, setForm] = useState<UpiSettingsData>({
    upiId: "",
    emailAddress: "",
    emailPassword: "",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapLabel: "INBOX",
    isActive: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  const { isLoading, data: loadedSettings } = useQuery<UpiSettingsData | null>({
    queryKey: ["/api/admin/upi-settings"],
  });

  useEffect(() => {
    if (loadedSettings) {
      setForm({
        upiId: loadedSettings.upiId || "",
        emailAddress: loadedSettings.emailAddress || "",
        emailPassword: loadedSettings.emailPassword || "",
        imapHost: loadedSettings.imapHost || "imap.gmail.com",
        imapPort: loadedSettings.imapPort ?? 993,
        imapLabel: loadedSettings.imapLabel || "INBOX",
        isActive: loadedSettings.isActive ?? false,
      });
    }
  }, [loadedSettings]);

  const saveMutation = useMutation({
    mutationFn: (data: UpiSettingsData) =>
      apiRequest("POST", "/api/admin/upi-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/upi-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function set(field: keyof UpiSettingsData, value: any) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleSave() {
    saveMutation.mutate(form);
  }

  const upiQrValue = form.upiId
    ? `upi://pay?pa=${encodeURIComponent(form.upiId)}&pn=Nexcoin`
    : "";

  return (
    <div style={{ padding: "1.5rem", maxWidth: "760px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>
          UPI / Manual Payment Settings
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "13px", marginTop: "4px" }}>
          Configure UPI payment method and email-based auto-verification
        </p>
      </div>

      {isLoading ? (
        <div style={{ color: "hsl(var(--muted-foreground))", padding: "2rem", textAlign: "center" }}>Loading...</div>
      ) : (
        <>
          {/* Status toggle */}
          <div style={{ ...section, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "hsl(var(--foreground))" }}>UPI Payment Status</div>
              <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>
                When enabled, customers can pay via UPI and payment is verified automatically via email
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {form.isActive ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "13px", color: "#22c55e" }}>
                  <CheckCircle size={14} /> Active
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
                  <XCircle size={14} /> Inactive
                </span>
              )}
              <button
                onClick={() => set("isActive", !form.isActive)}
                style={{
                  width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer",
                  background: form.isActive ? "hsl(258,90%,60%)" : "hsl(220,15%,22%)",
                  position: "relative", transition: "background 0.2s",
                }}
                data-testid="toggle-upi-active"
              >
                <div style={{
                  position: "absolute", top: "3px",
                  left: form.isActive ? "22px" : "3px",
                  width: "18px", height: "18px", borderRadius: "50%",
                  background: "#fff", transition: "left 0.2s",
                }} />
              </button>
            </div>
          </div>

          {/* UPI details */}
          <div style={section}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))", marginTop: 0, marginBottom: "1rem" }}>
              UPI Payment Details
            </h3>

            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* Left: UPI ID input */}
              <div style={{ flex: 1, minWidth: "220px" }}>
                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={label}>UPI ID *</label>
                  <input
                    type="text"
                    style={inp}
                    value={form.upiId || ""}
                    onChange={e => set("upiId", e.target.value)}
                    placeholder="e.g. yourname@upi or 9876543210@paytm"
                    data-testid="input-upi-id"
                  />
                  <div style={{ fontSize: "11px", color: "hsl(220,10%,40%)", marginTop: "3px" }}>
                    This UPI ID will be shown to customers at checkout. A QR code is auto-generated from this value.
                  </div>
                </div>
              </div>

              {/* Right: Live QR preview */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  QR Preview
                </span>
                {upiQrValue ? (
                  <div style={{ background: "#fff", borderRadius: "0.5rem", padding: "10px", display: "inline-block" }}>
                    <QRCodeSVG
                      value={upiQrValue}
                      size={140}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                    />
                  </div>
                ) : (
                  <div style={{
                    width: "160px", height: "160px", borderRadius: "0.5rem",
                    border: "1px dashed hsl(220,15%,22%)", background: "hsl(var(--card))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: "11px", color: "hsl(220,10%,40%)", textAlign: "center", padding: "0.5rem" }}>
                      Enter UPI ID to preview QR code
                    </span>
                  </div>
                )}
                {upiQrValue && (
                  <span style={{ fontSize: "10px", color: "hsl(220,10%,40%)", textAlign: "center", maxWidth: "160px" }}>
                    Customers will scan this at checkout
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* IMAP settings */}
          <div style={section}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))", marginTop: 0, marginBottom: "0.5rem" }}>
              Email Auto-Verification (IMAP)
            </h3>
            <div style={{ background: "hsl(220,20%,13%)", borderRadius: "0.5rem", padding: "0.65rem 0.85rem", marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <Info size={14} style={{ color: "hsl(258,90%,68%)", flexShrink: 0, marginTop: "1px" }} />
              <p style={{ margin: 0, fontSize: "12px", color: "hsl(var(--muted-foreground))", lineHeight: 1.6 }}>
                Configure IMAP access to the email account where you receive UPI payment notifications. 
                The system will check for new payment emails every 60 seconds and auto-complete matching orders.
                For Gmail, use an <strong style={{ color: "hsl(var(--foreground))" }}>App Password</strong> (not your regular password) 
                with host <code style={{ color: "hsl(258,90%,72%)" }}>imap.gmail.com</code> port <code style={{ color: "hsl(258,90%,72%)" }}>993</code>.
              </p>
            </div>

            <div style={{ marginBottom: "0.85rem" }}>
              <label style={label}>Email Address</label>
              <input
                type="email"
                style={inp}
                value={form.emailAddress || ""}
                onChange={e => set("emailAddress", e.target.value)}
                placeholder="your-upi-email@gmail.com"
                data-testid="input-email-address"
              />
            </div>

            <div style={{ marginBottom: "0.85rem", position: "relative" }}>
              <label style={label}>Email Password / App Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  style={{ ...inp, paddingRight: "2.5rem" }}
                  value={form.emailPassword || ""}
                  onChange={e => set("emailPassword", e.target.value)}
                  placeholder="Gmail App Password (16 characters)"
                  data-testid="input-email-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 0 }}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div style={row}>
              <div style={{ flex: 2, minWidth: "180px" }}>
                <label style={label}>IMAP Host</label>
                <input
                  type="text"
                  style={inp}
                  value={form.imapHost || "imap.gmail.com"}
                  onChange={e => set("imapHost", e.target.value)}
                  placeholder="imap.gmail.com"
                  data-testid="input-imap-host"
                />
              </div>
              <div style={{ flex: 1, minWidth: "100px" }}>
                <label style={label}>IMAP Port</label>
                <input
                  type="number"
                  style={inp}
                  value={form.imapPort ?? 993}
                  onChange={e => set("imapPort", parseInt(e.target.value) || 993)}
                  placeholder="993"
                  data-testid="input-imap-port"
                />
              </div>
            </div>

            <div style={{ marginTop: "0.85rem" }}>
              <label style={label}>Mailbox / Label</label>
              <input
                type="text"
                style={inp}
                value={form.imapLabel || "INBOX"}
                onChange={e => set("imapLabel", e.target.value)}
                placeholder="INBOX"
                data-testid="input-imap-label"
              />
              <div style={{ fontSize: "11px", color: "hsl(220,10%,40%)", marginTop: "3px" }}>
                The mailbox or Gmail label to read payment emails from. Use <code style={{ color: "hsl(258,90%,72%)" }}>INBOX</code> for the default inbox, or a label name like <code style={{ color: "hsl(258,90%,72%)" }}>Payments</code>. For nested Gmail labels use <code style={{ color: "hsl(258,90%,72%)" }}>Parent/Child</code>.
              </div>
            </div>
          </div>

          {/* Save */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              style={btnPrimary}
              data-testid="button-save-upi-settings"
            >
              <Save size={15} />
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </button>
            {saved && (
              <span style={{ fontSize: "13px", color: "#22c55e", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <CheckCircle size={14} /> Settings saved!
              </span>
            )}
            {saveMutation.isError && (
              <span style={{ fontSize: "13px", color: "#ef4444" }}>Failed to save settings</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
