import os
import re

console_path = os.path.join(r"c:\Users\vijay\Documents\CLG - PROJECTS\NEW\Biometrics-Authentication\behavioral-auth-ml-service\frontend\console.html")

with open(console_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Replace Quickstart view with single comprehensive README guide
old_qs_pattern = re.compile(r'<section class="page-container" id="view-quickstart">.*?</section>', re.DOTALL)

new_qs = '''<section class="page-container" id="view-quickstart">
        <div class="page-header">
          <div>
            <h1 class="page-heading">Developer Quickstart Guide</h1>
            <p class="page-subheading">Integrate continuous keystroke behavioral biometrics into your web application or backend.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('sandbox')">Open Live Test Sandbox</button>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('api-reference')">Full API Reference</button>
          </div>
        </div>

        <!-- 1. Architecture Overview -->
        <div class="card" style="margin-bottom:18px">
          <div class="card-header"><span class="card-title">1. How BioAuth Behavioral Biometrics Works</span></div>
          <div class="card-body">
            <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">
              BioAuth passively evaluates the unique rhythm and timing patterns of how a user types on their keyboard. 
              It captures high-precision <strong>key hold duration</strong> (time a key is pressed down) and <strong>digraph flight latencies</strong> (transition time between consecutive keystrokes).
              These intervals are transformed into statistical feature vectors and scored against an individual <strong>IsolationForest Machine Learning Model</strong> trained specifically on that user's baseline.
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin-top:10px">
              <div style="background:var(--surface-raised);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border)">
                <div style="color:var(--primary);font-weight:600;font-size:13px;margin-bottom:4px">Zero Plaintext / Passwords</div>
                <div style="font-size:12px;color:var(--text-muted)">The service scores timing vectors only. Plaintext passwords or sensitive inputs are never transmitted or stored.</div>
              </div>
              <div style="background:var(--surface-raised);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border)">
                <div style="color:var(--good);font-weight:600;font-size:13px;margin-bottom:4px">Real-Time Scoring</div>
                <div style="font-size:12px;color:var(--text-muted)">Fast sub-5ms ML inference with confidence intervals, rolling average trust scores, and anomaly detection.</div>
              </div>
              <div style="background:var(--surface-raised);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border)">
                <div style="color:var(--accent);font-weight:600;font-size:13px;margin-bottom:4px">Automated Risk Protection</div>
                <div style="font-size:12px;color:var(--text-muted)">Flags credential sharing, impostors, bot automation, and session hijacking in real time.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Authentication -->
        <div class="card" style="margin-bottom:18px">
          <div class="card-header"><span class="card-title">2. Authentication &amp; API Key</span></div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
              All API requests and SDK instances require your account's single active cryptographic API key. Include it as an HTTP header:
            </p>
            <div class="code-panel">
              <div class="code-header"><span>HTTP Header</span><button class="btn btn-ghost btn-xs" onclick="copySnippet(this)">Copy</button></div>
              <pre class="code-pre">X-API-Key: bio_live_YOUR_WORKSPACE_KEY
# or
Authorization: Bearer bio_live_YOUR_WORKSPACE_KEY</pre>
            </div>
            <p style="font-size:12px;color:var(--text-dim);margin-top:8px">Find your active key anytime in the <a href="#api-keys" onclick="navigateTo('api-keys')">API Keys</a> tab.</p>
          </div>
        </div>

        <!-- 3. Universal Client SDK -->
        <div class="card" style="margin-bottom:18px">
          <div class="card-header"><span class="card-title">3. Universal Web Client SDK Integration (Recommended)</span></div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
              Integrate with any web application (React, Next.js, Vue, or static HTML) using our lightweight, zero-dependency client SDK script:
            </p>
            
            <div style="margin-bottom:14px">
              <div style="font-size:12px;font-weight:600;color:var(--text-dim);margin-bottom:6px">Step A: Add Script to Your HTML Page</div>
              <div class="code-panel">
                <div class="code-header"><span>HTML</span><button class="btn btn-ghost btn-xs" onclick="copySnippet(this)">Copy</button></div>
                <pre class="code-pre">&lt;script defer src="<span class="host-url">http://localhost:8000</span>/sdk.js"&gt;&lt;/script&gt;</pre>
              </div>
            </div>

            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-dim);margin-bottom:6px">Step B: Initialize the SDK and Attach Listeners</div>
              <div class="code-panel">
                <div class="code-header"><span>JavaScript</span><button class="btn btn-ghost btn-xs" onclick="copySnippet(this)">Copy</button></div>
                <pre class="code-pre">const bio = new BioAuth({
  apiKey: "YOUR_WORKSPACE_KEY",           // Single active key from API Keys tab
  userId: "student_or_customer_id",       // Unique user identifier in your platform
  mode: "verify",                         // "verify" for continuous scoring, "enroll" for baseline training
  baseUrl: "<span class="host-url">http://localhost:8000</span>",
  onViolation: (alert) => {
    console.warn("Biometric Security Alert:", alert);
    // Trigger step-up verification or flag suspicious activity
  }
});

// Attach keystroke listeners to any form, textarea, or text input
bio.attach(document.getElementById("target-input"));</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Direct REST API -->
        <div class="card" style="margin-bottom:18px">
          <div class="card-header"><span class="card-title">4. Direct REST API (Server-to-Server or Custom Clients)</span></div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px">
              For native apps or server-to-server workflows, submit raw keystroke event streams directly to the <code>/verify</code> endpoint:
            </p>
            <div class="code-panel">
              <div class="code-header"><span>cURL</span><button class="btn btn-ghost btn-xs" onclick="copySnippet(this)">Copy</button></div>
              <pre class="code-pre">curl -X POST "<span class="host-url">http://localhost:8000</span>/verify" \\
  -H "X-API-Key: YOUR_WORKSPACE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_49201",
    "events": [
      {"key": "t", "type": "down", "t": 0.0},
      {"key": "t", "type": "up",   "t": 68.2},
      {"key": "h", "type": "down", "t": 120.4},
      {"key": "h", "type": "up",   "t": 195.1}
    ]
  }'</pre>
            </div>
          </div>
        </div>

        <!-- 5. Decision Matrix -->
        <div class="card">
          <div class="card-header"><span class="card-title">5. Understanding Decision Actions &amp; Risk Levels</span></div>
          <div class="card-body">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Trust Score</th>
                    <th>Risk Level</th>
                    <th>Recommended Application Handling</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="badge badge-success">ALLOW</span></td>
                    <td><code>70 &ndash; 100</code></td>
                    <td><span class="badge badge-neutral">LOW</span></td>
                    <td>Typing rhythm conforms to authentic baseline. Permit user action silently.</td>
                  </tr>
                  <tr>
                    <td><span class="badge badge-warning">STEP_UP</span></td>
                    <td><code>45 &ndash; 69</code></td>
                    <td><span class="badge badge-neutral">MEDIUM</span></td>
                    <td>Rhythm fluctuation or provisional profile. Challenge with 2FA / OTP or secondary check.</td>
                  </tr>
                  <tr>
                    <td><span class="badge badge-danger">DENY</span></td>
                    <td><code>0 &ndash; 44</code></td>
                    <td><span class="badge badge-neutral">HIGH</span></td>
                    <td>Statistically confirmed impostor rhythm. Lock session, revoke auth token, or log security event.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>'''

html = old_qs_pattern.sub(new_qs, html, count=1)

# 2. Add Single Active Key policy banner in API Keys view
old_api_header = '''<div class="page-header">
          <div>
            <h1 class="page-heading">API Keys</h1>
            <p class="page-subheading">Create and manage credentials used to authenticate requests to BioAuth.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="openModal('modal-create-key')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create API Key
            </button>
          </div>
        </div>'''

new_api_header = '''<div class="page-header">
          <div>
            <h1 class="page-heading">API Keys</h1>
            <p class="page-subheading">Create and manage credentials used to authenticate requests to BioAuth.</p>
          </div>
          <div class="page-actions" id="key-page-actions">
            <button class="btn btn-primary" id="btn-header-create-key" onclick="openModal('modal-create-key')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create API Key
            </button>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px;background:var(--surface-raised);border-left:3px solid var(--primary)">
          <div class="card-body" style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div>
              <strong style="font-size:13px;color:var(--text-bright)">Single Active API Key Policy Enforced</strong>
              <p style="font-size:12px;color:var(--text-secondary);margin:2px 0 0">To ensure strict tenant isolation, each account is limited to 1 active key. To rotate or generate a new key, revoke your current key first.</p>
            </div>
            <span id="key-policy-status-badge" class="badge badge-live">1/1 Active Key Configured</span>
          </div>
        </div>'''

if old_api_header in html:
    html = html.replace(old_api_header, new_api_header)

# 3. Update loadKeys logic to enforce 1 active key in UI
old_load_keys = '''async function loadKeys() {
  const container = document.getElementById('keys-list-container');
  container.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted)">Loading API keys...</p></div>`;

  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/keys`);
    const keys = res.keys || [];
    document.getElementById('sidebar-key-count').textContent = keys.filter(k => k.active).length;

    if (!keys.length) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            </div>
            <div class="empty-state-title">No API keys yet</div>
            <p class="empty-state-desc">Create an API key to start making requests to BioAuth from your backend or frontend SDK.</p>
            <button class="btn btn-primary" onclick="openModal('modal-create-key')">Create API Key</button>
          </div>
        </div>`;
      return;
    }'''

new_load_keys = '''async function loadKeys() {
  const container = document.getElementById('keys-list-container');
  container.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted)">Loading API keys...</p></div>`;

  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/keys`);
    const keys = res.keys || [];
    const activeKeys = keys.filter(k => k.active !== false);
    document.getElementById('sidebar-key-count').textContent = activeKeys.length;

    const btnHeader = document.getElementById('btn-header-create-key');
    const policyBadge = document.getElementById('key-policy-status-badge');
    if (activeKeys.length > 0) {
      if (btnHeader) btnHeader.style.display = 'none';
      if (policyBadge) {
        policyBadge.className = 'badge badge-good';
        policyBadge.textContent = '1/1 Active Key Configured';
      }
    } else {
      if (btnHeader) btnHeader.style.display = 'inline-flex';
      if (policyBadge) {
        policyBadge.className = 'badge badge-neutral';
        policyBadge.textContent = '0/1 Active Key (Ready to generate)';
      }
    }

    if (!keys.length) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            </div>
            <div class="empty-state-title">No API keys yet</div>
            <p class="empty-state-desc">Create your single active API key to start making requests to BioAuth from your backend or frontend SDK.</p>
            <button class="btn btn-primary" onclick="openModal('modal-create-key')">Create API Key</button>
          </div>
        </div>`;
      return;
    }'''

if old_load_keys in html:
    html = html.replace(old_load_keys, new_load_keys)

# 4. Check submitCreateKey to block creating if active key exists
old_submit_key = '''async function submitCreateKey() {'''
new_submit_key = '''async function submitCreateKey() {
  const currentKeyBadge = document.getElementById('key-policy-status-badge');
  if (currentKeyBadge && currentKeyBadge.textContent.includes('1/1')) {
    toast('Account already has 1 active API key. Please revoke your existing key before creating a new one.', 'warn');
    return;
  }'''

if old_submit_key in html:
    html = html.replace(old_submit_key, new_submit_key)

# 5. Update renderWorkspaceSelector so client only sees their own workspace
old_render_ws = '''function renderWorkspaceSelector() {
  const currentWs = state.workspaces.find(w => w.id === state.activeWorkspaceId) || state.workspaces[0];
  state.activeWorkspace = currentWs;

  if (currentWs) {
    document.getElementById('active-workspace-name').textContent = currentWs.name;
    const tierBadge = document.getElementById('active-workspace-tier');
    tierBadge.textContent = (currentWs.tier || 'growth').toUpperCase();
    tierBadge.className = `badge badge-${currentWs.tier || 'growth'}`;
  }

  const listContainer = document.getElementById('workspace-list-container');
  if (listContainer) {
    listContainer.innerHTML = state.workspaces.map(w => `
      <div class="workspace-item ${w.id === state.activeWorkspaceId ? 'active' : ''}" onclick="selectWorkspace('${esc(w.id)}')">
        <div class="workspace-item-info">
          <div class="workspace-item-name">${esc(w.name)}</div>
          <div class="workspace-item-slug">${esc(w.id)} &middot; ${(w.tier || 'growth').toUpperCase()}</div>
        </div>
        ${w.id === state.activeWorkspaceId ? '<span style="color:var(--primary);font-size:12px">✓</span>' : ''}
      </div>
    `).join('');
  }
}'''

new_render_ws = '''function renderWorkspaceSelector() {
  const currentWs = state.workspaces.find(w => w.id === state.activeWorkspaceId) || state.workspaces[0];
  state.activeWorkspace = currentWs;

  if (currentWs) {
    document.getElementById('active-workspace-name').textContent = currentWs.name;
    const tierBadge = document.getElementById('active-workspace-tier');
    tierBadge.textContent = (currentWs.tier || 'growth').toUpperCase();
    tierBadge.className = `badge badge-${currentWs.tier || 'growth'}`;
  }

  const isSuperAdmin = state.user && state.user.role === 'admin';
  const hasMultiple = state.workspaces && state.workspaces.length > 1;

  // Toggle dropdown chevron: only show if user can switch
  const toggleBtn = document.getElementById('workspace-toggle-btn');
  if (toggleBtn) {
    const ch = toggleBtn.querySelector('svg:last-child');
    if (ch) ch.style.display = (isSuperAdmin || hasMultiple) ? 'inline-block' : 'none';
  }

  const listContainer = document.getElementById('workspace-list-container');
  if (listContainer) {
    listContainer.innerHTML = state.workspaces.map(w => `
      <div class="workspace-item ${w.id === state.activeWorkspaceId ? 'active' : ''}" onclick="selectWorkspace('${esc(w.id)}')">
        <div class="workspace-item-info">
          <div class="workspace-item-name">${esc(w.name)}</div>
          <div class="workspace-item-slug">${esc(w.id)} &middot; ${(w.tier || 'growth').toUpperCase()}</div>
        </div>
        ${w.id === state.activeWorkspaceId ? '<span style="color:var(--primary);font-size:12px">✓</span>' : ''}
      </div>
    `).join('');
  }
}'''

if old_render_ws in html:
    html = html.replace(old_render_ws, new_render_ws)

with open(console_path, "w", encoding="utf-8") as f:
    f.write(html)

print("console.html successfully updated!")
