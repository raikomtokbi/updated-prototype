import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuthStore } from "@/lib/store/authstore";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Check, Eye, EyeOff, Lock, User, ChevronDown, ChevronUp, Settings } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "hsl(0,72%,65%)" },
  admin:       { label: "Admin",       color: "hsl(var(--primary))" },
  staff:       { label: "Staff",       color: "hsl(196,100%,55%)" },
  user:        { label: "Member",      color: "hsl(145,70%,55%)" },
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
  borderRadius: "6px", padding: "8px 10px", fontSize: "12px",
  color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600,
  color: "hsl(var(--muted-foreground))", marginBottom: "5px",
};

const sectionCard: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
  overflow: "hidden",
};

function passwordStrength(pw: string) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "hsl(0,72%,60%)", width: "25%" };
  if (score <= 3) return { label: "Fair", color: "hsl(38,92%,55%)", width: "55%" };
  return { label: "Strong", color: "hsl(145,70%,55%)", width: "100%" };
}

export default function AdminProfile() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Edit Profile ────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || "Failed to update"); }
      return res.json();
    },
    onSuccess: (data) => {
      setUser({ ...user!, ...data.user });
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  // ── Change Password ─────────────────────────────────────────────────────────
  const [showChangePw, setShowChangePw] = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const strength = passwordStrength(pwForm.newPassword);

  const changePwMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/user/change-password", data);
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowChangePw(false);
      toast({ title: "Password changed", description: "Your password has been updated." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (!user) return null;

  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: "hsl(var(--muted-foreground))" };
  const initials = (user.fullName || user.username).slice(0, 2).toUpperCase();

  return (
    <AdminLayout title="My Profile">
      <div style={{ maxWidth: "640px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* ── Profile Overview Card ─────────────────────────────────────── */}
        <div style={sectionCard}>
          <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%", flexShrink: 0,
              background: "hsl(var(--primary))", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", fontWeight: 700, color: "hsl(var(--primary-foreground))",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "hsl(var(--foreground))", lineHeight: 1.3 }}>
                {user.fullName || user.username}
              </div>
              <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>@{user.username}</div>
              <div style={{ marginTop: "6px" }}>
                <span style={{
                  fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                  color: roleInfo.color, background: `${roleInfo.color}22`,
                  border: `1px solid ${roleInfo.color}44`,
                  borderRadius: "4px", padding: "2px 8px",
                }}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setEditing((v) => !v); if (!editing) setProfileForm({ fullName: user.fullName ?? "", email: user.email ?? "" }); }}
              data-testid="button-edit-profile"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px", color: "hsl(var(--foreground))", cursor: "pointer", flexShrink: 0 }}
            >
              <Settings size={12} />
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {/* Edit form */}
          {editing && (
            <div style={{ borderTop: "1px solid hsl(var(--border))", padding: "20px", display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="Your full name"
                    data-testid="input-full-name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    data-testid="input-email"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => updateMutation.mutate(profileForm)}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-profile"
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: updateMutation.isPending ? "not-allowed" : "pointer", opacity: updateMutation.isPending ? 0.7 : 1 }}
                >
                  {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save Changes
                </button>
                <button onClick={() => setEditing(false)} style={{ padding: "7px 12px", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px", color: "hsl(var(--muted-foreground))", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Read-only fields */}
          {!editing && (
            <div style={{ borderTop: "1px solid hsl(var(--border))" }}>
              {[
                { label: "Member ID", value: `#${user.id}`, mono: true },
                { label: "Username", value: user.username },
                { label: "Full Name", value: user.fullName || "—" },
                { label: "Email Address", value: user.email || "—" },
                { label: "Role", value: roleInfo.label },
              ].map(({ label, value, mono }, i, arr) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 20px", gap: "12px", flexWrap: "wrap",
                  borderBottom: i < arr.length - 1 ? "1px solid hsl(var(--border))" : "none",
                }}>
                  <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", minWidth: "110px" }}>{label}</span>
                  <span style={{
                    fontSize: mono ? "11px" : "12px", fontWeight: 500,
                    color: mono ? "hsl(196,100%,60%)" : "hsl(var(--foreground))",
                    fontFamily: mono ? "monospace" : "inherit",
                    background: mono ? "hsla(196,100%,50%,0.08)" : "transparent",
                    border: mono ? "1px solid hsla(196,100%,50%,0.2)" : "none",
                    borderRadius: mono ? "4px" : "0", padding: mono ? "1px 6px" : "0",
                    wordBreak: "break-all",
                  }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Change Password Card ──────────────────────────────────────── */}
        <div style={sectionCard}>
          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => setShowChangePw((v) => !v)}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Lock size={14} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Change Password</div>
                <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>Update your admin account password</div>
              </div>
            </div>
            <button
              data-testid="button-change-password-toggle"
              style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: "4px", display: "flex" }}
            >
              {showChangePw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showChangePw && (
            <div style={{ borderTop: "1px solid hsl(var(--border))", padding: "20px", display: "grid", gap: "12px" }}>
              {/* Current password */}
              <div>
                <label style={labelStyle}>Current Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showCur ? "text" : "password"} value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    placeholder="Enter current password" required autoComplete="current-password"
                    data-testid="input-current-password"
                    style={{ ...inputStyle, paddingRight: "2.5rem" }}
                  />
                  <button type="button" onClick={() => setShowCur((v) => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 0, display: "flex" }}>
                    {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label style={labelStyle}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showNew ? "text" : "password"} value={pwForm.newPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Enter new password" required autoComplete="new-password"
                    data-testid="input-new-password"
                    style={{ ...inputStyle, paddingRight: "2.5rem" }}
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 0, display: "flex" }}>
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {strength && (
                  <div style={{ marginTop: "6px" }}>
                    <div style={{ height: "3px", background: "hsl(var(--border))", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: strength.width, background: strength.color, transition: "width 0.3s", borderRadius: "99px" }} />
                    </div>
                    <span style={{ fontSize: "10px", color: strength.color, marginTop: "3px", display: "block" }}>Strength: {strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showConf ? "text" : "password"} value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password" required autoComplete="new-password"
                    data-testid="input-confirm-password"
                    style={{ ...inputStyle, paddingRight: "2.5rem", borderColor: pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? "hsla(0,72%,55%,0.5)" : "hsl(var(--border))" }}
                  />
                  <button type="button" onClick={() => setShowConf((v) => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 0, display: "flex" }}>
                    {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                  <span style={{ fontSize: "11px", color: "hsl(0,72%,60%)", marginTop: "3px", display: "block" }}>Passwords do not match</span>
                )}
              </div>

              {/* Requirements */}
              <div style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>Requirements</div>
                {[
                  { label: "At least 8 characters", met: pwForm.newPassword.length >= 8 },
                  { label: "One uppercase letter", met: /[A-Z]/.test(pwForm.newPassword) },
                  { label: "One number", met: /[0-9]/.test(pwForm.newPassword) },
                  { label: "One special character", met: /[^A-Za-z0-9]/.test(pwForm.newPassword) },
                ].map(({ label, met }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ color: met ? "hsl(145,70%,55%)" : "hsl(var(--muted-foreground))", fontSize: "12px", fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>{met ? "✓" : "·"}</span>
                    <span style={{ fontSize: "11px", color: met ? "hsl(145,70%,55%)" : "hsl(var(--muted-foreground))" }}>{label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => changePwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })}
                  disabled={changePwMutation.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword}
                  data-testid="button-change-password"
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: changePwMutation.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword ? "not-allowed" : "pointer", opacity: changePwMutation.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword ? 0.55 : 1 }}
                >
                  {changePwMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                  Update Password
                </button>
                <button onClick={() => { setShowChangePw(false); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }} style={{ padding: "7px 12px", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px", color: "hsl(var(--muted-foreground))", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
