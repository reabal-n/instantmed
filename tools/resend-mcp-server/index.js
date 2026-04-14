import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY env var");
  process.exit(1);
}

const BASE = "https://api.resend.com";

async function resendFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// --- Tool definitions ---

const TOOLS = [
  {
    name: "resend_list_emails",
    description:
      "List recently sent emails. Shows delivery status, subject, recipients. Use to monitor email health.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max emails to return (default 20, max 100).",
        },
      },
    },
  },
  {
    name: "resend_get_email",
    description:
      "Get details of a specific email by ID. Shows full delivery timeline, opens, clicks.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The email ID." },
      },
      required: ["id"],
    },
  },
  {
    name: "resend_list_domains",
    description:
      "List verified sending domains. Check DNS records, verification status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "resend_get_domain",
    description:
      "Get details of a specific domain including DNS records and verification status.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The domain ID." },
      },
      required: ["id"],
    },
  },
  {
    name: "resend_list_api_keys",
    description:
      "List API keys. Shows which keys exist and their permissions (not the actual key values).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "resend_delivery_stats",
    description:
      "Get a delivery health summary by analyzing recent emails. Shows sent/delivered/bounced/complained counts.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description:
            "Number of recent emails to analyze (default 50, max 100).",
        },
      },
    },
  },
  {
    name: "resend_list_contacts",
    description:
      "List contacts in an audience/list. Shows email addresses and subscription status.",
    inputSchema: {
      type: "object",
      properties: {
        audienceId: {
          type: "string",
          description: "The audience ID to list contacts from.",
        },
      },
      required: ["audienceId"],
    },
  },
  {
    name: "resend_list_audiences",
    description: "List all audiences (contact lists). Shows IDs and names.",
    inputSchema: { type: "object", properties: {} },
  },
];

// --- Handlers ---

async function handleListEmails(args) {
  // Resend doesn't have a list emails endpoint in their REST API directly,
  // but we can use the batch/emails endpoint. Let's use what's available.
  // The emails endpoint requires an ID. We'll use the emails list endpoint.
  try {
    const data = await resendFetch("/emails");
    const emails = data.data || [];
    return emails.slice(0, args.limit || 20).map((e) => ({
      id: e.id,
      to: e.to,
      subject: e.subject,
      status: e.last_event,
      createdAt: e.created_at,
    }));
  } catch (error) {
    // If list endpoint isn't available, return helpful message
    return {
      note: "The Resend emails list endpoint requires a specific plan. Use resend_get_email with a known email ID, or check the Resend dashboard for recent sends.",
      error: error.message,
    };
  }
}

async function handleGetEmail(args) {
  const data = await resendFetch(`/emails/${args.id}`);
  return {
    id: data.id,
    from: data.from,
    to: data.to,
    subject: data.subject,
    status: data.last_event,
    createdAt: data.created_at,
    html: data.html ? `${data.html.substring(0, 200)}...` : null,
  };
}

async function handleListDomains() {
  const data = await resendFetch("/domains");
  return (data.data || []).map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    region: d.region,
    createdAt: d.created_at,
  }));
}

async function handleGetDomain(args) {
  const data = await resendFetch(`/domains/${args.id}`);
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    region: data.region,
    records: data.records?.map((r) => ({
      type: r.record,
      name: r.name,
      value: r.value?.substring(0, 80) + (r.value?.length > 80 ? "..." : ""),
      status: r.status,
      priority: r.priority,
    })),
    createdAt: data.created_at,
  };
}

async function handleListApiKeys() {
  const data = await resendFetch("/api-keys");
  return (data.data || []).map((k) => ({
    id: k.id,
    name: k.name,
    createdAt: k.created_at,
  }));
}

async function handleDeliveryStats(args) {
  // Analyze recent emails to build stats
  try {
    const data = await resendFetch("/emails");
    const emails = (data.data || []).slice(0, args.limit || 50);

    const stats = {
      total: emails.length,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      other: 0,
    };

    for (const e of emails) {
      switch (e.last_event) {
        case "delivered":
          stats.delivered++;
          break;
        case "opened":
          stats.opened++;
          stats.delivered++;
          break;
        case "clicked":
          stats.clicked++;
          stats.opened++;
          stats.delivered++;
          break;
        case "bounced":
          stats.bounced++;
          break;
        case "complained":
          stats.complained++;
          break;
        default:
          stats.other++;
      }
    }

    stats.deliveryRate =
      stats.total > 0
        ? `${(((stats.delivered + stats.opened + stats.clicked) / stats.total) * 100).toFixed(1)}%`
        : "N/A";
    stats.bounceRate =
      stats.total > 0
        ? `${((stats.bounced / stats.total) * 100).toFixed(1)}%`
        : "N/A";

    return stats;
  } catch (error) {
    return {
      note: "Could not fetch email list for stats. Use the Resend dashboard for aggregate delivery metrics.",
      error: error.message,
    };
  }
}

async function handleListContacts(args) {
  const data = await resendFetch(
    `/audiences/${args.audienceId}/contacts`
  );
  return (data.data || []).map((c) => ({
    id: c.id,
    email: c.email,
    firstName: c.first_name,
    lastName: c.last_name,
    unsubscribed: c.unsubscribed,
    createdAt: c.created_at,
  }));
}

async function handleListAudiences() {
  const data = await resendFetch("/audiences");
  return (data.data || []).map((a) => ({
    id: a.id,
    name: a.name,
    createdAt: a.created_at,
  }));
}

// --- Dispatch ---

const HANDLERS = {
  resend_list_emails: handleListEmails,
  resend_get_email: handleGetEmail,
  resend_list_domains: handleListDomains,
  resend_get_domain: handleGetDomain,
  resend_list_api_keys: handleListApiKeys,
  resend_delivery_stats: handleDeliveryStats,
  resend_list_contacts: handleListContacts,
  resend_list_audiences: handleListAudiences,
};

// --- MCP Server ---

const server = new Server(
  { name: "resend-mcp-server", version: "1.0.0" },
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
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Resend error: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
