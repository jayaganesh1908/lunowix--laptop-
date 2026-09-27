import "server-only";

import { NextResponse } from "next/server";
import { type ZodType, type z } from "zod";

/**
 * One response envelope for every route, so the client has one thing to parse.
 *
 * Success: the payload, as-is.
 * Failure: `{ error: string, issues?: ... }` — `error` is always a sentence
 * that can be shown to a person without rewriting it on the client.
 */

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export const unauthorized = () => fail("You need to be signed in to do that.", 401);
export const forbidden = () => fail("You do not have access to that.", 403);
export const notFound = (what = "That") => fail(`${what} could not be found.`, 404);

/**
 * Parses and validates a JSON body in one step.
 *
 * Returns a discriminated union rather than throwing, so a route reads as a
 * straight line of guards instead of a try/catch around its own logic.
 *
 * 400 for "that was not JSON", 422 for "that was JSON but the fields are
 * wrong" — the client tells those apart to decide between a field-level message
 * and a general one.
 */
export async function readJson<S extends ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { ok: false, response: fail("Expected a JSON body.", 400) };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      response: fail("Some fields need another look.", 422, {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      }),
    };
  }

  return { ok: true, data: parsed.data };
}

/**
 * Wraps a handler so an unexpected throw becomes a 500 with nothing leaked.
 *
 * A raw exception reaching the client can carry a connection string or a file
 * path in its message. The detail goes to the server log, where it belongs, and
 * the caller gets a sentence.
 */
export function guarded<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>,
): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("[lunowix] Unhandled route error:", error);
      return fail("Something went wrong on our side. Please try again.", 500);
    }
  };
}
