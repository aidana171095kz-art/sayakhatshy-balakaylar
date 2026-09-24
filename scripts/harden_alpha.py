import sys, numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes
def harden(path, out, lo=10, hi=60):
    im = Image.open(path).convert('RGBA'); a = np.array(im)[..., 3].astype(float)
    solid = binary_fill_holes(a > hi)
    na = np.clip((a - lo) / (hi - lo), 0, 1) * 255
    na[solid] = 255
    arr = np.array(im); arr[..., 3] = na.astype(np.uint8)
    Image.fromarray(arr).save(out)
if __name__ == '__main__':
    for p in sys.argv[1:]: harden(p, p)
