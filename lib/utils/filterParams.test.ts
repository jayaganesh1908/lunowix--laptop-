import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFilters, parsePage, parseSort, serializeFilters } from "@/lib/utils";
import { defaultFilters, facets } from "@/lib/data/laptops";
import type { LaptopFilters } from "@/lib/types";

/*
 * Filters live in the URL so a filtered view can be shared or bookmarked, which
 * makes the round-trip the thing worth testing: `serialize → parse` must return
 * what went in. When it does not, a shared link quietly drops a filter and
 * shows the recipient a different result set than the sender saw — a failure
 * with no error and no visible symptom on the sending side.
 */

const asFilters = (overrides: Partial<LaptopFilters> = {}): LaptopFilters => ({
  ...defaultFilters,
  ...overrides,
});

const roundTrip = (filters: LaptopFilters) =>
  parseFilters(new URLSearchParams(serializeFilters(filters, "newest", 1)));

describe("filter URL round-trip", () => {
  it("returns the defaults for an empty query string", () => {
    assert.deepEqual(parseFilters(new URLSearchParams()), defaultFilters);
  });

  it("writes nothing for default filters", () => {
    assert.equal(serializeFilters(defaultFilters, "newest", 1), "");
  });

  it("preserves list filters", () => {
    const filters = asFilters({
      brands: ["Lenovo", "HP"],
      ram: [8, 16],
      storage: [512],
    });
    const parsed = roundTrip(filters);

    assert.deepEqual(parsed.brands, ["Lenovo", "HP"]);
    assert.deepEqual(parsed.ram, [8, 16]);
    assert.deepEqual(parsed.storage, [512]);
  });

  it("preserves a price range inside the catalogue's own bounds", () => {
    const filters = asFilters({ minPrice: 30000, maxPrice: 65000 });
    const parsed = roundTrip(filters);

    assert.equal(parsed.minPrice, 30000);
    assert.equal(parsed.maxPrice, 65000);
  });

  /*
   * Deliberate, not a rounding accident: `serializeFilters` writes a bound only
   * when it is tighter than the catalogue's own range, so a minimum below the
   * cheapest product never reaches the URL and comes back as the floor. It
   * keeps shared links short and means "no filter" has exactly one spelling.
   */
  it("drops a minimum below the cheapest product", () => {
    const filters = asFilters({ minPrice: facets.minPrice - 5000 });

    assert.equal(serializeFilters(filters, "newest", 1), "");
    assert.equal(roundTrip(filters).minPrice, facets.minPrice);
  });

  it("preserves a search query, trimmed", () => {
    const parsed = roundTrip(asFilters({ query: "  thinkpad  " }));
    assert.equal(parsed.query, "thinkpad");
  });

  it("survives every field being set at once", () => {
    const filters = asFilters({
      brands: ["Dell"],
      processors: ["Intel Core i5-1235U"],
      gpus: ["Intel Iris Xe"],
      ram: [16],
      storage: [512],
      displaySizes: [14],
      refreshRates: [60],
      os: ["Windows"],
      minPrice: 30000,
      maxPrice: 80000,
      query: "ultrabook",
    });

    assert.deepEqual(roundTrip(filters), filters);
  });
});

describe("budget shorthand", () => {
  it("expands a band slug into a price range", () => {
    const parsed = parseFilters(new URLSearchParams("budget=under-30k"));

    assert.ok(parsed.maxPrice <= 30000, `maxPrice was ${parsed.maxPrice}`);
    assert.ok(parsed.minPrice >= facets.minPrice);
  });

  it("ignores an unknown band rather than throwing", () => {
    const parsed = parseFilters(new URLSearchParams("budget=not-a-band"));
    assert.equal(parsed.minPrice, defaultFilters.minPrice);
    assert.equal(parsed.maxPrice, defaultFilters.maxPrice);
  });
});

describe("hostile query strings", () => {
  it("falls back to defaults when a price is not a number", () => {
    const parsed = parseFilters(new URLSearchParams("min=abc&max=xyz"));
    assert.equal(parsed.minPrice, defaultFilters.minPrice);
    assert.equal(parsed.maxPrice, defaultFilters.maxPrice);
  });

  it("drops non-numeric entries from numeric lists", () => {
    const parsed = parseFilters(new URLSearchParams("ram=8,abc,16"));
    assert.deepEqual(parsed.ram, [8, 16]);
  });

  it("rejects an unknown sort", () => {
    assert.equal(parseSort(new URLSearchParams("sort=chaos")), "newest");
    assert.equal(parseSort(new URLSearchParams("sort=price-asc")), "price-asc");
  });

  it("clamps page numbers to a positive integer", () => {
    assert.equal(parsePage(new URLSearchParams("page=0")), 1);
    assert.equal(parsePage(new URLSearchParams("page=-4")), 1);
    assert.equal(parsePage(new URLSearchParams("page=abc")), 1);
    assert.equal(parsePage(new URLSearchParams("page=2.7")), 2);
    assert.equal(parsePage(new URLSearchParams("page=3")), 3);
  });
});
