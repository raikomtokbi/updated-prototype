import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Campaign } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnPrimary, btnEdit, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar, Modal,
  inputStyle as sharedInput,
} from "@/components/admin/shared";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "banner", label: "Banner" },
  { value: "email", label: "Email" },
  { value: "discount", label: "Discount" },
  { value: "referral", label: "Referral" },
  { value: "loyalty", label: "Loyalty" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const inputStyle: React.CSSProperties = { ...sharedInput, padding: "7px 10px", fontSize: "13px" };
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "4px",
  display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};

function CampaignForm({ initial, onSubmit, loading }: { initial: Partial<Campaign>; onSubmit: (d: any) => void; loading: boolean }) {
  const isMobile = useMobile(768);
  const toInput = (d: Date | string | null | undefined) => {
    if (!d) return "";
    return new Date(d).toISOString().slice(0, 16);
  };
  const [form, setForm] = useState({
    name: initial.name ?? "",
    description: initial.description ?? "",
    type: initial.type ?? "banner",
    isActive: initial.isActive !== false,
    startsAt: toInput(initial.startsAt),
    endsAt: toInput(initial.endsAt),
    bannerUrl: initial.bannerUrl ?? "",
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ ...form, startsAt: form.startsAt || null, endsAt: form.endsAt || null });
    }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div>
        <label style={labelStyle}>Campaign Name *</label>
        <input style={inputStyle} required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Year End Sale" />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, resize: "none", minHeight: "120px" } as any} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Campaign details..." />
      </div>
      <ImageUploadField
        label="Banner Image"
        value={form.bannerUrl}
        onChange={(url) => set("bannerUrl", url)}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        ratio="rectangle"
        showRatioSelector={false}
      />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="banner">Banner</option>
            <option value="email">Email</option>
            <option value="discount">Discount</option>
            <option value="referral">Referral</option>
            <option value="loyalty">Loyalty</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.isActive ? "active" : "inactive"} onChange={(e) => set("isActive", e.target.value === "active")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input style={inputStyle} type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <input style={inputStyle} type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </div>
      </div>
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={loading}>
        {loading ? "Saving..." : "Save Campaign"}
      </button>
    </form>
  );
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Campaigns() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Campaign | null>(null);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/admin/campaigns"],
    queryFn: () => adminApi.get("/campaigns"),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/campaigns", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/campaigns"] }); setShowAdd(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/campaigns/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/campaigns"] }); setEditItem(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/campaigns"] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.patch(`/campaigns/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/campaigns"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return campaigns.filter((c) => {
      const matchSearch = !q || c.name.toLowerCase().includes(q);
      const matchType = !typeFilter || c.type === typeFilter;
      const matchStatus = !statusFilter || (statusFilter === "active" ? c.isActive : !c.isActive);
      return matchSearch && matchType && matchStatus;
    });
  }, [campaigns, search, typeFilter, statusFilter]);

  const { data: settings = {}, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => adminApi.get("/settings"),
  });

  const [announcementText, setAnnouncementText] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [bonusBadgeText, setBonusBadgeText] = useState("");
  const [bonusPercent, setBonusPercent] = useState("");
  const [bonusMainTitle, setBonusMainTitle] = useState("");
  const [bonusMainSuffix, setBonusMainSuffix] = useState("");
  const [bonusButtonText, setBonusButtonText] = useState("");
  const [bonusDescription, setBonusDescription] = useState("");

  const saveAnnouncement = useMutation({
    mutationFn: (data: any) => adminApi.put("/settings", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/settings"] }); },
  });

  return (
    <AdminLayout title="Campaigns" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={14} /> New Campaign</button>
    }>

      {/* ── Announcement Banner ────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220,15%,18%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,50%)", marginBottom: "8px", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Homepage Announcement Banner</label>
            <input
              data-testid="input-announcement-text"
              style={{ ...sharedInput, padding: "8px 12px", fontSize: "13px", width: "100%" }}
              value={announcementText || (settings.announcement_text ?? "")}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Announcement banner text…"
            />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              data-testid="toggle-announcement"
              onClick={() => setAnnouncementEnabled(!announcementEnabled)}
              style={{
                fontSize: "11px",
                padding: "6px 14px",
                borderRadius: "4px",
                background: announcementEnabled || settings.announcement_enabled === "true" ? "rgba(139, 92, 246, 0.15)" : "hsl(220, 15%, 13%)",
                color: announcementEnabled || settings.announcement_enabled === "true" ? "hsl(258, 90%, 70%)" : "hsl(220, 10%, 50%)",
                border: "1px solid hsl(220, 15%, 20%)",
                cursor: "pointer",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {announcementEnabled || settings.announcement_enabled === "true" ? "Enabled" : "Disabled"}
            </button>
            <button
              onClick={() => {
                saveAnnouncement.mutate({
                  announcement_text: announcementText || settings.announcement_text,
                  announcement_enabled: (announcementEnabled || settings.announcement_enabled === "true").toString(),
                });
              }}
              disabled={saveAnnouncement.isPending}
              style={{ ...btnPrimary, padding: "6px 14px", fontSize: "11px" }}
            >
              {saveAnnouncement.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bonus Banner ──────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ borderBottom: "1px solid hsl(220,15%,18%)", paddingBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210, 40%, 85%)" }}>Bonus Banner</label>
            <p style={{ fontSize: "11px", color: "hsl(220, 10%, 50%)", margin: "4px 0 0" }}>
              Edit the "Get X% Bonus Credits" banner displayed below Trending Now
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Badge Text</label>
              <input
                data-testid="input-bonus-badge"
                style={inputStyle}
                value={bonusBadgeText || (settings.bonus_badge_text ?? "")}
                onChange={(e) => { setBonusBadgeText(e.target.value); saveAnnouncement.mutate({ bonus_badge_text: e.target.value }); }}
                placeholder="WEEKEND SPECIAL"
              />
            </div>
            <div>
              <label style={labelStyle}>Bonus Percent</label>
              <input
                data-testid="input-bonus-percent"
                style={inputStyle}
                value={bonusPercent || (settings.bonus_percent ?? "")}
                onChange={(e) => { setBonusPercent(e.target.value); saveAnnouncement.mutate({ bonus_percent: e.target.value }); }}
                placeholder="20%"
              />
            </div>
            <div>
              <label style={labelStyle}>Main Title</label>
              <input
                data-testid="input-bonus-title"
                style={inputStyle}
                value={bonusMainTitle || (settings.bonus_main_title ?? "")}
                onChange={(e) => { setBonusMainTitle(e.target.value); saveAnnouncement.mutate({ bonus_main_title: e.target.value }); }}
                placeholder="GET"
              />
            </div>
            <div>
              <label style={labelStyle}>Title Suffix</label>
              <input
                data-testid="input-bonus-suffix"
                style={inputStyle}
                value={bonusMainSuffix || (settings.bonus_main_suffix ?? "")}
                onChange={(e) => { setBonusMainSuffix(e.target.value); saveAnnouncement.mutate({ bonus_main_suffix: e.target.value }); }}
                placeholder="CREDITS"
              />
            </div>
            <div>
              <label style={labelStyle}>Button Text</label>
              <input
                data-testid="input-bonus-button"
                style={inputStyle}
                value={bonusButtonText || (settings.bonus_button_text ?? "")}
                onChange={(e) => { setBonusButtonText(e.target.value); saveAnnouncement.mutate({ bonus_button_text: e.target.value }); }}
                placeholder="Claim Now"
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              data-testid="input-bonus-desc"
              style={{ ...sharedInput, padding: "8px 10px", fontSize: "13px", minHeight: "60px" }}
              value={bonusDescription || (settings.bonus_description ?? "")}
              onChange={(e) => { setBonusDescription(e.target.value); saveAnnouncement.mutate({ bonus_description: e.target.value }); }}
              placeholder="Top up using any supported payment method this weekend and receive bonus credits on all top-ups. Offer ends Sunday."
            />
          </div>
        </div>
      </div>

      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search campaign name..." />
          <FilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} campaign{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading campaigns...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={campaigns.length === 0 ? "No campaigns yet. Create your first campaign." : "No campaigns match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Name", "Type", "Start", "End", "Status", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{c.name}</td>
                    <td style={tdStyle}><StatusBadge value={c.type} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(c.startsAt)}</td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(c.endsAt)}</td>
                    <td style={tdStyle}><StatusBadge value={c.isActive ? "active" : "inactive"} /></td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button style={btnEdit} onClick={() => setEditItem(c)}><Pencil size={11} /> Edit</button>
                        <button
                          style={c.isActive ? btnDanger : { ...btnDanger, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "hsl(142,71%,48%)" }}
                          onClick={() => toggleMut.mutate({ id: c.id, isActive: !c.isActive })}
                          disabled={toggleMut.isPending}
                        >
                          {c.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button style={btnDanger} onClick={() => { if (confirm(`Delete "${c.name}"?`)) delMut.mutate(c.id); }}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && <Modal title="New Campaign" onClose={() => setShowAdd(false)}><CampaignForm initial={{}} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} /></Modal>}
      {editItem && <Modal title="Edit Campaign" onClose={() => setEditItem(null)}><CampaignForm initial={editItem} onSubmit={(d) => editMut.mutate({ id: editItem.id, data: d })} loading={editMut.isPending} /></Modal>}
    </AdminLayout>
  );
}
