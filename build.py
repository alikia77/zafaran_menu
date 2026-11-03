#!/usr/bin/env python3
"""Assemble the single-page menu.

  python3 build.py            -> dist/index.html  (+ dist/lib, dist/p: a ready-to-host static site)

Everything is relative to this file. The page is one HTML file: CSS, body markup and all JS
(src/js/*.js, concatenated in filename order) are inlined; GSAP + QR libs load from ./lib;
photos load from ./p.
"""
import os, shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parent
S = ROOT / 'src'
R = lambda f: (S / f).read_text(encoding='utf-8')
LIBS = ['gsap', 'ScrollTrigger', 'Flip', 'SplitText', 'Draggable', 'InertiaPlugin']

def page():
    libs = ''.join(f'<script src="lib/{n}.min.js"></script>\n' for n in LIBS) + '<script src="lib/qrcode.js"></script>\n'
    js = ''.join((S / 'js' / f).read_text(encoding='utf-8') + '\n' for f in sorted(os.listdir(S / 'js')) if f.endswith('.js'))
    return ('<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            + R('head.html') + '<style>' + R('fonts.css') + R('style.css') + '</style></head><body>'
            + R('body.html') + '<script type="text/plain" id="painterSrc">' + R('painter.js') + '</script>\n'
            + '<script>' + R('inline0.js') + '</script>\n' + libs
            + '<script>' + R('painter.js') + '\n' + js + '</script>\n</body></html>')

if __name__ == '__main__':
    out = ROOT / 'dist'; out.mkdir(exist_ok=True)
    (out / 'index.html').write_text(page(), encoding='utf-8')
    for d in ('lib', 'p'):
        if (out / d).exists(): shutil.rmtree(out / d)
        shutil.copytree(ROOT / d, out / d)
    (out / '.nojekyll').write_text('')
    print('built', (out / 'index.html').stat().st_size, 'bytes ->', out)
