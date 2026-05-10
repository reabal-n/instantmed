/* eslint-disable @next/next/no-img-element */
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
  condition:      { label: "Health Condition",    icon: "H", color: "#3B82F6" },
  symptom:        { label: "Symptom Guide",       icon: "S", color: "#8B5CF6" },
  medication:     { label: "Medication Info",      icon: "Rx", color: "#10B981" },
  intent:         { label: "Medical Certificate",  icon: "MC", color: "#F59E0B" },
  location:       { label: "Telehealth",           icon: "AU", color: "#EF4444" },
  audience:       { label: "For You",              icon: "P", color: "#6366F1" },
  comparison:     { label: "Compare Options",      icon: "VS", color: "#14B8A6" },
  certificate:    { label: "Medical Certificate",  icon: "MC", color: "#F59E0B" },
  benefit:        { label: "Benefits",             icon: "+", color: "#22C55E" },
  resource:       { label: "Health Guide",         icon: "G", color: "#0EA5E9" },
  "category-hub": { label: "Browse All",           icon: "All", color: "#7C3AED" },
  guide:          { label: "Step-by-Step Guide",   icon: "G", color: "#0EA5E9" },
  blog:           { label: "Health Article",        icon: "G", color: "#64748B" },
}

const DEFAULT_CONFIG = { label: "InstantMed", icon: "IM", color: "#3B82F6" }

function resolveSafeImageUrl(image: string | null, origin: string) {
  if (!image) return null

  if (image.startsWith("/")) {
    return `${origin}${image}`
  }

  try {
    const parsed = new URL(image)
    const allowedHost =
      parsed.hostname === "instantmed.com.au" ||
      parsed.hostname === "www.instantmed.com.au" ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".vercel.app")

    return allowedHost ? parsed.toString() : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get("type") || "default"
  const title = searchParams.get("title") || "InstantMed"
  const subtitle = searchParams.get("subtitle") || ""
  const imageUrl = resolveSafeImageUrl(searchParams.get("image"), request.nextUrl.origin)

  const config = TYPE_CONFIG[type] || DEFAULT_CONFIG

  // Clamp title for display
  const displayTitle = title.length > 60 ? title.slice(0, 57) + "..." : title
  const displaySubtitle = subtitle.length > 100 ? subtitle.slice(0, 97) + "..." : subtitle

  if (type === "blog" && imageUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            padding: "48px",
            background: "linear-gradient(135deg, #F8F7F4 0%, #EFF6FF 58%, #F7F3EC 100%)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              height: "100%",
              width: "100%",
              overflow: "hidden",
              borderRadius: "28px",
              border: "1px solid rgba(59, 130, 246, 0.18)",
              background: "rgba(255, 255, 255, 0.92)",
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.12)",
            }}
          >
            <div
              style={{
                width: "54%",
                display: "flex",
                flexDirection: "column",
                padding: "44px 42px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 24px rgba(59, 130, 246, 0.22)",
                  }}
                >
                  <span style={{ fontSize: "28px", fontWeight: "bold", color: "white" }}>I</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "25px", fontWeight: "700", color: "#1E293B" }}>InstantMed</span>
                  <span style={{ fontSize: "15px", color: "#64748B" }}>Health guide</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "44px",
                  fontSize: title.length > 44 ? "43px" : "50px",
                  fontWeight: "760",
                  color: "#0F172A",
                  lineHeight: 1.08,
                  letterSpacing: "0",
                }}
              >
                {displayTitle}
              </div>

              {displaySubtitle && (
                <div style={{ marginTop: "20px", fontSize: "23px", color: "#475569", lineHeight: 1.35 }}>
                  {displaySubtitle}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "auto",
                }}
              >
                {["Doctor reviewed guide", "Australian context", "Educational only"].map((badge) => (
                  <div
                    key={badge}
                    style={{
                      background: "#EFF6FF",
                      padding: "9px 15px",
                      borderRadius: "999px",
                      fontSize: "14px",
                      fontWeight: "650",
                      color: "#2563EB",
                    }}
                  >
                    {badge}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                width: "46%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#F8FAFC",
                padding: "28px",
              }}
            >
              <img
                src={imageUrl}
                alt=""
                style={{
                  height: "100%",
                  width: "100%",
                  objectFit: "contain",
                  borderRadius: "20px",
                  background: "white",
                  boxShadow: "0 18px 48px rgba(15, 23, 42, 0.12)",
                }}
              />
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

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
        {/* Top bar - brand + type badge */}
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
            letterSpacing: "0",
          }}
        >
          {displayTitle}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div style={{ fontSize: "26px", color: "#64748B", lineHeight: 1.4, maxWidth: "900px" }}>
            {displaySubtitle}
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
