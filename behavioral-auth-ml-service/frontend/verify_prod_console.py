import os

with open('console.html', 'r', encoding='utf-8') as f:
    content = f.read()

checks = [
    ('DOCTYPE html', content.startswith('<!DOCTYPE html>')),
    ('Auth Shell', 'id="auth-shell"' in content),
    ('Login View', 'id="auth-view-login"' in content),
    ('Register View', 'id="auth-view-register"' in content),
    ('Onboarding View', 'id="auth-view-onboarding"' in content),
    ('App Shell', 'id="app-shell"' in content),
    ('Workspace Switcher', 'id="workspace-menu"' in content),
    ('Dashboard View', 'id="view-dashboard"' in content),
    ('API Keys View', 'id="view-api-keys"' in content),
    ('Enrollments View', 'id="view-enrollments"' in content),
    ('Verifications View', 'id="view-verifications"' in content),
    ('Risk Events View', 'id="view-risk-events"' in content),
    ('Usage View', 'id="view-usage"' in content),
    ('Webhooks View', 'id="view-webhooks"' in content),
    ('Quickstart View', 'id="view-quickstart"' in content),
    ('API Reference View', 'id="view-api-reference"' in content),
    ('Settings View', 'id="view-settings"' in content),
    ('Sandbox View', 'id="view-sandbox"' in content),
    ('Admin View', 'id="view-admin"' in content),
    ('Create Key Modal', 'id="modal-create-key"' in content),
    ('Reveal Key Modal', 'id="modal-reveal-key"' in content),
    ('Revoke Key Modal', 'id="modal-revoke-key"' in content),
    ('Delete Key Modal', 'id="modal-delete-key"' in content),
    ('Closing HTML', '</html>' in content)
]

all_ok = True
for name, passed in checks:
    status = "OK" if passed else "FAIL"
    print(f"[{status}] {name}")
    if not passed:
        all_ok = False

print(f"Total size: {len(content):,} characters")
print(f"Result: {'ALL CHECKS PASSED' if all_ok else 'SOME CHECKS FAILED'}")
