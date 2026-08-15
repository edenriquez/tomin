#!/usr/bin/env bash
# (Re)fetch merchant logos into public/logos/ from scripts/logos.txt.
#
# Idempotent and safe to re-run whenever new merchants are added to the
# manifest: every logo is re-downloaded, anything that isn't a real image
# (rate-limit HTML, a 404 page) is dropped rather than shipped broken, and
# the summary says exactly what landed.
#
#   cd frontend && ./scripts/fetch-logos.sh
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p public/logos

ok=0
failed=()
while read -r slug domain; do
    [[ -z "$slug" || "$slug" == \#* ]] && continue
    if curl -sfL --max-time 15 \
        "https://www.google.com/s2/favicons?domain=${domain}&sz=64" \
        -o "public/logos/${slug}.png" \
        && file "public/logos/${slug}.png" | grep -q "image data"; then
        ok=$((ok + 1))
    else
        rm -f "public/logos/${slug}.png"
        failed+=("$slug ($domain)")
    fi
done < scripts/logos.txt

echo "✓ ${ok} logos en public/logos/"
if [[ ${#failed[@]} -gt 0 ]]; then
    printf '✗ sin logo: %s\n' "${failed[@]}"
fi
