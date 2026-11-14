import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
// Run with: node --env-file=.env scripts/import-firms.mjs (Node >= 20.6)
const dryRun = process.argv.includes("--dry-run");
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!url || !key || url.includes("YOUR_PROJECT"))) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const db = dryRun ? null : createClient(url, key, { auth: { persistSession: false } });
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
  if (quoted) throw Error("Unterminated quoted CSV field");
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
let rejectedTotal = 0;
if (!files.length) throw Error("No CSV files found in data/raw");
console.log(dryRun ? "DRY RUN: validation only; no database client or writes." : "Importing CSV files");
for (const file of files) {
  const rel = relative("data/raw", file).replaceAll("\\", "/");
  let accepted = 0;
  let rejected = 0;
  const reasons = {};
  const rows = csvRows(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  const header = (rows.shift() || []).map((s) => s.trim().toLowerCase());
  const missingHeaders = ["latitude", "longitude", "acq_date"].filter((h) => !header.includes(h));
  if (missingHeaders.length) throw Error(`${rel}: missing required headers: ${missingHeaders.join(", ")}`);
  let batch = [];
  let line = 1;
  async function flush() {
    if (!batch.length) return;
    if (dryRun) {
      processed += batch.length;
      batch = [];
      return;
    }
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
    const issues = [];
    if (values.length !== header.length) issues.push("column count mismatch");
    if (lat === null || lat < -90 || lat > 90) issues.push("missing or invalid latitude");
    if (lon === null || lon < -180 || lon > 180) issues.push("missing or invalid longitude");
    const date = new Date(r.acq_date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.acq_date) ||
        !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== r.acq_date)
      issues.push("missing or invalid acquisition date");
    if (r.acq_time && (!/^\d{1,4}$/.test(r.acq_time) ||
        Number(r.acq_time.padStart(4, "0").slice(0, 2)) > 23 ||
        Number(r.acq_time.padStart(4, "0").slice(2)) > 59))
      issues.push("invalid acquisition time");
    if (r.confidence && (sensor === "MODIS"
        ? !/^\d+$/.test(r.confidence) || Number(r.confidence) > 100
        : !["l", "n", "h"].includes(r.confidence)))
      issues.push("invalid sensor confidence");
    if (issues.length) {
      rejected++;
      for (const reason of issues) reasons[reason] = (reasons[reason] || 0) + 1;
      continue;
    }
    accepted++;
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
  rejectedTotal += rejected;
  console.log(`${rel}: accepted=${accepted}, rejected=${rejected}; rejection reasons=${JSON.stringify(reasons)}`);
}
console.log(`${dryRun ? "Validated" : "Upserted"} ${processed} accepted rows; ${rejectedTotal} rejected rows total. Reason counts may overlap for a rejected row.`);
if (rejectedTotal) process.exitCode = 1;
