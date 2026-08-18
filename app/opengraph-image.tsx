import { ImageResponse } from "next/og";
import { allProducts, productCounts } from "@/lib/data/products";

export const alt = "Lunowix — laptops, phones and headphones compared";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * The share card, generated at build time rather than exported from a design
 * tool — so the counts on it are the real ones and cannot go stale.
 *
 * `next/og` renders a strict subset of CSS: flexbox only (no grid), and any
 * element with more than one child needs an explicit `display: flex`. The
 * palette is the site's own — ink-850 ground, brand orange accent.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(1000px 600px at 8% 100%, rgba(255,125,41,0.30), transparent 60%), linear-gradient(155deg, #2b2015 0%, #1d150d 50%, #120c07 100%)",
          color: "#f5f1de",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "#ff7d29",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 10,
              textTransform: "uppercase",
              color: "#ffa164",
            }}
          >
            Lunowix
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>
            Compare before
          </div>
          {/* Two spans in a flex row, not "you buy" plus a span: satori throws
              on any element that mixes a bare text node with a child element,
              and the thrown error takes the whole route down with it. */}
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -2,
            }}
          >
            <span>you buy</span>
            <span style={{ color: "#ff7d29" }}>.</span>
          </div>
          <div style={{ marginTop: 26, fontSize: 30, color: "rgba(245,241,222,0.72)" }}>
            Laptops, phones and headphones — scored row by row.
          </div>
        </div>

        <div style={{ display: "flex", gap: 56, fontSize: 24 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#ffbf78", fontSize: 40, fontWeight: 700 }}>
              {allProducts.length}
            </span>
            <span style={{ color: "rgba(245,241,222,0.55)" }}>products tracked</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#ffbf78", fontSize: 40, fontWeight: 700 }}>
              {productCounts.laptop}
            </span>
            <span style={{ color: "rgba(245,241,222,0.55)" }}>laptops</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#ffbf78", fontSize: 40, fontWeight: 700 }}>
              {productCounts.phone}
            </span>
            <span style={{ color: "rgba(245,241,222,0.55)" }}>phones</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#ffbf78", fontSize: 40, fontWeight: 700 }}>
              {productCounts.headphone}
            </span>
            <span style={{ color: "rgba(245,241,222,0.55)" }}>headphones</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
