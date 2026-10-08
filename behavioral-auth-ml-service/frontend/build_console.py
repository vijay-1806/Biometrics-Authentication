import os
src = 'console_template.html'
dst = 'console.html'
if os.path.exists(src):
    html = open(src, 'r', encoding='utf-8').read()
    open(dst, 'w', encoding='utf-8').write(html)
    print('Written:', len(html), 'bytes to', dst)
else:
    print('Template not found, writing directly...')
