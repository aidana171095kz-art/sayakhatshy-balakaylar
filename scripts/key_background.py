"""Remove a flat black (or white) background: only near-bg pixels connected to the image
border become transparent, so dark areas inside the object are kept. Soft 1px edge."""
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import label, binary_dilation
def key(src, out, bg=(0, 0, 0), tol=38):
    im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
    d = np.sqrt(((a - np.array(bg)) ** 2).sum(-1))
    near = d < tol
    lab, _ = label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(border))
    alpha = np.where(bgmask, 0, 255).astype(np.uint8)
    # soft edge: pixels on the boundary get alpha by distance to bg colour
    edge = binary_dilation(bgmask) & ~bgmask
    alpha[edge] = np.clip((d[edge] - tol * 0.5) / tol * 255, 0, 255).astype(np.uint8)
    rgba = np.dstack([np.asarray(im), alpha])
    Image.fromarray(rgba).filter(ImageFilter.SMOOTH_MORE) if False else Image.fromarray(rgba).save(out)
if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    bg = tuple(map(int, sys.argv[3].split(','))) if len(sys.argv) > 3 else (0, 0, 0)
    key(src, out, bg)
