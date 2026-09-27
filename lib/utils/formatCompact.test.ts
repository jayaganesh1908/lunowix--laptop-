import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCompact } from "./formatters";
import { formatCompact as fromBarrel } from "./index";

/*
 * `formatCompact` used `Intl.NumberFormat`'s compact notation, and Node's ICU and
 * Chromium's disagree about `en-IN`: 8,616 came out "8.6K" on the server and
 * "8.6T" in the browser, so /admin failed hydration and React discarded the
 * subtree. These tests pin the arithmetic, which cannot vary by runtime, and pin
 * that the barrel and the module are the same function rather than two copies.
 */

describe("formatCompact", () => {
  it("is the same function through the barrel", () => {
    assert.equal(fromBarrel, formatCompact);
  });

  it("uses the Indian scale", () => {
    assert.equal(formatCompact(8616), "8.6K");
    assert.equal(formatCompact(99_256), "99.3K");
    assert.equal(formatCompact(240_000), "2.4L");
    assert.equal(formatCompact(12_000_000), "1.2Cr");
  });

  it("leaves numbers under a thousand alone", () => {
    assert.equal(formatCompact(0), "0");
    assert.equal(formatCompact(7), "7");
    assert.equal(formatCompact(999), "999");
  });

  it("drops a trailing .0 but keeps a real decimal", () => {
    assert.equal(formatCompact(2000), "2K");
    assert.equal(formatCompact(200_000), "2L");
    assert.equal(formatCompact(10_000_000), "1Cr");
    assert.equal(formatCompact(2400), "2.4K");
  });

  it("crosses each boundary at the right place", () => {
    assert.equal(formatCompact(999), "999");
    assert.equal(formatCompact(1000), "1K");
    assert.equal(formatCompact(99_999), "100K");
    assert.equal(formatCompact(100_000), "1L");
    assert.equal(formatCompact(9_999_999), "100L");
    assert.equal(formatCompact(10_000_000), "1Cr");
  });

  it("handles negatives, rather than printing -1.-2K", () => {
    assert.equal(formatCompact(-8616), "-8.6K");
    assert.equal(formatCompact(-500), "-500");
  });

  /*
   * The property the hydration bug came down to: the same input must give the
   * same string every time, with no dependence on locale data.
   */
  it("is deterministic and never consults Intl", () => {
    const source = formatCompact.toString();
    assert.ok(!source.includes("Intl"), "formatCompact must not use Intl");

    for (const value of [0, 999, 1000, 8616, 99_256, 240_000, 12_000_000]) {
      assert.equal(formatCompact(value), formatCompact(value));
    }
  });
});
