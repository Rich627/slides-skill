#!/bin/sh
# render.sh deck.pptx [outdir] — PDF + per-slide PNGs + one contact sheet for visual QA.
set -eu
deck=$1
out=${2:-$(dirname "$deck")/render}
mkdir -p "$out"
base=$(basename "${deck%.*}")
SOFFICE=${SOFFICE:-}
for c in soffice /Applications/LibreOffice.app/Contents/MacOS/soffice /opt/homebrew/bin/soffice; do
  [ -n "$SOFFICE" ] && break
  command -v "$c" >/dev/null 2>&1 && SOFFICE=$c
done
[ -n "$SOFFICE" ] || { echo "LibreOffice (soffice) not found; install it or set SOFFICE=" >&2; exit 2; }
timeout 180 "$SOFFICE" --headless --convert-to pdf "$deck" --outdir "$out" >/dev/null 2>&1 || true
[ -f "$out/$base.pdf" ] || { echo "PDF conversion failed" >&2; exit 3; }
rm -f "$out/$base"-[0-9]*.png "$out/$base-sheet.png"
pdftoppm -png -r "${DPI:-80}" "$out/$base.pdf" "$out/$base"
# normalise to two-digit page numbers so slide N is always <base>-NN.png
for f in "$out/$base"-[0-9].png; do [ -f "$f" ] && mv "$f" "${f%-[0-9].png}-0${f##*-}"; done
python3 - "$out" "$base" <<'PY' 2>/dev/null || true
import sys, glob, os
try:
    from PIL import Image
except ImportError:
    sys.exit(0)
out, base = sys.argv[1:3]
files = sorted(f for f in glob.glob(os.path.join(out, base + '-*.png')) if not f.endswith('-sheet.png'))
if not files: sys.exit(0)
ims = [Image.open(f) for f in files]
w, h = ims[0].size
cols = 3; rows = (len(ims) + cols - 1) // cols
pad = 12
sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad) + pad), (200, 200, 200))
for i, im in enumerate(ims):
    sheet.paste(im, (pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad)))
sheet.save(os.path.join(out, base + '-sheet.png'))
PY
ls "$out/$base"-*.png
