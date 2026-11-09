/**
 * Re-index orphaned files in uploads/ back into the documents table.
 *
 * Why this exists: the Postgres -> SQLite conversion (commit 46852b1) created a
 * fresh, empty database.sqlite. The files that had already been uploaded stayed
 * on disk in uploads/, but the rows describing them were never carried over, so
 * the document library renders empty while real files sit unreferenced.
 *
 * This script walks uploads/, finds every file that no documents row points at,
 * and recreates a row for it the same way POST /api/documents/upload would have.
 *
 * Multer's disk storage renamed every upload to "<epoch-ms>-<random><ext>", so
 * the original filename is unrecoverable. We reconstruct what we can:
 *   - uploaded/created date  -> the epoch-ms prefix in the stored filename
 *   - file type + size       -> extension and stat()
 *   - title + category       -> the document's own text (docx/xlsx/pptx are ZIP
 *                               containers; pdf via its /Title metadata)
 * Anything we cannot recover is marked in `metadata` so it is obvious in the UI
 * that the row was recovered rather than uploaded normally.
 *
 * Usage:
 *   npm run db:reindex              # apply changes
 *   npm run db:reindex -- --dry-run # report only, write nothing
 *
 * Safe to re-run: files already referenced by a documents row are skipped.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { documents, folders, users } from "@shared/schema";
import { db, dbPath, initializeDatabase } from "../server/db";
import { storage } from "../server/storage";

const repoRoot = path.resolve(import.meta.dirname, "..");
const uploadDir = path.join(repoRoot, "uploads");

/** Extension -> fileType, matching what POST /api/documents/upload stores. */
const FILE_TYPES = new Map<string, string>([
  [".pdf", "pdf"],
  [".doc", "docx"],
  [".docx", "docx"],
  [".xls", "xlsx"],
  [".xlsx", "xlsx"],
  [".ppt", "pptx"],
  [".pptx", "pptx"],
]);

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/** The only categories the client UI knows how to label and filter on. */
const CATEGORIES = [
  "press_releases",
  "memos",
  "internal_letters",
  "contracts",
  "follow_ups",
] as const;
type Category = (typeof CATEGORIES)[number];

const dryRun = process.argv.slice(2).some((a) => a === "--dry-run" || a === "-n");

// ---------------------------------------------------------------------------
// Minimal ZIP reader (docx/xlsx/pptx are ZIP containers). Uses the central
// directory because local headers may defer sizes to a data descriptor.
// ---------------------------------------------------------------------------
function readZipEntry(buf: Buffer, entryName: string): Buffer | null {
  let eocd = -1;
  const floor = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= floor; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  if (offset === 0xffffffff) return null; // ZIP64: not worth supporting here

  for (let n = 0; n < entryCount; n++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== 0x02014b50) break;

    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);

    if (name === entryName) {
      const localNameLen = buf.readUInt16LE(localOffset + 26);
      const localExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLen + localExtraLen;
      const raw = buf.subarray(start, start + compressedSize);
      if (method === 0) return Buffer.from(raw);
      if (method === 8) {
        try {
          return zlib.inflateRawSync(raw);
        } catch {
          return null;
        }
      }
      return null;
    }

    offset += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

/** Pull readable text out of an Office file, one line per paragraph/cell. */
function extractOfficeText(filePath: string, ext: string): string | null {
  let buf: Buffer;
  try {
    buf = fs.readFileSync(filePath);
  } catch {
    return null;
  }

  // The tag must match exactly: a loose `<w:t[^>]*>` also matches <w:tbl>, <w:tc>,
  // <w:tr> and <w:tab/>, which drags table markup into the "text".
  const collect = (xml: string, tag: string): string[] =>
    xml
      .split(/<\/w:p>|<\/a:p>|<\/row>/)
      .map((chunk) => {
        const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
        const runs = [...chunk.matchAll(re)].map((m) => m[1]);
        return decodeXmlEntities(runs.join("")).replace(/\s+/g, " ").trim();
      })
      .filter(Boolean);

  if (ext === ".docx") {
    const xml = readZipEntry(buf, "word/document.xml");
    return xml ? collect(xml.toString("utf8"), "w:t").join("\n") || null : null;
  }
  if (ext === ".pptx") {
    const xml = readZipEntry(buf, "ppt/slides/slide1.xml");
    return xml ? collect(xml.toString("utf8"), "a:t").join("\n") || null : null;
  }
  if (ext === ".xlsx") {
    const xml = readZipEntry(buf, "xl/sharedStrings.xml");
    if (!xml) return null;
    const values = [...xml.toString("utf8").matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) =>
      decodeXmlEntities(m[1]).trim(),
    );
    return values.filter(Boolean).join("\n") || null;
  }
  if (ext === ".pdf") {
    // Only the metadata title is cheap to reach; full PDF text needs a parser.
    const head = buf.subarray(0, Math.min(buf.length, 1_000_000)).toString("latin1");
    const m = head.match(/\/Title\s*\(((?:[^()\\]|\\.)*)\)/);
    if (m) {
      const title = m[1].replace(/\\([()\\])/g, "$1").trim();
      return title || null;
    }
  }
  return null;
}

const BOILERPLATE =
  /^(for immediate release|press release|memorandum|memo|confidential|internal|draft|re:|date:|to:|from:|page \d+.*|[\d\s.,\-–—/]+)$/i;

function deriveTitle(text: string | null, fileName: string): { title: string; from: string } {
  if (text) {
    const line = text
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .find((l) => l.length >= 4 && l.length <= 160 && !BOILERPLATE.test(l));
    if (line) return { title: line.slice(0, 120), from: "document text" };
  }
  return { title: `Recovered upload ${fileName}`, from: "filename" };
}

function inferCategory(text: string | null, fileName: string): { category: Category; why: string } {
  const hay = `${fileName}\n${(text ?? "").slice(0, 6000)}`;
  const tests: Array<[RegExp, Category, string]> = [
    [/for immediate release|press release/i, "press_releases", "press-release boilerplate"],
    [/memorandum|\bmemo\b/i, "memos", "memo heading"],
    [/follow[\s_-]?up/i, "follow_ups", "follow-up wording"],
    [/\b(contract|agreement|terms and conditions|statement of work|scope of work)\b/i, "contracts", "contract wording"],
    [/\b(dear [a-z]|to whom it may concern|sincerely|yours faithfully|regards)\b/i, "internal_letters", "letter format"],
  ];
  for (const [re, category, why] of tests) {
    if (re.test(hay)) return { category, why };
  }
  return { category: "memos", why: "no recognisable markers, defaulting to memos" };
}

/** Multer stored uploads as "<epoch-ms>-<random><ext>"; recover that timestamp. */
function recoverUploadedAt(fileName: string, stat: fs.Stats): { date: Date; from: string } {
  const m = fileName.match(/^(\d{13})-/);
  if (m) {
    const ms = Number(m[1]);
    // Reject implausible values rather than writing a year-58824 date.
    if (ms > 946_684_800_000 && ms < Date.now() + 86_400_000) {
      return { date: new Date(ms), from: "filename timestamp" };
    }
  }
  return { date: stat.mtime, from: "file mtime" };
}

async function main() {
  console.log(`Database:  ${dbPath}`);
  console.log(`Uploads:   ${uploadDir}`);
  console.log(`Mode:      ${dryRun ? "DRY RUN (no writes)" : "apply"}\n`);

  // Creates tables and seeds the default admin when run against a fresh clone.
  initializeDatabase();

  if (!fs.existsSync(uploadDir)) {
    console.log(`Nothing to do: ${uploadDir} does not exist.`);
    return;
  }

  const existing = await db.select({ id: documents.id, filePath: documents.filePath }).from(documents);
  const referenced = new Set<string>();
  for (const row of existing) {
    referenced.add(row.filePath);
    referenced.add(path.basename(row.filePath));
  }

  // Attribute recovered documents to an admin, and file them in a real folder.
  const allUsers = await db.select().from(users);
  const owner =
    allUsers.find((u) => u.role === "super_admin" && u.isActive) ?? allUsers.find((u) => u.isActive) ?? allUsers[0];
  if (!owner) {
    console.error("No user to attribute recovered documents to. Aborting.");
    process.exitCode = 1;
    return;
  }

  const allFolders = await db.select().from(folders);
  const folder = allFolders.find((f) => /general/i.test(f.name)) ?? allFolders[0] ?? null;

  console.log(`Existing document rows: ${existing.length}`);
  console.log(`Attributing to:         ${owner.name} (${owner.loginCode})`);
  console.log(`Filing into folder:     ${folder ? `${folder.name}` : "(none available)"}\n`);

  const entries = fs
    .readdirSync(uploadDir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith("."));

  const orphans: string[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    const ext = path.extname(entry.name).toLowerCase();
    if (FILE_TYPES.has(ext) && !referenced.has(entry.name)) {
      orphans.push(entry.name);
    } else {
      skipped.push(referenced.has(entry.name) ? `${entry.name} (already indexed)` : `${entry.name} (unsupported type ${ext || "none"})`);
    }
  }

  for (const s of skipped) console.log(`skip: ${s}`);
  if (skipped.length) console.log();

  if (orphans.length === 0) {
    console.log("No orphaned files found. The library matches uploads/ already.");
    reportBrokenLinks(existing.map((r) => r.filePath));
    return;
  }

  console.log(`Found ${orphans.length} orphaned file(s). Re-indexing:\n`);

  let indexed = 0;
  for (const name of orphans.sort()) {
    const filePath = path.join(uploadDir, name);
    const ext = path.extname(name).toLowerCase();
    const fileType = FILE_TYPES.get(ext)!;
    const stat = fs.statSync(filePath);
    const uploadedAt = recoverUploadedAt(name, stat);
    const text = extractOfficeText(filePath, ext);
    const { title, from } = deriveTitle(text, name);
    const { category, why } = inferCategory(text, name);

    console.log(`  file:      ${name}`);
    console.log(`  title:     ${title}   [from ${from}]`);
    console.log(`  category:  ${category}   [${why}]`);
    console.log(`  type/size: ${fileType} / ${stat.size} bytes`);
    console.log(`  dated:     ${uploadedAt.date.toISOString()}   [from ${uploadedAt.from}]`);
    if (text) {
      const preview = text.split("\n").slice(0, 2).join(" | ").slice(0, 110);
      console.log(`  text:      "${preview}${text.length > 110 ? "…" : ""}"`);
    } else {
      console.log(`  text:      (could not extract — title/category are best-effort)`);
    }

    if (dryRun) {
      console.log("  -> dry run, not written\n");
      continue;
    }

    const doc = await storage.createDocument({
      name: title,
      originalName: title.includes(".") ? title : `${title}${ext}`,
      description:
        "Recovered from uploads/ by scripts/reindex-uploads.ts — the original filename was discarded by the upload handler, so the title and category were inferred from the file contents.",
      category,
      fileType,
      fileSize: stat.size,
      filePath,
      folderId: folder?.id ?? null,
      uploadedBy: owner.id,
      createdAt: uploadedAt.date,
      updatedAt: uploadedAt.date,
      metadata: {
        mimetype: MIME_TYPES[fileType] ?? "application/octet-stream",
        uploadedAt: uploadedAt.date.toISOString(),
        recovered: true,
        recoveredAt: new Date().toISOString(),
        storedFileName: name,
        titleSource: from,
        categoryReason: why,
        textExtracted: Boolean(text),
      },
    });

    await storage.createActivityLog({
      userId: owner.id,
      action: "reindex",
      resourceType: "document",
      resourceId: doc.id,
      details: {
        documentName: doc.name,
        fileSize: doc.fileSize,
        category: doc.category,
        storedFileName: name,
        recoveredFrom: "uploads/",
      },
    });

    console.log(`  -> created document ${doc.id}\n`);
    indexed++;
  }

  reportBrokenLinks(existing.map((r) => r.filePath));

  const total = await db.select({ id: documents.id }).from(documents);
  console.log(
    dryRun
      ? `Dry run complete: ${orphans.length} file(s) would be indexed.`
      : `Done: indexed ${indexed} document(s). documents table now has ${total.length} row(s).`,
  );
}

/** Rows pointing at files that are not on disk — the mirror-image problem. */
function reportBrokenLinks(filePaths: string[]) {
  const broken = filePaths.filter(
    (p) =>
      !p.startsWith("templates/") &&
      !p.includes("missing/file_needs_reupload") &&
      !fs.existsSync(path.isAbsolute(p) ? p : path.join(repoRoot, p)),
  );
  if (broken.length === 0) return;
  console.log(`\nWarning: ${broken.length} document row(s) point at files missing from disk:`);
  for (const p of broken) console.log(`  - ${p}`);
  console.log("These will 404 on download. Re-upload them from the document's Update button.");
}

main().catch((err) => {
  console.error("reindex-uploads failed:", err);
  process.exitCode = 1;
});
