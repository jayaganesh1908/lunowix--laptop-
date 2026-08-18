import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allProducts, productCounts, productsIn, sortProducts } from "@/lib/data/products";
import { compatibilityTone, gameTierTone, scoreLabel } from "@/lib/utils";
import { categories, productHref } from "@/lib/types";

/*
 * The catalogue and the functions that rank it.
 *
 * These are the numbers every recommendation on the site rests on: a wrong
 * threshold in `scoreLabel` or a sort that silently returns the pool unsorted
 * looks like an opinion rather than a bug, which is exactly why it would ship.
 */

describe("sortProducts", () => {
  it("does not mutate the pool it is given", () => {
    const pool = allProducts.slice(0, 10);
    const before = pool.map((product) => product.id);
    sortProducts(pool, "price-asc");
    assert.deepEqual(
      pool.map((product) => product.id),
      before,
    );
  });

  it("orders by price in both directions", () => {
    const ascending = sortProducts(allProducts, "price-asc").map((p) => p.price);
    const descending = sortProducts(allProducts, "price-desc").map((p) => p.price);

    assert.deepEqual(ascending, [...ascending].sort((a, b) => a - b));
    assert.deepEqual(descending, [...descending].sort((a, b) => b - a));
  });

  it("breaks a rating tie on review count", () => {
    const sorted = sortProducts(allProducts, "rating");
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (previous.rating === current.rating) {
        assert.ok(
          previous.reviews >= current.reviews,
          `${previous.name} (${previous.reviews} reviews) sorted above ${current.name} (${current.reviews})`,
        );
      } else {
        assert.ok(previous.rating > current.rating);
      }
    }
  });

  it("falls back to newest for an unrecognised sort", () => {
    // @ts-expect-error — deliberately passing a value the union forbids.
    const sorted = sortProducts(allProducts, "nonsense");
    const years = sorted.map((product) => product.releaseYear);
    assert.deepEqual(years, [...years].sort((a, b) => b - a));
  });
});

describe("score thresholds", () => {
  it("labels each band at its boundary", () => {
    assert.equal(scoreLabel(100), "Exceptional");
    assert.equal(scoreLabel(85), "Exceptional");
    assert.equal(scoreLabel(84), "Very good");
    assert.equal(scoreLabel(70), "Very good");
    assert.equal(scoreLabel(69), "Good");
    assert.equal(scoreLabel(55), "Good");
    assert.equal(scoreLabel(54), "Average");
    assert.equal(scoreLabel(40), "Average");
    assert.equal(scoreLabel(39), "Basic");
    assert.equal(scoreLabel(0), "Basic");
  });

  it("maps every compatibility status and game tier to a tone", () => {
    for (const status of ["Runs Smoothly", "Runs Fine", "Limited", "Not Recommended"] as const) {
      assert.ok(compatibilityTone(status), `no tone for ${status}`);
    }
    for (const tier of ["Flawless", "Excellent", "Playable", "Struggles"] as const) {
      assert.ok(gameTierTone(tier), `no tone for ${tier}`);
    }
  });
});

describe("catalogue integrity", () => {
  it("has no duplicate ids", () => {
    const ids = allProducts.map((product) => product.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("keeps productCounts in step with the data", () => {
    for (const category of categories) {
      assert.equal(
        productCounts[category.slug],
        productsIn(category.slug).length,
        `${category.slug} count is stale`,
      );
    }
  });

  it("routes every product to its own category's detail page", () => {
    for (const product of allProducts) {
      const category = categories.find((entry) => entry.slug === product.category);
      assert.ok(category, `${product.id} has an unknown category`);
      assert.equal(productHref(product), `/${category.route}/${product.id}`);
    }
  });

  it("prices every product below its list price", () => {
    for (const product of allProducts) {
      assert.ok(
        product.price <= product.mrp,
        `${product.name} is priced above its MRP`,
      );
    }
  });
});
