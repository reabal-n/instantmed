import { ImageResponse } from "next/og"
import { type NextRequest } from "next/server"

export const runtime = "edge"

/**
 * Dynamic OG image generator for all programmatic SEO pages.
 *
 * Usage: /api/og?type=condition&title=Cold+%26+Flu&subtitle=Medical+Certificate
 *
 * Renders a branded 1200x630 image with the Morning Canvas gradient,
 * page-type icon/label, title, and optional subtitle.
 */

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  condition:      { label: "Health Condition",    icon: "🩺", color: "#3B82F6" },
  symptom:        { label: "Symptom Guide",       icon: "📋", color: "#8B5CF6" },
  medication:     { label: "Medication Info",      icon: "💊", color: "#10B981" },
  intent:         { label: "Medical Certificate",  icon: "📄", color: "#F59E0B" },
  location:       { label: "Telehealth",           icon: "📍", color: "#EF4444" },
  audience:       { label: "For You",              icon: "👤", color: "#6366F1" },
  comparison:     { label: "Compare Options",      icon: "⚖️", color: "#14B8A6" },
  certificate:    { label: "Medical Certificate",  icon: "📄", color: "#F59E0B" },
  benefit:        { label: "Benefits",             icon: "✅", color: "#22C55E" },
  resource:       { label: "Health Guide",         icon: "📖", color: "#0EA5E9" },
  "category-hub": { label: "Browse All",           icon: "🔍", color: "#7C3AED" },
  guide:          { label: "Step-by-Step Guide",   icon: "📖", color: "#0EA5E9" },
  blog:           { label: "Health Article",        icon: "📰", color: "#64748B" },
}

const DEFAULT_CONFIG = { label: "InstantMed", icon: "🏥", color: "#3B82F6" }

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get("type") || "default"
  const title = searchParams.get("title") || "InstantMed"
  const subtitle = searchParams.get("subtitle") || ""

  const config = TYPE_CONFIG[type] || DEFAULT_CONFIG

  // Clamp title for display
  const displayTitle = title.length > 60 ? title.slice(0, 57) + "..." : title

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #F8F7F4 0%, #EFF6FF 50%, #F7F3EC 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar — brand + type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "40px" }}>
          {/* Brand mark */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 24px rgba(59, 130, 246, 0.25)",
            }}
          >
            <span style={{ fontSize: "32px", fontWeight: "bold", color: "white" }}>I</span>
          </div>
          <span style={{ fontSize: "28px", fontWeight: "600", color: "#94A3B8" }}>InstantMed</span>

          {/* Type badge */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "white",
              padding: "10px 20px",
              borderRadius: "100px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <span style={{ fontSize: "20px" }}>{config.icon}</span>
            <span style={{ fontSize: "18px", fontWeight: "500", color: config.color }}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 40 ? "48px" : "56px",
            fontWeight: "700",
            color: "#1E293B",
            lineHeight: 1.2,
            marginBottom: subtitle ? "20px" : "0",
            letterSpacing: "-1px",
          }}
        >
          {displayTitle}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div style={{ fontSize: "26px", color: "#64748B", lineHeight: 1.4, maxWidth: "900px" }}>
            {subtitle.length > 100 ? subtitle.slice(0, 97) + "..." : subtitle}
          </div>
        )}

        {/* Bottom trust strip */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "auto",
            paddingTop: "40px",
          }}
        >
          {["AHPRA Registered", "100% Online", "Australian Doctors"].map((badge) => (
            <div
              key={badge}
              style={{
                background: "white",
                padding: "10px 20px",
                borderRadius: "100px",
                fontSize: "16px",
                fontWeight: "500",
                color: "#3B82F6",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
