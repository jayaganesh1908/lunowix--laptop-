"""
Key a flat background out of the Lunowix logo renders and emit trimmed,
transparent PNGs.

    python scripts/logo-transparent.py

Reads   public/logos/src/lunowix-light-src.png   (dark art on white)
        public/logos/src/lunowix-dark-src.png    (light art on black)
Writes  public/logos/lunowix-light.png
        public/logos/lunowix-dark.png

WHY NOT A STRAIGHT COLOUR SWAP TO TRANSPARENT

Keying "every pixel equal to the background" leaves a hard, aliased edge and a
one-pixel halo of background colour around every curve, because the renders are
anti-aliased — the pixels along each edge are blends of the art and the
background, matching neither.

Alpha is derived from DISTANCE to the background colour instead. A pixel sitting
on the background goes fully transparent, one far from it stays fully opaque,
and the blended edge pixels land in between — which is exactly the coverage the
anti-aliasing encoded in the first place. Curves stay smooth at any size.

Nothing else is touched: RGB is carried through untouched, so the orange and the
black/white are the values from the render. The only edit is alpha, plus a trim
of the now-empty margin.
"""

from pathlib import Path
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  python -m pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "logos" / "src"
OUT = ROOT / "public" / "logos"

# Pixels within NEAR of the background colour become fully transparent; beyond
# FAR they stay fully opaque. The band between is the anti-aliased edge.
# Widen the gap if you see a fringe; narrow it if thin strokes look eaten.
NEAR = 26.0
FAR = 96.0

# Matched by STEM, not by full filename. Windows hides known extensions by
# default, so a file saved as "lunowix-light-src.png" from a JPEG source lands
# on disk as "lunowix-light-src.png.jpeg" while Explorer still displays it as
# ".png". Globbing the stem accepts whatever actually arrived.
JOBS = [
    ("lunowix-light-src", "lunowix-light.png", (255, 255, 255)),
    ("lunowix-dark-src", "lunowix-dark.png", (0, 0, 0)),
]

SUFFIXES = (".png", ".jpg", ".jpeg", ".webp", ".bmp")


def find_source(stem: str) -> Path | None:
    for candidate in sorted(SRC.glob(f"{stem}*")):
        if candidate.suffix.lower() in SUFFIXES:
            return candidate
    return None


def key_out(src_path: Path, out_path: Path, bg: tuple[int, int, int]) -> None:
    img = Image.open(src_path).convert("RGBA")
    px = img.load()
    w, h = img.size
    br, bg_, bb = bg

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            # Chebyshev distance: cheaper than Euclidean and slightly more
            # willing to keep a pixel that differs strongly in one channel,
            # which is what saves the orange against a white ground.
            dist = max(abs(r - br), abs(g - bg_), abs(b - bb))
            if dist <= NEAR:
                alpha = 0
            elif dist >= FAR:
                alpha = 255
            else:
                alpha = round((dist - NEAR) / (FAR - NEAR) * 255)
            px[x, y] = (r, g, b, alpha)

    bbox = img.getbbox()  # drops the fully transparent margin
    if bbox:
        img = img.crop(bbox)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    print(f"  {src_path.name} -> {out_path.name}  {img.size[0]}x{img.size[1]}")


def main() -> None:
    resolved = [(stem, find_source(stem), out, bg) for stem, out, bg in JOBS]
    missing = [stem for stem, found, _, _ in resolved if found is None]
    if missing:
        print(f"Put the source renders in {SRC} first (any of {', '.join(SUFFIXES)}):")
        for stem in missing:
            print(f"  - {stem}.*")
        sys.exit(1)

    print("Keying backgrounds:")
    for _, src, out, bg in resolved:
        key_out(src, OUT / out, bg)
    print("Done.")


if __name__ == "__main__":
    main()
