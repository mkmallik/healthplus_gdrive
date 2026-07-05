#!/usr/bin/env python3
"""Run after `npx expo export --platform web` to patch dist/index.html."""
import glob, os

dist = os.path.join(os.path.dirname(__file__), 'dist')

ionicons = glob.glob(f'{dist}/**/Ionicons*.ttf', recursive=True)
font_path = ionicons[0].replace(dist + '/', '') if ionicons else ''

extra = f"""
    <style>
      @font-face {{
        font-family: 'Ionicons';
        src: url('/{font_path}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }}
      @media (min-width: 500px) {{
        body {{
          background: #111 !important;
          display: flex;
          justify-content: center;
        }}
        #root {{
          max-width: 430px;
          width: 100%;
          position: relative;
          box-shadow: 0 0 40px rgba(0,0,0,0.5);
        }}
      }}
    </style>"""

index = os.path.join(dist, 'index.html')
html = open(index).read()
if '@font-face' not in html:
    html = html.replace('</head>', extra + '\n  </head>')
    open(index, 'w').write(html)
    print(f'Patched index.html (font: {font_path})')
else:
    print('Already patched, skipping.')
