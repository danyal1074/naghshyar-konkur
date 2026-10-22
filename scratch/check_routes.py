import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

app_path = r'c:\Users\danyal\Downloads\پروژه های انتی گراویتی\سامانه کنکور هنر\naghshyar-source\naghshyar\src\App.jsx'
with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

print("App.jsx routes:\n", app_content)

pages_dir = r'c:\Users\danyal\Downloads\پروژه های انتی گراویتی\سامانه کنکور هنر\naghshyar-source\naghshyar\src'
links = []
pattern = re.compile(r'(?:to=|nav\(|navigate\()[\'"`]([^\'"`$]+)[\'"`]')
for root, dirs, files in os.walk(pages_dir):
    for f in files:
        if f.endswith('.jsx'):
            with open(os.path.join(root, f), 'r', encoding='utf-8') as fp:
                txt = fp.read()
                for l in pattern.findall(txt):
                    if l.startswith('/'):
                        links.append((f, l))

print(f'\nFound {len(links)} links across files:')
for src, l in sorted(set(links)):
    print(f'  {src:18} -> {l}')
