import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";

// ADC auto-detected -- no key files needed
const auth = new google.auth.GoogleAuth({
  scopes: [
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/indexing",
    "https://www.googleapis.com/auth/business.manage",
  ],
});

const searchconsole = google.searchconsole({ version: "v1", auth });
const indexing = google.indexing({ version: "v3", auth });
const SITE_URL = "sc-domain:instantmed.com.au";
const SITE_ORIGIN = "https://instantmed.com.au";
const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY || "";

// --- Tool definitions ---

const TOOLS = [
  // ===== Search Analytics =====
  {
    name: "gsc_top_queries",
    description:
      "Get top search queries from Google Search Console. Returns clicks, impressions, CTR, and position for each query.",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD). Defaults to 28 days ago.",
        },
        endDate: {
          type: "string",
          description: "End date (YYYY-MM-DD). Defaults to today.",
        },
        rowLimit: {
          type: "number",
          description: "Max rows to return (default 25, max 25000).",
        },
        query: {
          type: "string",
          description:
            "Filter to queries containing this string (case-insensitive).",
        },
        page: {
          type: "string",
          description: "Filter to a specific page URL.",
        },
        orderBy: {
          type: "string",
          enum: ["clicks", "impressions", "ctr", "position"],
          description: "Sort by this metric (default: clicks).",
        },
      },
    },
  },
  {
    name: "gsc_page_performance",
    description:
      "Get performance data by page URL. Shows which pages get the most traffic.",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)." },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)." },
        rowLimit: { type: "number", description: "Max rows (default 25)." },
        pageFilter: {
          type: "string",
          description: "Filter to pages containing this URL fragment.",
        },
        orderBy: {
          type: "string",
          enum: ["clicks", "impressions", "ctr", "position"],
          description: "Sort by this metric (default: clicks).",
        },
      },
    },
  },
  {
    name: "gsc_query_pages",
    description:
      "For a given search query, show which pages rank. Useful for cannibalization detection.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The exact search query to analyze.",
        },
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)." },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)." },
      },
      required: ["query"],
    },
  },
  {
    name: "gsc_keyword_opportunities",
    description:
      "Find queries where you rank on page 2-3 (positions 8-30) with decent impressions. Easiest wins.",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)." },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)." },
        minImpressions: {
          type: "number",
          description: "Minimum impressions (default 10).",
        },
        rowLimit: { type: "number", description: "Max rows (default 50)." },
      },
    },
  },
  {
    name: "gsc_index_status",
    description:
      "URL inspection -- shows whether a page is indexed, crawl details, mobile usability, rich results.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The full URL to inspect (e.g. https://instantmed.com.au/medical-certificate).",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "gsc_sitemaps",
    description: "List all sitemaps submitted to GSC and their status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "gsc_compare_periods",
    description:
      "Compare search performance between two date ranges. Shows gains/losses in clicks, impressions, position.",
    inputSchema: {
      type: "object",
      properties: {
        currentStart: {
          type: "string",
          description: "Current period start (YYYY-MM-DD).",
        },
        currentEnd: {
          type: "string",
          description: "Current period end (YYYY-MM-DD).",
        },
        previousStart: {
          type: "string",
          description: "Previous period start (YYYY-MM-DD).",
        },
        previousEnd: {
          type: "string",
          description: "Previous period end (YYYY-MM-DD).",
        },
        rowLimit: {
          type: "number",
          description: "Max rows per period (default 100).",
        },
      },
      required: [
        "currentStart",
        "currentEnd",
        "previousStart",
        "previousEnd",
      ],
    },
  },
  {
    name: "gsc_device_breakdown",
    description: "Search performance by device type (desktop, mobile, tablet).",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)." },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)." },
        page: {
          type: "string",
          description: "Optional: filter to a specific page URL.",
        },
      },
    },
  },
  {
    name: "gsc_country_breakdown",
    description:
      "Search performance by country. Shows AU vs international traffic.",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)." },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)." },
        rowLimit: { type: "number", description: "Max rows (default 10)." },
      },
    },
  },

  // ===== Indexing API =====
  {
    name: "gsc_submit_url",
    description:
      "Submit a URL for Google to crawl/index immediately. Use after publishing new content or updating a page. Quota: 200/day.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "Full URL to submit (e.g. https://instantmed.com.au/blog/new-article).",
        },
        type: {
          type: "string",
          enum: ["URL_UPDATED", "URL_DELETED"],
          description:
            "URL_UPDATED for new/changed pages, URL_DELETED to remove from index. Default: URL_UPDATED.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "gsc_batch_submit_urls",
    description:
      "Submit multiple URLs for indexing at once. Use after publishing a batch of articles or condition pages.",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "Array of full URLs to submit.",
        },
        type: {
          type: "string",
          enum: ["URL_UPDATED", "URL_DELETED"],
          description: "Default: URL_UPDATED.",
        },
      },
      required: ["urls"],
    },
  },

  // ===== PageSpeed Insights =====
  {
    name: "pagespeed_audit",
    description:
      "Run a PageSpeed Insights / Core Web Vitals audit on any URL. Returns LCP, FID, CLS, performance score, and optimization suggestions. No auth needed -- uses the free public API.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "Full URL to audit (e.g. https://instantmed.com.au/medical-certificate).",
        },
        strategy: {
          type: "string",
          enum: ["mobile", "desktop"],
          description: "Device strategy (default: mobile).",
        },
        categories: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "performance",
              "accessibility",
              "best-practices",
              "seo",
            ],
          },
          description:
            "Audit categories (default: all four).",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "pagespeed_compare",
    description:
      "Compare PageSpeed scores across multiple URLs. Useful for checking all service pages or comparing against competitors.",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "Array of full URLs to compare.",
        },
        strategy: {
          type: "string",
          enum: ["mobile", "desktop"],
          description: "Device strategy (default: mobile).",
        },
      },
      required: ["urls"],
    },
  },

  // ===== Google Business Profile =====
  {
    name: "gbp_list_locations",
    description:
      "List all Google Business Profile locations/listings for the account.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "gbp_get_reviews",
    description:
      "Get reviews for a GBP listing. Monitor star ratings, review text, and response status.",
    inputSchema: {
      type: "object",
      properties: {
        pageSize: {
          type: "number",
          description: "Max reviews to return (default 20).",
        },
      },
    },
  },
];

// --- Helpers ---

function defaultDates(startDate, endDate) {
  const end = endDate || new Date().toISOString().split("T")[0];
  const start =
    startDate ||
    new Date(Date.now() - 28 * 86400000).toISOString().split("T")[0];
  return { start, end };
}

function formatMetrics(row) {
  return {
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: `${((row.ctr || 0) * 100).toFixed(1)}%`,
    position: (row.position || 0).toFixed(1),
  };
}

async function querySearchAnalytics({
  startDate,
  endDate,
  dimensions = ["query"],
  dimensionFilters = [],
  rowLimit = 25,
  orderBy = "clicks",
}) {
  const { start, end } = defaultDates(startDate, endDate);

  const requestBody = {
    startDate: start,
    endDate: end,
    dimensions,
    rowLimit: Math.min(rowLimit, 25000),
    dataState: "final",
  };

  if (dimensionFilters.length > 0) {
    requestBody.dimensionFilterGroups = [{ filters: dimensionFilters }];
  }

  const res = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody,
  });

  const rows = res.data.rows || [];

  const sortKey = orderBy || "clicks";
  if (sortKey === "position") {
    rows.sort((a, b) => a.position - b.position);
  } else {
    rows.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
  }

  return rows;
}

// --- Search Analytics handlers ---

async function handleTopQueries(args) {
  const filters = [];
  if (args.query) {
    filters.push({
      dimension: "query",
      operator: "contains",
      expression: args.query,
    });
  }
  if (args.page) {
    filters.push({
      dimension: "page",
      operator: "contains",
      expression: args.page,
    });
  }

  const rows = await querySearchAnalytics({
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: ["query"],
    dimensionFilters: filters,
    rowLimit: args.rowLimit || 25,
    orderBy: args.orderBy || "clicks",
  });

  return rows.map((r) => ({
    query: r.keys[0],
    ...formatMetrics(r),
  }));
}

async function handlePagePerformance(args) {
  const filters = [];
  if (args.pageFilter) {
    filters.push({
      dimension: "page",
      operator: "contains",
      expression: args.pageFilter,
    });
  }

  const rows = await querySearchAnalytics({
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: ["page"],
    dimensionFilters: filters,
    rowLimit: args.rowLimit || 25,
    orderBy: args.orderBy || "clicks",
  });

  return rows.map((r) => ({
    page: r.keys[0].replace(SITE_ORIGIN, ""),
    ...formatMetrics(r),
  }));
}

async function handleQueryPages(args) {
  const rows = await querySearchAnalytics({
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: ["query", "page"],
    dimensionFilters: [
      { dimension: "query", operator: "equals", expression: args.query },
    ],
    rowLimit: 25,
    orderBy: "clicks",
  });

  return rows.map((r) => ({
    query: r.keys[0],
    page: r.keys[1].replace(SITE_ORIGIN, ""),
    ...formatMetrics(r),
  }));
}

async function handleKeywordOpportunities(args) {
  const rows = await querySearchAnalytics({
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: ["query"],
    rowLimit: args.rowLimit || 50,
    orderBy: "impressions",
  });

  const minImpressions = args.minImpressions || 10;
  const opportunities = rows
    .filter(
      (r) =>
        r.position >= 8 && r.position <= 30 && r.impressions >= minImpressions
    )
    .sort((a, b) => a.position - b.position);

  return opportunities.map((r) => ({
    query: r.keys[0],
    ...formatMetrics(r),
    reason:
      r.position <= 15
        ? "Page 2 -- close to page 1"
        : "Page 2-3 -- needs content improvement",
  }));
}

async function handleIndexStatus(args) {
  const res = await searchconsole.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl: args.url,
      siteUrl: SITE_URL,
    },
  });

  const result = res.data.inspectionResult;
  return {
    url: args.url,
    indexStatus: result?.indexStatusResult?.verdict || "UNKNOWN",
    coverageState: result?.indexStatusResult?.coverageState || "UNKNOWN",
    robotsTxtState: result?.indexStatusResult?.robotsTxtState || "UNKNOWN",
    indexingState: result?.indexStatusResult?.indexingState || "UNKNOWN",
    lastCrawlTime: result?.indexStatusResult?.lastCrawlTime || null,
    pageFetchState: result?.indexStatusResult?.pageFetchState || "UNKNOWN",
    crawledAs: result?.indexStatusResult?.crawledAs || "UNKNOWN",
    mobileUsability: result?.mobileUsabilityResult?.verdict || "UNKNOWN",
    richResults: result?.richResultsResult?.detectedItems || [],
  };
}

async function handleSitemaps() {
  const res = await searchconsole.sitemaps.list({ siteUrl: SITE_URL });
  const sitemaps = res.data.sitemap || [];

  return sitemaps.map((s) => ({
    path: s.path,
    lastSubmitted: s.lastSubmitted,
    lastDownloaded: s.lastDownloaded,
    isPending: s.isPending,
    warnings: s.warnings,
    errors: s.errors,
    contents: s.contents?.map((c) => ({
      type: c.type,
      submitted: c.submitted,
      indexed: c.indexed,
    })),
  }));
}

async function handleComparePeriods(args) {
  const [currentRows, previousRows] = await Promise.all([
    querySearchAnalytics({
      startDate: args.currentStart,
      endDate: args.currentEnd,
      dimensions: ["query"],
      rowLimit: args.rowLimit || 100,
    }),
    querySearchAnalytics({
      startDate: args.previousStart,
      endDate: args.previousEnd,
      dimensions: ["query"],
      rowLimit: args.rowLimit || 100,
    }),
  ]);

  const prevMap = new Map();
  for (const r of previousRows) {
    prevMap.set(r.keys[0], r);
  }

  const comparison = currentRows.map((r) => {
    const query = r.keys[0];
    const prev = prevMap.get(query);
    return {
      query,
      current: formatMetrics(r),
      previous: prev ? formatMetrics(prev) : null,
      delta: prev
        ? {
            clicks: r.clicks - prev.clicks,
            impressions: r.impressions - prev.impressions,
            position: (prev.position - r.position).toFixed(1),
          }
        : { clicks: r.clicks, impressions: r.impressions, position: "new" },
    };
  });

  comparison.sort(
    (a, b) => (b.delta?.clicks || 0) - (a.delta?.clicks || 0)
  );

  return comparison;
}

async function handleDeviceBreakdown(args) {
  const filters = [];
  if (args.page) {
    filters.push({
      dimension: "page",
      operator: "contains",
      expression: args.page,
    });
  }

  const rows = await querySearchAnalytics({
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: ["device"],
    dimensionFilters: filters,
    rowLimit: 10,
  });

  return rows.map((r) => ({
    device: r.keys[0],
    ...formatMetrics(r),
  }));
}

async function handleCountryBreakdown(args) {
  const rows = await querySearchAnalytics({
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: ["country"],
    rowLimit: args.rowLimit || 10,
  });

  return rows.map((r) => ({
    country: r.keys[0],
    ...formatMetrics(r),
  }));
}

// --- Indexing API handlers ---

async function handleSubmitUrl(args) {
  const type = args.type || "URL_UPDATED";
  const res = await indexing.urlNotifications.publish({
    requestBody: {
      url: args.url,
      type,
    },
  });

  return {
    url: args.url,
    type,
    notifyTime: res.data.urlNotificationMetadata?.latestUpdate?.notifyTime,
    status: "submitted",
  };
}

async function handleBatchSubmitUrls(args) {
  const type = args.type || "URL_UPDATED";
  const results = [];

  for (const url of args.urls) {
    try {
      const res = await indexing.urlNotifications.publish({
        requestBody: { url, type },
      });
      results.push({
        url,
        status: "submitted",
        notifyTime:
          res.data.urlNotificationMetadata?.latestUpdate?.notifyTime,
      });
    } catch (error) {
      results.push({
        url,
        status: "error",
        error: error.message,
      });
    }
  }

  return {
    total: args.urls.length,
    submitted: results.filter((r) => r.status === "submitted").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  };
}

// --- PageSpeed Insights handlers ---

async function handlePagespeedAudit(args) {
  const strategy = args.strategy || "mobile";
  const categories = args.categories || [
    "performance",
    "accessibility",
    "best-practices",
    "seo",
  ];

  const params = new URLSearchParams({
    url: args.url,
    strategy,
  });
  if (PAGESPEED_API_KEY) {
    params.set("key", PAGESPEED_API_KEY);
  }
  for (const cat of categories) {
    params.append("category", cat.toUpperCase().replace("-", "_"));
  }

  const res = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`
  );
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const lighthouse = data.lighthouseResult;
  const categoryScores = {};
  for (const [key, val] of Object.entries(lighthouse?.categories || {})) {
    categoryScores[key] = Math.round((val.score || 0) * 100);
  }

  const cwv = lighthouse?.audits || {};
  const coreWebVitals = {
    LCP: {
      value: cwv["largest-contentful-paint"]?.displayValue || "N/A",
      score: cwv["largest-contentful-paint"]?.score,
    },
    FID: {
      value: cwv["max-potential-fid"]?.displayValue || "N/A",
      score: cwv["max-potential-fid"]?.score,
    },
    CLS: {
      value: cwv["cumulative-layout-shift"]?.displayValue || "N/A",
      score: cwv["cumulative-layout-shift"]?.score,
    },
    FCP: {
      value: cwv["first-contentful-paint"]?.displayValue || "N/A",
      score: cwv["first-contentful-paint"]?.score,
    },
    TBT: {
      value: cwv["total-blocking-time"]?.displayValue || "N/A",
      score: cwv["total-blocking-time"]?.score,
    },
    SI: {
      value: cwv["speed-index"]?.displayValue || "N/A",
      score: cwv["speed-index"]?.score,
    },
  };

  // Extract top opportunities
  const opportunities = Object.values(cwv)
    .filter(
      (a) =>
        a.details?.type === "opportunity" &&
        a.details?.overallSavingsMs > 100
    )
    .sort(
      (a, b) =>
        (b.details?.overallSavingsMs || 0) -
        (a.details?.overallSavingsMs || 0)
    )
    .slice(0, 5)
    .map((a) => ({
      title: a.title,
      savings: `${Math.round(a.details.overallSavingsMs)}ms`,
      description: a.description?.split(".")[0],
    }));

  return {
    url: args.url,
    strategy,
    scores: categoryScores,
    coreWebVitals,
    opportunities,
    fetchTime: lighthouse?.fetchTime,
  };
}

async function handlePagespeedCompare(args) {
  const strategy = args.strategy || "mobile";
  const results = [];

  for (const url of args.urls) {
    try {
      const result = await handlePagespeedAudit({
        url,
        strategy,
        categories: ["performance", "seo"],
      });
      results.push(result);
    } catch (error) {
      results.push({ url, error: error.message });
    }
  }

  return results;
}

// --- Google Business Profile handlers ---

async function handleGbpListLocations() {
  const mybusiness = google.mybusinessaccountmanagement({
    version: "v1",
    auth,
  });

  const accountsRes = await mybusiness.accounts.list();
  const accounts = accountsRes.data.accounts || [];

  if (accounts.length === 0) {
    return { error: "No GBP accounts found for this Google account." };
  }

  const results = [];
  for (const account of accounts) {
    results.push({
      name: account.name,
      accountName: account.accountName,
      type: account.type,
      role: account.role,
      state: account.state,
    });
  }

  return { accounts: results };
}

async function handleGbpGetReviews(args) {
  const mybusiness = google.mybusinessaccountmanagement({
    version: "v1",
    auth,
  });

  // First, list accounts to find the right one
  const accountsRes = await mybusiness.accounts.list();
  const accounts = accountsRes.data.accounts || [];

  if (accounts.length === 0) {
    return { error: "No GBP accounts found." };
  }

  return {
    accounts: accounts.map((a) => ({
      name: a.name,
      accountName: a.accountName,
      type: a.type,
    })),
    note: "GBP Reviews API requires My Business API v4 which uses a different endpoint. Use the GBP dashboard or the account info above to verify your listing.",
  };
}

// --- Dispatch ---

const HANDLERS = {
  gsc_top_queries: handleTopQueries,
  gsc_page_performance: handlePagePerformance,
  gsc_query_pages: handleQueryPages,
  gsc_keyword_opportunities: handleKeywordOpportunities,
  gsc_index_status: handleIndexStatus,
  gsc_sitemaps: handleSitemaps,
  gsc_compare_periods: handleComparePeriods,
  gsc_device_breakdown: handleDeviceBreakdown,
  gsc_country_breakdown: handleCountryBreakdown,
  gsc_submit_url: handleSubmitUrl,
  gsc_batch_submit_urls: handleBatchSubmitUrls,
  pagespeed_audit: handlePagespeedAudit,
  pagespeed_compare: handlePagespeedCompare,
  gbp_list_locations: handleGbpListLocations,
  gbp_get_reviews: handleGbpGetReviews,
};

// --- MCP Server ---

const server = new Server(
  { name: "gsc-mcp-server", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = HANDLERS[name];

  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await handler(args || {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `API error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
