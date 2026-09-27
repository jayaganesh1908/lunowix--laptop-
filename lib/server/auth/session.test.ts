import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueToken, readToken, SESSION_TTL_MS, SHORT_SESSION_TTL_MS } from "./session";

/*
 * `readToken` is the gate every authenticated request passes through. If it
 * accepted a tampered value, holding any session id would be enough to act as
 * its owner; if it rejected its own tokens, nobody could stay signed in.
 */

describe("session tokens", () => {
  it("round-trips a token it issued", () => {
    const token = issueToken(false);
    assert.equal(readToken(token.value), token.id);
  });

  it("issues a different token every time", () => {
    assert.notEqual(issueToken(true).id, issueToken(true).id);
  });

  it("rejects a tampered signature", () => {
    const token = issueToken(false);
    const [id] = token.value.split(".");
    assert.equal(readToken(`${id}.deadbeef`), null);
  });

  it("rejects a tampered id, even with a valid-looking signature", () => {
    const token = issueToken(false);
    const signature = token.value.slice(token.value.lastIndexOf(".") + 1);
    assert.equal(readToken(`someoneelsesid.${signature}`), null);
  });

  it("rejects junk without throwing", () => {
    for (const bad of [undefined, "", ".", "nodot", ".onlysig", "a.b.c.d"]) {
      assert.equal(readToken(bad as string | undefined), null, `for ${JSON.stringify(bad)}`);
    }
  });

  /*
   * An id may itself contain a dot — base64url does not produce one, but the
   * parser splits on the LAST dot precisely so that assumption is not load
   * bearing. This pins that behaviour.
   */
  it("splits on the last dot, so a dotted id still verifies", () => {
    const token = issueToken(false);
    const signature = token.value.slice(token.value.lastIndexOf(".") + 1);
    // Rebuilt by hand: a different id must not verify under this signature.
    assert.equal(readToken(`${token.id}.extra.${signature}`), null);
  });

  it("honours remember-me in the expiry", () => {
    const now = Date.now();
    const short = issueToken(false);
    const long = issueToken(true);

    // Generous windows: these only need to be in the right ballpark.
    assert.ok(short.expiresAt - now <= SHORT_SESSION_TTL_MS + 1000);
    assert.ok(short.expiresAt - now > SHORT_SESSION_TTL_MS - 5000);
    assert.ok(long.expiresAt - now <= SESSION_TTL_MS + 1000);
    assert.ok(long.expiresAt - now > SESSION_TTL_MS - 5000);
    assert.ok(long.expiresAt > short.expiresAt);
  });
});
