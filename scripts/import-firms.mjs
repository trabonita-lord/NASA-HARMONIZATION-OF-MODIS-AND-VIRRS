import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
// Run with: node --env-file=.env scripts/import-firms.mjs (Node >= 20.6)
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || url.includes("YOUR_PROJECT")) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
function csvRows(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
const files = [];
function walk(dir) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (d.name.endsWith(".csv")) files.push(p);
  }
}
walk("data/raw");
const num = (v) =>
  v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;
let processed = 0;
for (const file of files) {
  const rows = csvRows(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  const header = rows.shift().map((s) => s.trim().toLowerCase());
  let batch = [];
  let line = 1;
  async function flush() {
    if (!batch.length) return;
    const { error } = await db
      .from("fire_observations")
      .upsert(batch, { onConflict: "source_key" });
    if (error) throw Error(`${file}: ${error.message}`);
    processed += batch.length;
    batch = [];
  }
  for (const values of rows) {
    line++;
    const r = Object.fromEntries(
      header.map((h, i) => [h, (values[i] || "").trim()]),
    );
    const sensor = file.toLowerCase().includes("modis") ? "MODIS" : "VIIRS";
    const lat = num(r.latitude),
      lon = num(r.longitude);
    if (lat === null || lon === null || !r.acq_date) continue;
    const rel = relative("data/raw", file).replaceAll("\\", "/");
    batch.push({
      source_key: createHash("sha256")
        .update(rel + ":" + line)
        .digest("hex"),
      sensor,
      satellite: r.satellite || null,
      instrument: r.instrument || null,
      latitude: lat,
      longitude: lon,
      acq_date: r.acq_date,
      acq_time: r.acq_time || null,
      frp: num(r.frp),
      confidence: r.confidence || null,
      brightness: num(r.brightness || r.bright_ti4),
      bright_t31: num(r.bright_t31 || r.bright_ti5),
      scan: num(r.scan),
      track: num(r.track),
      daynight: r.daynight || null,
      version: r.version || null,
      source_file: rel,
    });
    if (batch.length === 500) await flush();
  }
  await flush();
  console.log(`Imported ${rel}`);
}
console.log(`Upserted ${processed} rows total`);
