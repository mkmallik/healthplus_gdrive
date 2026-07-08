#!/usr/bin/env python3
"""Run after `npx expo export --platform web` to patch dist/index.html."""
import glob, json, os, re, shutil

dist = os.path.join(os.path.dirname(__file__), 'dist')

# Copy Ionicons font to a stable path so Font.loadAsync('/fonts/Ionicons.ttf') works
ionicons_src = glob.glob(f'{dist}/**/Ionicons*.ttf', recursive=True)
fonts_dir = os.path.join(dist, 'fonts')
os.makedirs(fonts_dir, exist_ok=True)
if ionicons_src:
    src = ionicons_src[0]
    fname = os.path.basename(src)  # e.g. Ionicons.b4eb...ttf

    # Copy to /fonts/ (stable path for Font.loadAsync)
    shutil.copy(src, os.path.join(fonts_dir, 'Ionicons.ttf'))
    # Copy hashed font to /fonts/ so the bundle's reference also resolves
    shutil.copy(src, os.path.join(fonts_dir, fname))
    print(f'Copied font to dist/fonts/Ionicons.ttf and dist/fonts/{fname}')

    # Patch JS bundle: rewrite node_modules path → /fonts/
    # Vercel skips node_modules dirs in static deployments, so font 404s
    old_path = f'assets/node_modules/%40expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/{fname}'
    old_path2 = f'assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/{fname}'
    new_path = f'fonts/{fname}'
    js_files = glob.glob(f'{dist}/_expo/static/js/web/*.js')
    for js_file in js_files:
        content = open(js_file, 'rb').read().decode('utf-8', errors='replace')
        patched = content.replace(old_path, new_path).replace(old_path2, new_path)
        if patched != content:
            open(js_file, 'w', encoding='utf-8').write(patched)
            print(f'Patched font path in {os.path.basename(js_file)}')

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


index = os.path.join(dist, 'index.html')
html = open(index).read()
if 'max-width: 430px' not in html:
    html = html.replace('</head>', extra + '\n  </head>')
    open(index, 'w').write(html)
    print('Patched index.html with portrait layout')
else:
    print('Already patched, skipping.')
