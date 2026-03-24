import { ImageResponse } from "next/og"

export const ogSize = { width: 1200, height: 630 }
export const ogContentType = "image/png"

interface SEOPageOGProps {
  title: string
  subtitle?: string
  category: string
  categoryColor?: string
}

/**
 * Shared OG image generator for programmatic SEO pages
 * (conditions, symptoms, medications, guides, etc.)
 */
export function generateSEOPageOG({
  title,
  subtitle,
  category,
  categoryColor = "#3B82F6",
}: SEOPageOGProps) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #FAFBFC 0%, #EFF6FF 50%, #F0FDF4 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "60px 80px",
        }}
      >
        {/* Top: category badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              background: categoryColor,
              color: "#fff",
              padding: "6px 18px",
              borderRadius: "999px",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            {category}
          </div>
        </div>

        {/* Middle: title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: title.length > 50 ? "44px" : "56px",
              fontWeight: 800,
              color: "#0F172A",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: "22px",
                color: "#6B7280",
                maxWidth: "700px",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom: branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #3B82F6, #22C55E)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "20px",
                fontWeight: 800,
              }}
            >
              iM
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A" }}>
              InstantMed
            </div>
          </div>
          <div style={{ fontSize: "16px", color: "#9CA3AF" }}>
            Doctor-reviewed · instantmed.com.au
          </div>
        </div>
      </div>
    ),
    { ...ogSize },
  )
}
