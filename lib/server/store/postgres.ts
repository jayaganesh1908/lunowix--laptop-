import "server-only";

import { Pool, type PoolConfig } from "pg";
import { type Collection, type Doc, type Store, type Where } from "./types";

/**
 * The production adapter. One table, `documents`, holding every collection:
 *
 *   collection text, id text, data jsonb, updated_at timestamptz
 *
 * A table per collection would buy foreign keys and column types, and cost the
 * single `Store` seam that lets the repositories run unchanged on the dev file
 * store. The working set is small and its shape is already enforced above this
 * layer by Zod at the route boundary and by TypeScript in the repositories, so
 * the jsonb column is not where the schema lives — it is just where it lands.
 *
 * Any Postgres works, so the free tiers all do: Neon, Supabase, Railway,
 * Render, or a local `postgres:16` container.
 */

const CONNECTION_STRING = process.env.DATABASE_URL ?? "";

/**
 * Hosted Postgres almost always terminates TLS with a certificate this process
 * has no root for, and `pg` rejects that by default. `DATABASE_SSL=disable`
 * exists for a local container, which speaks plaintext and would otherwise fail
 * the handshake instead.
 *
 * `rejectUnauthorized: false` encrypts the connection but does not authenticate
 * the server, so it does not protect against an active man-in-the-middle. It is
 * what every managed provider's own connection snippet does. Set
 * `DATABASE_SSL=verify` with a real root bundle in `PGSSLROOTCERT` if the
 * network between the app and the database is not trusted.
 */
function sslConfig(): PoolConfig["ssl"] {
  const mode = process.env.DATABASE_SSL ?? "relaxed";
  if (mode === "disable") return undefined;
  if (mode === "verify") return { rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

/*
 * Module scope, so the pool survives between requests.
 *
 * Next.js route handlers run many times in one process. A pool created per
 * request opens a fresh TCP connection each time and never returns it, which
 * exhausts a free tier's connection cap within a few page loads.
 */
let pool: Pool | null = null;

function getPool(): Pool {
  pool ??= new Pool({
    connectionString: CONNECTION_STRING,
    ssl: sslConfig(),
    // Free tiers cap connections hard, and serverless multiplies the process
    // count. A small ceiling per process is the safe default.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

/**
 * `where` becomes a jsonb containment test: `data @> '{"email":"..."}'`.
 *
 * Containment is one indexable predicate whatever the key, so the GIN index
 * below serves every lookup the repositories make without a per-field index.
 * The filter is passed as a PARAMETER, never interpolated — the keys come from
 * repository code but the values come from request bodies.
 */
function containment(where: Where | undefined): { clause: string; params: unknown[] } {
  if (!where || Object.keys(where).length === 0) return { clause: "", params: [] };
  return { clause: " and data @> $2::jsonb", params: [JSON.stringify(where)] };
}

export class PostgresStore implements Store {
  private ready: Promise<void> | null = null;

  async init() {
    this.ready ??= (async () => {
      await getPool().query(`
        create table if not exists documents (
          collection text not null,
          id         text not null,
          data       jsonb not null,
          updated_at timestamptz not null default now(),
          primary key (collection, id)
        );
        create index if not exists documents_data_gin
          on documents using gin (data jsonb_path_ops);
      `);
    })();
    return this.ready;
  }

  async get<T extends Doc>(collection: Collection, id: string): Promise<T | null> {
    await this.init();
    const { rows } = await getPool().query<{ data: T }>(
      "select data from documents where collection = $1 and id = $2",
      [collection, id],
    );
    return rows[0]?.data ?? null;
  }

  async put<T extends Doc>(collection: Collection, doc: T): Promise<T> {
    await this.init();
    await getPool().query(
      `insert into documents (collection, id, data)
       values ($1, $2, $3::jsonb)
       on conflict (collection, id)
       do update set data = excluded.data, updated_at = now()`,
      [collection, doc.id, JSON.stringify(doc)],
    );
    return doc;
  }

  async delete(collection: Collection, id: string): Promise<boolean> {
    await this.init();
    const { rowCount } = await getPool().query(
      "delete from documents where collection = $1 and id = $2",
      [collection, id],
    );
    return (rowCount ?? 0) > 0;
  }

  async find<T extends Doc>(collection: Collection, where?: Where): Promise<T[]> {
    await this.init();
    const { clause, params } = containment(where);
    const { rows } = await getPool().query<{ data: T }>(
      `select data from documents where collection = $1${clause} order by updated_at desc`,
      [collection, ...params],
    );
    return rows.map((row) => row.data);
  }

  async findOne<T extends Doc>(collection: Collection, where: Where): Promise<T | null> {
    await this.init();
    const { clause, params } = containment(where);
    const { rows } = await getPool().query<{ data: T }>(
      `select data from documents where collection = $1${clause} limit 1`,
      [collection, ...params],
    );
    return rows[0]?.data ?? null;
  }

  async count(collection: Collection, where?: Where): Promise<number> {
    await this.init();
    const { clause, params } = containment(where);
    const { rows } = await getPool().query<{ n: string }>(
      `select count(*)::text as n from documents where collection = $1${clause}`,
      [collection, ...params],
    );
    // `count(*)` is bigint; `pg` hands those back as strings to avoid precision loss.
    return Number(rows[0]?.n ?? 0);
  }

  async deleteWhere(collection: Collection, where: Where): Promise<number> {
    await this.init();
    const { clause, params } = containment(where);
    const { rowCount } = await getPool().query(
      `delete from documents where collection = $1${clause}`,
      [collection, ...params],
    );
    return rowCount ?? 0;
  }
}
