import { ImageResponse } from "next/og"
import { getArticleBySlug } from "@/lib/blog/articles"

export const runtime = "edge"

export const alt = "InstantMed Health Guide"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)

  const title = article?.title || "Health Guide"
  const category = article?.category
    ? article.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Health"
  const readingTime = article?.readingTime || 5

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
        {/* Top: category + reading time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              background: "#3B82F6",
              color: "#fff",
              padding: "6px 16px",
              borderRadius: "999px",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            {category}
          </div>
          <div
            style={{
              color: "#6B7280",
              fontSize: "18px",
            }}
          >
            {readingTime} min read
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
              fontSize: title.length > 60 ? "42px" : "52px",
              fontWeight: 800,
              color: "#0F172A",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          {article?.author && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "20px",
                color: "#6B7280",
              }}
            >
              Reviewed by {article.author.name}, {article.author.credentials}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3B82F6, #22C55E)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "22px",
                fontWeight: 800,
              }}
            >
              iM
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              Instant<span style={{ color: "#3B82F6" }}>Med</span>
            </div>
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "#9CA3AF",
            }}
          >
            instantmed.com.au
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
