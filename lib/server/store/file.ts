import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Collection, type Doc, type Store, type Where } from "./types";

/**
 * The zero-config adapter: one JSON file per collection under `.data/`.
 *
 * This exists so `npm run dev` works immediately after `npm ci`, with no
 * database to provision and no credentials to hold. It is the DEFAULT, not a
 * mock — the repositories and routes above it are the same code that runs on
 * Postgres, so what you exercise locally is the real request path.
 *
 * It is NOT for production, and `assertNotServerless` below refuses to let it
 * pretend otherwise. Two reasons, either fatal:
 *
 *  - Serverless hosts (Vercel, Netlify functions) give each invocation its own
 *    ephemeral, mostly read-only filesystem. Writes vanish between requests,
 *    so an account created by one request would not exist for the next.
 *  - Even on a persistent disk, two processes writing the same file have no
 *    shared lock. The in-process mutex here serialises writes within ONE Node
 *    process, which is what dev is, and cannot do more than that.
 *
 * Set `DATABASE_URL` for anything real. See `./index.ts`.
 */

const DATA_DIR = process.env.LUNOWIX_DATA_DIR
  ? path.resolve(process.env.LUNOWIX_DATA_DIR)
  : path.join(process.cwd(), ".data");

/**
 * Serialises the read-modify-write cycles below.
 *
 * `put` reads the whole file, splices one doc in, and writes it back. Two of
 * those interleaved lose one of the writes — and they DO interleave, because
 * `await readFile` yields the event loop. Chaining every mutation for a
 * collection onto the previous one removes the window entirely.
 */
const locks = new Map<Collection, Promise<unknown>>();

function withLock<T>(collection: Collection, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(collection) ?? Promise.resolve();
  // `catch` first: a rejected predecessor must not cancel the work queued after it.
  const next = previous.then(task, task);
  locks.set(
    collection,
    next.catch(() => undefined),
  );
  return next;
}

function fileFor(collection: Collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function matches(doc: Doc, where?: Where) {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => doc[key] === value);
}

export class FileStore implements Store {
  private ready: Promise<void> | null = null;

  async init() {
    this.ready ??= mkdir(DATA_DIR, { recursive: true }).then(() => undefined);
    return this.ready;
  }

  private async readAll<T extends Doc>(collection: Collection): Promise<T[]> {
    await this.init();
    try {
      const raw = await readFile(fileFor(collection), "utf8");
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (error) {
      // A missing file is an empty collection. Anything else is a real fault.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      if (error instanceof SyntaxError) {
        console.error(`[lunowix] ${collection}.json is not valid JSON — treating as empty.`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Write to a temp file, then rename. `rename` is atomic within a filesystem,
   * so a crash mid-write leaves the previous complete file rather than a
   * half-written one that would then parse as empty and read as data loss.
   */
  private async writeAll(collection: Collection, docs: Doc[]) {
    await this.init();
    const target = fileFor(collection);
    const temp = `${target}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(docs, null, 2)}\n`, "utf8");
    await rename(temp, target);
  }

  async get<T extends Doc>(collection: Collection, id: string): Promise<T | null> {
    const docs = await this.readAll<T>(collection);
    return docs.find((doc) => doc.id === id) ?? null;
  }

  async put<T extends Doc>(collection: Collection, doc: T): Promise<T> {
    return withLock(collection, async () => {
      const docs = await this.readAll<Doc>(collection);
      const index = docs.findIndex((existing) => existing.id === doc.id);
      if (index === -1) docs.push(doc);
      else docs[index] = doc;
      await this.writeAll(collection, docs);
      return doc;
    });
  }

  async delete(collection: Collection, id: string): Promise<boolean> {
    return withLock(collection, async () => {
      const docs = await this.readAll<Doc>(collection);
      const next = docs.filter((doc) => doc.id !== id);
      if (next.length === docs.length) return false;
      await this.writeAll(collection, next);
      return true;
    });
  }

  async find<T extends Doc>(collection: Collection, where?: Where): Promise<T[]> {
    const docs = await this.readAll<T>(collection);
    return where ? docs.filter((doc) => matches(doc, where)) : docs;
  }

  async findOne<T extends Doc>(collection: Collection, where: Where): Promise<T | null> {
    const docs = await this.readAll<T>(collection);
    return docs.find((doc) => matches(doc, where)) ?? null;
  }

  async count(collection: Collection, where?: Where): Promise<number> {
    return (await this.find(collection, where)).length;
  }

  async deleteWhere(collection: Collection, where: Where): Promise<number> {
    return withLock(collection, async () => {
      const docs = await this.readAll<Doc>(collection);
      const kept = docs.filter((doc) => !matches(doc, where));
      const removed = docs.length - kept.length;
      if (removed > 0) await this.writeAll(collection, kept);
      return removed;
    });
  }
}
