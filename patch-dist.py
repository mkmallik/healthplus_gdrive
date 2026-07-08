#!/usr/bin/env python3
"""Run after `npx expo export --platform web` to patch dist/index.html."""
import glob, json, os, re, shutil

dist = os.path.join(os.path.dirname(__file__), 'dist')

# Copy Ionicons font to a stable path so Font.loadAsync('/fonts/Ionicons.ttf') works
ionicons_src = glob.glob(f'{dist}/**/Ionicons*.ttf', recursive=True)
fonts_dir = os.path.join(dist, 'fonts')
os.makedirs(fonts_dir, exist_ok=True)
if ionicons_src:
    shutil.copy(ionicons_src[0], os.path.join(fonts_dir, 'Ionicons.ttf'))
    print(f'Copied font to dist/fonts/Ionicons.ttf')

extra = """
    <style>
      @media (min-width: 500px) {
        body {
          background: #111 !important;
          display: flex;
          justify-content: center;
        }
        #root {
          max-width: 430px;
          width: 100%;
          position: relative;
          box-shadow: 0 0 40px rgba(0,0,0,0.5);
        }
      }
    </style>"""

# Write vercel.json — assets/fonts served directly, everything else → SPA index.html
vercel_cfg = {
    "routes": [
        {"src": "/assets/(.*)", "dest": "/assets/$1",
         "headers": {"Cache-Control": "public, max-age=31536000, immutable"}},
        {"src": "/fonts/(.*)", "dest": "/fonts/$1"},
        {"src": "/(.*\\.(js|css|ico|png|jpg|json|ttf|woff|woff2))", "dest": "/$1"},
        {"src": "/(.*)", "dest": "/index.html"}
    ]
}
with open(os.path.join(dist, 'vercel.json'), 'w') as f:
    json.dump(vercel_cfg, f, indent=2)
print('Wrote dist/vercel.json')

index = os.path.join(dist, 'index.html')
html = open(index).read()
if 'max-width: 430px' not in html:
    html = html.replace('</head>', extra + '\n  </head>')
    open(index, 'w').write(html)
    print('Patched index.html with portrait layout')
else:
    print('Already patched, skipping.')
