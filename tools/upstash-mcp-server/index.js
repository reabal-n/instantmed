import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error(
    "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars"
  );
  process.exit(1);
}

// --- Upstash REST API helper ---

async function redisCommand(args) {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.result;
}

// Pipeline multiple commands
async function redisPipeline(commands) {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  const data = await res.json();
  return data;
}

// --- Tool definitions ---

const TOOLS = [
  {
    name: "redis_info",
    description:
      "Get Redis server info -- memory usage, connected clients, keyspace stats. Quick health check.",
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: [
            "server",
            "clients",
            "memory",
            "stats",
            "keyspace",
            "all",
          ],
          description: "Info section (default: all).",
        },
      },
    },
  },
  {
    name: "redis_keys",
    description:
      "List keys matching a pattern. Use to explore what's stored in Redis. Pattern supports * and ? globs.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description:
            "Key pattern (e.g. 'rate-limit:*', 'cache:*', 'ai:*'). Default: '*'.",
        },
        cursor: {
          type: "string",
          description: "Cursor for pagination (default: '0').",
        },
        count: {
          type: "number",
          description: "Approximate keys per scan (default: 100).",
        },
      },
    },
  },
  {
    name: "redis_get",
    description:
      "Get the value of a key. Works for strings. Returns the raw value.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "The key to get." },
      },
      required: ["key"],
    },
  },
  {
    name: "redis_type_and_ttl",
    description:
      "Get the type and TTL of a key. Shows what data structure it is and when it expires.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "The key to inspect." },
      },
      required: ["key"],
    },
  },
  {
    name: "redis_rate_limit_status",
    description:
      "Check rate limit status for a specific identifier. Shows remaining requests and window expiry. Inspects the rate-limit keys used by InstantMed's rate limiter.",
    inputSchema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description:
            "The rate limit identifier (e.g. IP address, user ID, or endpoint path).",
        },
      },
      required: ["identifier"],
    },
  },
  {
    name: "redis_key_count",
    description:
      "Count total keys in the database, or keys matching a pattern.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description:
            "Optional pattern to count (e.g. 'rate-limit:*'). If omitted, counts all keys.",
        },
      },
    },
  },
  {
    name: "redis_memory_usage",
    description: "Get memory usage of a specific key in bytes.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "The key to check." },
      },
      required: ["key"],
    },
  },
  {
    name: "redis_hash_getall",
    description:
      "Get all fields and values from a hash key. Many rate limiters store state as hashes.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "The hash key." },
      },
      required: ["key"],
    },
  },
  {
    name: "redis_sorted_set_range",
    description:
      "Get members of a sorted set with their scores. Useful for leaderboards, priority queues.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "The sorted set key." },
        start: {
          type: "number",
          description: "Start rank (default: 0).",
        },
        stop: {
          type: "number",
          description: "Stop rank (default: -1 for all).",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "redis_dbsize",
    description: "Get the total number of keys in the database.",
    inputSchema: { type: "object", properties: {} },
  },
];

// --- Handlers ---

async function handleInfo(args) {
  const section = args.section || "all";
  const raw =
    section === "all"
      ? await redisCommand(["INFO"])
      : await redisCommand(["INFO", section]);

  // Parse INFO output into structured object
  const sections = {};
  let currentSection = "default";
  for (const line of raw.split("\r\n")) {
    if (line.startsWith("# ")) {
      currentSection = line.slice(2).toLowerCase();
      sections[currentSection] = {};
    } else if (line.includes(":")) {
      const [key, val] = line.split(":");
      if (sections[currentSection]) {
        sections[currentSection][key] = val;
      }
    }
  }

  // Return compact summary
  const mem = sections.memory || {};
  const stats = sections.stats || {};
  const keyspace = sections.keyspace || {};

  return {
    memory: {
      used: mem.used_memory_human,
      peak: mem.used_memory_peak_human,
      maxmemory: mem.maxmemory_human || "unlimited",
    },
    stats: {
      totalCommands: stats.total_commands_processed,
      opsPerSec: stats.instantaneous_ops_per_sec,
      hitRate:
        stats.keyspace_hits && stats.keyspace_misses
          ? `${(
              (parseInt(stats.keyspace_hits) /
                (parseInt(stats.keyspace_hits) +
                  parseInt(stats.keyspace_misses))) *
              100
            ).toFixed(1)}%`
          : "N/A",
    },
    keyspace,
    raw: section !== "all" ? sections : undefined,
  };
}

async function handleKeys(args) {
  const pattern = args.pattern || "*";
  const cursor = args.cursor || "0";
  const count = args.count || 100;

  const result = await redisCommand([
    "SCAN",
    cursor,
    "MATCH",
    pattern,
    "COUNT",
    String(count),
  ]);

  return {
    cursor: result[0],
    keys: result[1],
    hasMore: result[0] !== "0",
  };
}

async function handleGet(args) {
  const value = await redisCommand(["GET", args.key]);
  let parsed = value;
  try {
    parsed = JSON.parse(value);
  } catch {}
  return { key: args.key, value: parsed };
}

async function handleTypeAndTtl(args) {
  const results = await redisPipeline([
    ["TYPE", args.key],
    ["TTL", args.key],
    ["PTTL", args.key],
  ]);

  return {
    key: args.key,
    type: results[0]?.result,
    ttl: results[1]?.result,
    ttlMs: results[2]?.result,
    expires:
      results[1]?.result > 0
        ? new Date(Date.now() + results[2]?.result).toISOString()
        : results[1]?.result === -1
          ? "never"
          : "key does not exist",
  };
}

async function handleRateLimitStatus(args) {
  // Scan for rate-limit keys matching the identifier
  const scanResult = await redisCommand([
    "SCAN",
    "0",
    "MATCH",
    `*${args.identifier}*`,
    "COUNT",
    "200",
  ]);

  const keys = scanResult[1] || [];
  const rateLimitKeys = keys.filter(
    (k) =>
      k.includes("rate") ||
      k.includes("limit") ||
      k.includes("ratelimit")
  );

  if (rateLimitKeys.length === 0) {
    return {
      identifier: args.identifier,
      found: false,
      allMatchingKeys: keys.slice(0, 20),
      note: "No rate-limit keys found for this identifier. Keys shown are all matches.",
    };
  }

  // Get details for each rate limit key
  const details = [];
  for (const key of rateLimitKeys.slice(0, 10)) {
    const typeResult = await redisCommand(["TYPE", key]);
    let value;

    if (typeResult === "string") {
      value = await redisCommand(["GET", key]);
    } else if (typeResult === "hash") {
      value = await redisCommand(["HGETALL", key]);
    } else if (typeResult === "zset") {
      value = await redisCommand(["ZRANGE", key, "0", "-1", "WITHSCORES"]);
    }

    const ttl = await redisCommand(["TTL", key]);

    details.push({
      key,
      type: typeResult,
      value,
      ttl,
      expiresIn: ttl > 0 ? `${ttl}s` : ttl === -1 ? "never" : "expired",
    });
  }

  return {
    identifier: args.identifier,
    found: true,
    rateLimitKeys: details,
  };
}

async function handleKeyCount(args) {
  if (!args.pattern) {
    const dbsize = await redisCommand(["DBSIZE"]);
    return { total: dbsize };
  }

  // Scan and count
  let cursor = "0";
  let count = 0;
  do {
    const result = await redisCommand([
      "SCAN",
      cursor,
      "MATCH",
      args.pattern,
      "COUNT",
      "1000",
    ]);
    cursor = result[0];
    count += result[1].length;
  } while (cursor !== "0");

  return { pattern: args.pattern, count };
}

async function handleMemoryUsage(args) {
  const bytes = await redisCommand(["MEMORY", "USAGE", args.key]);
  return {
    key: args.key,
    bytes,
    human:
      bytes > 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
        : bytes > 1024
          ? `${(bytes / 1024).toFixed(2)} KB`
          : `${bytes} bytes`,
  };
}

async function handleHashGetAll(args) {
  const result = await redisCommand(["HGETALL", args.key]);
  // Upstash returns flat array [field1, value1, field2, value2, ...]
  const hash = {};
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) {
      hash[result[i]] = result[i + 1];
    }
  }
  return { key: args.key, fields: hash };
}

async function handleSortedSetRange(args) {
  const start = args.start ?? 0;
  const stop = args.stop ?? -1;
  const result = await redisCommand([
    "ZRANGE",
    args.key,
    String(start),
    String(stop),
    "WITHSCORES",
  ]);

  const members = [];
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) {
      members.push({ member: result[i], score: parseFloat(result[i + 1]) });
    }
  }
  return { key: args.key, members };
}

async function handleDbsize() {
  const size = await redisCommand(["DBSIZE"]);
  return { totalKeys: size };
}

// --- Dispatch ---

const HANDLERS = {
  redis_info: handleInfo,
  redis_keys: handleKeys,
  redis_get: handleGet,
  redis_type_and_ttl: handleTypeAndTtl,
  redis_rate_limit_status: handleRateLimitStatus,
  redis_key_count: handleKeyCount,
  redis_memory_usage: handleMemoryUsage,
  redis_hash_getall: handleHashGetAll,
  redis_sorted_set_range: handleSortedSetRange,
  redis_dbsize: handleDbsize,
};

// --- MCP Server ---

const server = new Server(
  { name: "upstash-mcp-server", version: "1.0.0" },
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
      content: [{ type: "text", text: `Redis error: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
