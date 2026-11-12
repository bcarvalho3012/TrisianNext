#!/usr/bin/env node
// Copy-freeze check.
//
// Extracts every piece of reader-facing text from each HTML page (title, meta
// descriptions and social tags, visible text, alt text, aria-labels,
// placeholders and JSON-LD) and compares it with the same page on a reference
// git ref (default: main).
//
// Design work may change markup, classes, CSS and JS freely. If any sentence a
// reader or a search engine sees changes, this script exits 1 and prints a diff.
// The comparison ignores order, so sections may move; it is strict about content.
//
// Usage:  node tools/copycheck.mjs [--ref main] [--verbose]
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const ref = args.includes("--ref") ? args[args.indexOf("--ref") + 1] : "main";
const verbose = args.includes("--verbose");

const META_KEEP = new Set(["description", "og:title", "og:description", "twitter:title", "twitter:description"]);
const SKIP = new Set(["script", "style", "noscript", "svg", "template"]);
const BLOCK = new Set("p li h1 h2 h3 h4 h5 h6 div section article header footer nav dt dd td th tr figcaption blockquote button a summary label option title main aside form fieldset legend details".split(" "));
const ATTRS = ["alt", "aria-label", "title", "placeholder"];

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "\u2019", lsquo: "\u2018", rdquo: "\u201d", ldquo: "\u201c", hellip: "\u2026", ndash: "\u2013", mdash: "\u2014", copy: "\u00a9", trade: "\u2122", reg: "\u00ae" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e.toLowerCase()] ?? m;
});
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();

function parseAttrs(s) {
  const out = {};
  const re = /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
}

function extract(html) {
  const lines = [];
  let buf = "";
  const flush = () => { const t = norm(buf); buf = ""; if (t) lines.push(t); };
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|([^<]+)/g;
  let m, skip = null, ld = false;
  while ((m = re.exec(html))) {
    const [raw, tagRaw, attrRaw, text] = m;
    if (raw.startsWith("<!")) continue;
    if (text !== undefined) {
      if (ld) { const t = norm(text); if (t) lines.push("ld+json: " + t); continue; }
      if (!skip) buf += text;
      continue;
    }
    const tag = tagRaw.toLowerCase();
    const closing = raw[1] === "/";
    if (closing) {
      if (skip === tag) { skip = null; if (tag === "script") ld = false; }
      if (BLOCK.has(tag)) flush();
      continue;
    }
    const a = parseAttrs(attrRaw);
    if (tag === "meta") {
      const key = (a.name || a.property || "").toLowerCase();
      if (META_KEEP.has(key)) lines.push(`meta ${key}: ${norm(a.content || "")}`);
      continue;
    }
    if (tag === "input" && !["hidden", "submit", "button"].includes((a.type || "").toLowerCase()) && a.value) lines.push("value: " + norm(a.value));
    for (const k of ATTRS) if (a[k] && norm(a[k])) lines.push(`${k}: ${norm(a[k])}`);
    if (BLOCK.has(tag)) flush();
    if (tag === "br") buf += " ";
    if (SKIP.has(tag) && !skip) {
      skip = tag;
      if (tag === "script" && (a.type || "").toLowerCase() === "application/ld+json") ld = true;
    }
  }
  flush();
  return lines;
}

function pages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "assets" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out.sort();
}

function gitShow(rel) {
  try { return execFileSync("git", ["show", `${ref}:${rel}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
}

// Minimal unified-ish diff on line arrays (LCS).
function diff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push("- " + a[i++]);
    else out.push("+ " + b[j++]);
  }
  while (i < n) out.push("- " + a[i++]);
  while (j < m) out.push("+ " + b[j++]);
  return out;
}

let bad = 0;
const list = pages(ROOT);
for (const p of list) {
  const rel = relative(ROOT, p).split("\\").join("/");
  const base = gitShow(rel);
  if (base === null) { console.log(`NEW   ${rel} (not on ${ref}; skipped)`); continue; }
  const a = extract(base), b = extract(readFileSync(p, "utf8"));
  const sa = [...a].sort(), sb = [...b].sort();
  if (sa.length === sb.length && sa.every((l, k) => l === sb[k])) { if (verbose) console.log(`ok    ${rel} (${b.length} text lines)`); continue; }
  bad++;
  console.log(`DIFF  ${rel}`);
  for (const l of diff(a, b)) console.log("   " + l);
}
console.log(`\n${list.length} pages checked, ${bad} with copy changes.`);
process.exit(bad ? 1 : 0);
