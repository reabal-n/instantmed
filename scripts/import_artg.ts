#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * TGA ARTG Import Script
 * Imports ARTG product data from XLSX into Supabase artg_products table.
 * Reference-only metadata for patient recall/search (NOT prescribing).
 *
 * Usage: pnpm import:artg
 */

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const XLSX_PATH = path.resolve(__dirname, "../data/raw/ARTG.xlsx");
const BATCH_SIZE = 500;

// Column keyword mappings (case-insensitive partial match)
const COLUMN_KEYWORDS: Record<string, string[]> = {
  artg_id: ["artg id", "artg_id", "artgid"],
  product_name: ["product name", "product_name", "productname"],
  sponsor_name: ["sponsor name", "sponsor_name", "sponsorname"],
  active_ingredients_raw: ["active ingredient", "active_ingredient"],
  dosage_form: ["dosage form", "dosage_form", "dosageform"],
  route: ["route of admin", "route_of_admin", "routeofadmin", "route"],
  indications_raw: ["indication"],
  product_type: ["product type", "product_type", "producttype"],
  status: ["artg category", "artg_category", "status", "category"],
};

interface ArtgProduct {
  artg_id: string;
  product_name: string | null;
  sponsor_name: string | null;
  active_ingredients_raw: string | null;
  dosage_form: string | null;
  route: string | null;
  indications_raw: string | null;
  product_type: string | null;
  status: string | null;
  source: string;
  updated_at: string;
}

function cleanString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().replace(/\s+/g, " ");
  return str.length > 0 ? str : null;
}

function isSkipRow(row: unknown[]): boolean {
  if (!row || row.length === 0) return true;
  const first = cleanString(row[0]);
  if (!first) return true;
  const skipPatterns = ["applied filter", "total:", "page ", "exported"];
  return skipPatterns.some((p) => first.toLowerCase().includes(p));
}

function detectHeaderRow(
  rows: unknown[][]
): { headerIndex: number; columnMap: Record<string, number> } | null {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;

    const columnMap: Record<string, number> = {};
    let matchCount = 0;

    for (let c = 0; c < row.length; c++) {
      const cellVal = cleanString(row[c])?.toLowerCase();
      if (!cellVal) continue;

      for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
        if (columnMap[field] !== undefined) continue;
        if (keywords.some((kw) => cellVal.includes(kw))) {
          columnMap[field] = c;
          matchCount++;
          break;
        }
      }
    }

    // Require at least artg_id and product_name
    if (columnMap.artg_id !== undefined && columnMap.product_name !== undefined) {
      console.log(`Header detected at row ${i}, matched ${matchCount} columns`);
      console.log("Column mapping:", columnMap);
      return { headerIndex: i, columnMap };
    }
  }
  return null;
}

function parseRow(
  row: unknown[],
  columnMap: Record<string, number>
): ArtgProduct | null {
  const artgId = cleanString(row[columnMap.artg_id]);
  if (!artgId || !/^\d+$/.test(artgId)) return null;

  return {
    artg_id: artgId,
    product_name:
      columnMap.product_name !== undefined
        ? cleanString(row[columnMap.product_name])
        : null,
    sponsor_name:
      columnMap.sponsor_name !== undefined
        ? cleanString(row[columnMap.sponsor_name])
        : null,
    active_ingredients_raw:
      columnMap.active_ingredients_raw !== undefined
        ? cleanString(row[columnMap.active_ingredients_raw])
        : null,
    dosage_form:
      columnMap.dosage_form !== undefined
        ? cleanString(row[columnMap.dosage_form])
        : null,
    route:
      columnMap.route !== undefined ? cleanString(row[columnMap.route]) : null,
    indications_raw:
      columnMap.indications_raw !== undefined
        ? cleanString(row[columnMap.indications_raw])
        : null,
    product_type:
      columnMap.product_type !== undefined
        ? cleanString(row[columnMap.product_type])
        : null,
    status:
      columnMap.status !== undefined
        ? cleanString(row[columnMap.status])
        : null,
    source: "TGA_ARTG",
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`Reading XLSX from: ${XLSX_PATH}`);
  const workbook = XLSX.readFile(XLSX_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log(`Processing sheet: ${sheetName}`);

  const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
  });

  console.log(`Total rows in sheet: ${rows.length}`);

  const headerResult = detectHeaderRow(rows);
  if (!headerResult) {
    console.error("Could not detect header row with required columns");
    process.exit(1);
  }

  const { headerIndex, columnMap } = headerResult;
  const dataRows = rows.slice(headerIndex + 1);

  let rowsRead = 0;
  let rowsImported = 0;
  let rowsSkipped = 0;
  const products: ArtgProduct[] = [];

  for (const row of dataRows) {
    rowsRead++;
    if (isSkipRow(row)) {
      rowsSkipped++;
      continue;
    }

    const product = parseRow(row, columnMap);
    if (!product) {
      rowsSkipped++;
      continue;
    }

    products.push(product);
  }

  // Deduplicate by artg_id (keep last occurrence)
  const deduped = new Map<string, ArtgProduct>();
  for (const p of products) {
    deduped.set(p.artg_id, p);
  }
  const uniqueProducts = Array.from(deduped.values());
  console.log(`Parsed ${products.length} products, ${uniqueProducts.length} unique, upserting in batches...`);

  for (let i = 0; i < uniqueProducts.length; i += BATCH_SIZE) {
    const batch = uniqueProducts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("artg_products")
      .upsert(batch, { onConflict: "artg_id" });

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      process.exit(1);
    }

    rowsImported += batch.length;
    process.stdout.write(`\rImported: ${rowsImported}/${products.length}`);
  }

  console.log("\n");
  console.log("=== Import Complete ===");
  console.log(`rows_read: ${rowsRead}`);
  console.log(`rows_imported: ${rowsImported}`);
  console.log(`rows_skipped: ${rowsSkipped}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
