# 다시 만들 때: python scripts/make-icons.py public  (Pillow, 나눔고딕 글꼴 필요)
# 앱 아이콘·미리보기 이미지. 첫 화면 모션의 둥근 막대 십자가와 같은 모양, 교회 보라 바탕.
import math, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
PURPLE = (0x40, 0x39, 0x66)
WHITE = (255, 255, 255)
RAY = (0xba, 0xc9, 0xf4)
SS = 4  # 4배로 그려 줄여 가장자리를 매끈하게

def cross(d, cx, top, h):
    t = h * 0.15            # 막대 굵기
    arm = h * 0.64          # 가로 막대 길이
    bar_y = top + h * 0.30  # 가로 막대 가운데 높이
    d.rounded_rectangle([cx - t / 2, top, cx + t / 2, top + h], radius=t / 2, fill=WHITE)
    d.rounded_rectangle([cx - arm / 2, bar_y - t / 2, cx + arm / 2, bar_y + t / 2], radius=t / 2, fill=WHITE)
    return bar_y

def icon(size, cross_h, name):
    S = size * SS
    img = Image.new('RGB', (S, S), PURPLE)
    d = ImageDraw.Draw(img)
    h = S * cross_h
    cross(d, S / 2, (S - h) / 2, h)
    img.resize((size, size), Image.LANCZOS).save(f'{OUT}/{name}', optimize=True)

icon(192, 0.62, 'icons/icon-192.png')
icon(512, 0.62, 'icons/icon-512.png')
icon(512, 0.46, 'icons/maskable-512.png')   # 안전 영역(가운데 80% 원) 안에
icon(180, 0.58, 'apple-touch-icon.png')

# 카카오톡·메신저 미리보기 1200×630. 가운데 정사각형으로 잘려도 이름이 남게 가운데에 쌓는다.
W, H = 1200, 630
img = Image.new('RGB', (W * SS, H * SS), PURPLE)
d = ImageDraw.Draw(img, 'RGBA')
cx, top, ch = W * SS / 2, 70 * SS, 210 * SS
bar_y = top + ch * 0.30
for i in range(12):
    r = math.radians(i * 30 - 90)
    a, b = 125 * SS, 195 * SS
    d.line([(cx + a * math.cos(r), bar_y + a * math.sin(r)), (cx + b * math.cos(r), bar_y + b * math.sin(r))],
           fill=RAY + (90,), width=4 * SS)
cross(d, cx, top, ch)
fonts = 'C:/Windows/Fonts/'
import os
def font(name, px):
    for base in (fonts, os.path.expandvars('%LOCALAPPDATA%/Microsoft/Windows/Fonts/')):
        if os.path.exists(base + name):
            return ImageFont.truetype(base + name, px * SS)
    raise SystemExit(f'글꼴 없음: {name}')
title = font('NanumGothicBold.ttf', 92)
sub = font('NanumGothic.ttf', 34)
d.text((cx, 400 * SS), '매일, 함께', font=title, fill=WHITE, anchor='mm')
d.text((cx, 500 * SS), '하루의 모든 순간을 하나님 앞에서', font=sub, fill=(0xe6, 0xde, 0xff), anchor='mm')
img.resize((W, H), Image.LANCZOS).save(f'{OUT}/og.png', optimize=True)
print('ok')
