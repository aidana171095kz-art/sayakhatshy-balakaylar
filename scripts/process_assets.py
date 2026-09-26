"""Convert source images in asset-src/ into optimized WebP files in src/assets/.

Source files are named by asset id (e.g. boy.pointing.png). Transparent sources get
their faint alpha haze removed; everything is resized to a max edge and saved as WebP.
Usage: python3 scripts/process_assets.py [asset-id ...]
"""
import sys, pathlib
import numpy as np
from PIL import Image

SRC = pathlib.Path('asset-src'); OUT = pathlib.Path('src/assets')
MAX_EDGE = {'bg': 1920, 'map': 1536}  # backgrounds full-HD; everything else below
DEFAULT_EDGE = 1100
ITEM_EDGE = 520  # small objects shown on cards

def process(p: pathlib.Path):
    asset_id = p.stem
    im = Image.open(p)
    edge = MAX_EDGE.get(asset_id.split('.')[0], ITEM_EDGE if asset_id.startswith('item.') else DEFAULT_EDGE)
    im.thumbnail((edge, edge), Image.LANCZOS)
    if im.mode == 'RGBA':
        arr = np.array(im)
        a = arr[..., 3]
        a[a < 16] = 0  # drop semi-transparent haze left by the source export
        arr[..., 3] = a
        im = Image.fromarray(arr).crop(Image.fromarray(a).getbbox())
        im.save(OUT / f'{asset_id}.webp', 'WEBP', quality=88, method=6)
    else:
        im.convert('RGB').save(OUT / f'{asset_id}.webp', 'WEBP', quality=82, method=6)
    print(asset_id, im.size, (OUT / f'{asset_id}.webp').stat().st_size // 1024, 'KB')

ids = sys.argv[1:]
for p in sorted(SRC.iterdir()):
    if not ids or p.stem in ids:
        process(p)
