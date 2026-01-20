import { allArticles } from '@/lib/blog/articles'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://instantmed.com.au'
  
  const articles = [...allArticles]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 50)

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>InstantMed Health Guides</title>
    <link>${baseUrl}/blog</link>
    <description>Doctor-reviewed health guides for Australians. Medical certificates, telehealth, prescriptions, and common health conditions.</description>
    <language>en-AU</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>InstantMed Health Guides</title>
      <link>${baseUrl}/blog</link>
    </image>
    ${articles.map(article => `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${baseUrl}/blog/${article.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${article.slug}</guid>
      <description><![CDATA[${article.excerpt}]]></description>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      <author>${article.author.name}</author>
      <category>${article.category}</category>
    </item>`).join('')}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
