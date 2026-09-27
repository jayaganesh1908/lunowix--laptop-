/**
 * The storage contract every adapter implements.
 *
 * Deliberately document-shaped rather than relational. The backend's whole
 * working set — accounts, sessions, saved products, reviews, subscribers, view
 * counters — is a handful of small collections keyed by id, with at most one
 * secondary lookup each (a user by email, a session by token, reviews by
 * product). Writing that against `get`/`put`/`find` lets every repository be
 * written ONCE and run unchanged on either adapter, which is the only reason
 * a zero-config dev store and a real Postgres can coexist without two copies
 * of every query drifting apart.
 *
 * The product catalogue is NOT in here. It ships as typed modules in
 * `lib/data`, it is the same for every visitor, and it is what lets the detail
 * pages stay statically pre-rendered. A database would make 74 static pages
 * dynamic and buy nothing.
 */

/** A stored record. `id` is unique within its collection. */
export interface Doc {
  id: string;
  [key: string]: unknown;
}

export type Collection =
  | "users"
  | "sessions"
  | "wishlist"
  | "compareHistory"
  | "reviews"
  | "newsletter"
  | "views"
  | "passwordResets"
  | "identities";

/**
 * A field equality filter. Every value is compared with `===` after a JSON
 * round trip, so only JSON scalars are meaningful here — which is all the
 * repositories need.
 */
export type Where = Record<string, string | number | boolean | null>;

export interface Store {
  get<T extends Doc>(collection: Collection, id: string): Promise<T | null>;
  /** Insert or replace by `doc.id`. */
  put<T extends Doc>(collection: Collection, doc: T): Promise<T>;
  delete(collection: Collection, id: string): Promise<boolean>;
  /** Every doc matching `where`, or the whole collection when it is omitted. */
  find<T extends Doc>(collection: Collection, where?: Where): Promise<T[]>;
  /** The first match, or null. Adapters may optimise; callers may not assume an order. */
  findOne<T extends Doc>(collection: Collection, where: Where): Promise<T | null>;
  count(collection: Collection, where?: Where): Promise<number>;
  /** Removes every doc matching `where` and returns how many went. */
  deleteWhere(collection: Collection, where: Where): Promise<number>;
  /** Create tables/files. Safe to call repeatedly. */
  init(): Promise<void>;
}
