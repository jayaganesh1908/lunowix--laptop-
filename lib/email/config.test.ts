import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SHARED_SENDER,
  contactMailConfigured,
  contactToAddress,
  fromAddress,
  resetMailConfigured,
  senderIsShared,
} from "./config";

/*
 * These predicates decide whether a form claims to have sent mail. Getting one
 * wrong does not throw — it leaves someone refreshing an inbox — so the tests
 * pin the asymmetry between the two paths and the whitespace handling that a
 * pasted environment variable runs into.
 */

const MAIL_KEYS = ["RESEND_API_KEY", "CONTACT_TO_EMAIL", "RESEND_FROM_EMAIL"] as const;

/** Runs `body` with the mail variables set to exactly `env`, then restores them. */
function withMailEnv(env: Partial<Record<(typeof MAIL_KEYS)[number], string>>, body: () => void) {
  const saved = new Map<string, string | undefined>();
  for (const key of MAIL_KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
  try {
    for (const [key, value] of Object.entries(env)) process.env[key] = value;
    body();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("mail configuration", () => {
  it("treats nothing set as nothing configured", () => {
    withMailEnv({}, () => {
      assert.equal(resetMailConfigured(), false);
      assert.equal(contactMailConfigured(), false);
    });
  });

  /*
   * The asymmetry that matters: password reset mails the ACCOUNT HOLDER, so an
   * API key is enough. The contact form mails the team, so it also needs an
   * inbox. Collapsing these into one flag is how a health check reports mail as
   * working while the contact form still returns 501.
   */
  it("needs only a key for password reset, but a key and an inbox for contact", () => {
    withMailEnv({ RESEND_API_KEY: "re_test" }, () => {
      assert.equal(resetMailConfigured(), true);
      assert.equal(contactMailConfigured(), false, "no inbox to deliver to");
    });

    withMailEnv({ RESEND_API_KEY: "re_test", CONTACT_TO_EMAIL: "team@example.com" }, () => {
      assert.equal(contactMailConfigured(), true);
    });
  });

  /** An inbox with no key sends nothing, however complete it looks. */
  it("does not count an inbox without a key", () => {
    withMailEnv({ CONTACT_TO_EMAIL: "team@example.com" }, () => {
      assert.equal(contactMailConfigured(), false);
    });
  });

  /*
   * Pasting a key into a hosting dashboard is how a trailing newline or a stray
   * space gets in. Whitespace-only has to read as absent, not as a key that will
   * be rejected by the API on the first real send.
   */
  it("treats a whitespace-only value as absent and trims a padded one", () => {
    withMailEnv({ RESEND_API_KEY: "   " }, () => {
      assert.equal(resetMailConfigured(), false);
    });

    withMailEnv({ RESEND_API_KEY: " re_test\n", CONTACT_TO_EMAIL: " team@example.com " }, () => {
      assert.equal(resetMailConfigured(), true);
      assert.equal(contactToAddress(), "team@example.com");
    });
  });

  /*
   * The shared sender is the trap: Resend accepts the send and returns 200, but
   * delivers only to the address the account was signed up with. It has to be
   * distinguishable from a verified domain, or the deployment looks healthy right
   * up until the first real user asks for a reset.
   */
  it("distinguishes the shared sender from a verified domain", () => {
    withMailEnv({ RESEND_API_KEY: "re_test" }, () => {
      assert.equal(fromAddress(), SHARED_SENDER);
      assert.equal(senderIsShared(), true);
    });

    withMailEnv(
      {
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "Lunowix <hi@lunowix.com>",
      },
      () => {
        assert.equal(fromAddress(), "Lunowix <hi@lunowix.com>");
        assert.equal(senderIsShared(), false);
      },
    );
  });
});
