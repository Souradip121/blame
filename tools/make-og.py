# Builds assets/og.jpg (1200 x 630 link preview) from the reel stills: the front page's top half
# next to the share card. Run tools/shoot.mjs first.
#   python tools/make-og.py
from PIL import Image, ImageFilter
import os

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
shots = os.path.join(root, 'screenshots')

W, H = 1200, 630
og = Image.new('RGB', (W, H), (214, 210, 201))

home = Image.open(os.path.join(shots, '1-paste-your-repo.png')).convert('RGB')
home = home.crop((0, 0, 1170, 1530))
home = home.resize((round(1170 * 590 / 1530), 590), Image.LANCZOS)

card = Image.open(os.path.join(shots, '4-share-card.png')).convert('RGB')
card = card.resize((round(1080 * 590 / 1920), 590), Image.LANCZOS)


def paste_with_shadow(img, x, y, angle):
    img = img.convert('RGBA').rotate(angle, resample=Image.BICUBIC, expand=True)
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 90), mask=img.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    og.paste(shadow, (x + 6, y + 14), shadow)
    og.paste(img, (x, y), img)


gap = 60
total = home.width + card.width + gap
x0 = (W - total) // 2
paste_with_shadow(home, x0, 14, 1.2)
paste_with_shadow(card, x0 + home.width + gap, 10, -2.0)
og.save(os.path.join(root, "assets", "og.jpg"), quality=86, optimize=True, progressive=True)
print("assets/og.jpg", og.size)
