import AdminLayout from "@/components/admin/AdminLayout";

const contentBlocks = [
  { id: "hero-title", section: "Homepage", label: "Hero Title", value: "Level Up Your Gaming Experience" },
  { id: "hero-subtitle", section: "Homepage", label: "Hero Subtitle", value: "Buy game credits, vouchers & subscriptions instantly" },
  { id: "about-text", section: "About Page", label: "About Description", value: "We are a premier digital marketplace for gamers worldwide..." },
  { id: "footer-copy", section: "Footer", label: "Footer Copyright", value: "© 2024 NexCoin. All rights reserved." },
  { id: "contact-email", section: "Contact", label: "Support Email", value: "support@nexcoin.gg" },
  { id: "announcement", section: "Global", label: "Announcement Banner", value: "Year-end sale! Get up to 20% off on all game credits!" },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
  padding: "14px 18px",
  marginBottom: "10px",
};

export default function EditContent() {
  return (
    <AdminLayout title="Edit Content">
      <div>
        {contentBlocks.map((block) => (
          <div key={block.id} data-testid={`card-content-${block.id}`} style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500, background: "rgba(139, 92, 246, 0.15)", color: "hsl(258, 90%, 70%)" }}>
                    {block.section}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "hsl(210, 40%, 85%)" }}>{block.label}</span>
                </div>
                <p style={{ fontSize: "12px", color: "hsl(220, 10%, 50%)" }}>{block.value}</p>
              </div>
              <button
                data-testid={`button-edit-${block.id}`}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: "hsl(220, 15%, 13%)",
                  color: "hsl(210, 40%, 78%)",
                  border: "1px solid hsl(220, 15%, 18%)",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
