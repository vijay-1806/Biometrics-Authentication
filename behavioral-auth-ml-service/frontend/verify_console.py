import os
f = 'console.html'
size = os.path.getsize(f)
content = open(f, encoding='utf-8').read()
checks = {
    'DOCTYPE html': content.startswith('<!DOCTYPE'),
    'topbar present': 'class="topbar"' in content,
    'sidebar nav': 'class="sidebar"' in content,
    'modal-create-key': 'modal-create-key' in content,
    'generateKey fn': 'async function generateKey' in content,
    'revoke modal': 'modal-revoke-confirm' in content,
    'quickstart page': 'page-quickstart' in content,
    'webhooks page': 'page-webhooks' in content,
    'closing html': content.strip().endswith('</html>'),
}
for name, ok in checks.items():
    print(f'  [{"OK" if ok else "FAIL"}] {name}')
print(f'Size: {size:,} bytes')
