import { ArrowRight } from "lucide-react"
import Link from "next/link"

interface RelatedArticle {
  title: string
  href: string
}

interface RelatedArticlesProps {
  articles: RelatedArticle[]
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null

  return (
    <section aria-label="Related articles" className="py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-4 text-center">
          Related reading
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {articles.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-card border border-border/30 dark:border-white/15 text-sm text-foreground hover:border-primary/30 hover:shadow-sm transition-all"
            >
              {article.title}
              <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
