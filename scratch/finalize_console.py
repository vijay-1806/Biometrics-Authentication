import os

console_path = os.path.join(r"c:\Users\vijay\Documents\CLG - PROJECTS\NEW\Biometrics-Authentication\behavioral-auth-ml-service\frontend\console.html")

with open(console_path, "r", encoding="utf-8") as f:
    html = f.read()

# Replace loadEnrollments block
old_enroll_block = '''// ---------------------------------------------------------------------------
// Page: Enrollments
// ---------------------------------------------------------------------------
async function loadEnrollments() {
  const tbody = document.getElementById('enrollments-table-body');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px">Loading enrolled profiles...</td></tr>`;

  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/enrollments`);
    const profiles = res.enrolled_profiles || [];
    document.getElementById('enrollments-count-badge').textContent = `${profiles.length} profiles`;
    document.getElementById('sidebar-enrollment-count').textContent = profiles.length;

    if (!profiles.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="empty-state-title">No behavioral profiles</div>
              <p class="empty-state-desc">Enroll your first user to start building keystroke profiles.</p>
              <button class="btn btn-secondary btn-sm" onclick="navigateTo('quickstart')">View Enrollment Quickstart</button>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = profiles.map(p => {
      const stateBadge = p.state === 'full' 
        ? '<span class="badge badge-good">CALIBRATED (FULL)</span>' 
        : (p.state === 'provisional' 
            ? '<span class="badge badge-warning">PROVISIONAL</span>' 
            : '<span class="badge badge-neutral">COLLECTING</span>');
      
      const rawName = p.display_name || p.user_id;
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const email = p.email || 'No email registered';
      const pct = Math.min(100, Math.round((p.samples_collected / 15) * 100));

      return `
        <tr>
          <td>
            <div style="display:flex;flex-direction:column;gap:2px">
              <strong style="font-size:13px;color:var(--text-bright)">${esc(formattedName)}</strong>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:11px;color:var(--text-muted)">${esc(email)}</span>
                <span class="badge badge-neutral" style="font-size:9.5px;font-family:var(--mono)">${esc(p.user_id.slice(0, 10))}...</span>
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex;flex-direction:column;gap:4px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-family:var(--mono);font-size:12px;font-weight:600">${p.samples_collected} samples</span>
                <span style="font-size:10.5px;color:var(--text-dim)">${pct}% min baseline</span>
              </div>
              <div style="width:100%;max-width:120px;height:4px;background:var(--border);border-radius:2px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, var(--primary), var(--purple))"></div>
              </div>
            </div>
          </td>
          <td>${stateBadge}</td>
          <td>
            <div style="display:flex;align-items:center;gap:5px">
              <span style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--text-bright)">${p.trusted_sessions_count || 0}</span>
              <span style="font-size:11px;color:var(--text-muted)">verified sessions</span>
            </div>
          </td>
          <td>
            <div style="display:flex;flex-direction:column;gap:2px">
              <span class="badge badge-good" style="font-size:10.5px">IsolationForest Ready</span>
              <span style="font-size:10px;color:var(--text-dim);font-family:var(--mono)">200 Estimators · Calibrated</span>
            </div>
          </td>
          <td>
            <button class="btn btn-secondary btn-xs" onclick="retrainProfile('${esc(p.user_id)}')">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Retrain Model
            </button>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:30px">Failed to load profiles: ${esc(err.message)}</td></tr>`;
  }
}'''

new_enroll_block = '''// ---------------------------------------------------------------------------
// Page: Enrollments
// ---------------------------------------------------------------------------
state.cachedProfiles = [];

function filterEnrollmentsList(q) {
  const query = (q || '').trim().toLowerCase();
  const filtered = query 
    ? state.cachedProfiles.filter(p => (p.user_id || '').toLowerCase().includes(query) || (p.display_name || '').toLowerCase().includes(query) || (p.email || '').toLowerCase().includes(query))
    : state.cachedProfiles;
  renderEnrollmentRows(filtered);
}

function renderEnrollmentRows(profiles) {
  const tbody = document.getElementById('enrollments-table-body');
  if (!profiles.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state" style="padding:28px 0">
            <div class="empty-state-title">No matching profiles</div>
            <p class="empty-state-desc">No enrolled users match your search query.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = profiles.map(p => {
    const stateBadge = p.state === 'full' 
      ? '<span class="badge badge-good">CALIBRATED (FULL)</span>' 
      : (p.state === 'provisional' 
          ? '<span class="badge badge-warning">PROVISIONAL</span>' 
          : '<span class="badge badge-neutral">COLLECTING</span>');
    
    const rawName = p.display_name || p.user_id;
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const email = p.email || 'No email registered';
    const pct = Math.min(100, Math.round((p.samples_collected / 15) * 100));

    return `
      <tr>
        <td>
          <div style="display:flex;flex-direction:column;gap:2px">
            <strong style="font-size:13px;color:var(--text-bright)">${esc(formattedName)}</strong>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:11px;color:var(--text-muted)">${esc(email)}</span>
              <span class="badge badge-neutral" style="font-size:9.5px;font-family:var(--mono)">${esc(p.user_id.slice(0, 10))}...</span>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-family:var(--mono);font-size:12px;font-weight:600">${p.samples_collected} samples</span>
              <span style="font-size:10.5px;color:var(--text-dim)">${pct}% min baseline</span>
            </div>
            <div style="width:100%;max-width:120px;height:4px;background:var(--border);border-radius:2px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, var(--primary), var(--purple))"></div>
            </div>
          </div>
        </td>
        <td>${stateBadge}</td>
        <td>
          <div style="display:flex;align-items:center;gap:5px">
            <span style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--text-bright)">${p.trusted_sessions_count || 0}</span>
            <span style="font-size:11px;color:var(--text-muted)">verified sessions</span>
          </div>
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:2px">
            <span class="badge badge-good" style="font-size:10.5px">IsolationForest Ready</span>
            <span style="font-size:10px;color:var(--text-dim);font-family:var(--mono)">200 Estimators · Calibrated</span>
          </div>
        </td>
        <td>
          <button class="btn btn-secondary btn-xs" onclick="retrainProfile('${esc(p.user_id)}')">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Retrain Model
          </button>
        </td>
      </tr>`;
  }).join('');
}

async function loadEnrollments() {
  const tbody = document.getElementById('enrollments-table-body');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px">Loading enrolled profiles...</td></tr>`;

  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/enrollments`);
    const profiles = res.enrolled_profiles || [];
    state.cachedProfiles = profiles;
    document.getElementById('enrollments-count-badge').textContent = `${profiles.length} profiles`;
    document.getElementById('sidebar-enrollment-count').textContent = profiles.length;

    const s = document.getElementById('enrollment-search-box');
    filterEnrollmentsList(s ? s.value : '');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:30px">Failed to load profiles: ${esc(err.message)}</td></tr>`;
  }
}'''

if old_enroll_block in html:
    html = html.replace(old_enroll_block, new_enroll_block)

# Replace loadVerifications block
old_ver_block = '''// ---------------------------------------------------------------------------
// Page: Verifications
// ---------------------------------------------------------------------------
function filterVerifications(action) {
  state.verificationsFilter = action;
  ['all', 'allow', 'step_up', 'deny'].forEach(a => {
    const el = document.getElementById(`vf-${a}`);
    if (el) el.classList.toggle('active', a === action);
  });
  loadVerifications();
}

async function loadVerifications() {
  const tbody = document.getElementById('verifications-table-body');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px">Loading verification requests...</td></tr>`;

  try {
    const act = state.verificationsFilter === 'all' ? '' : `?action=${state.verificationsFilter}`;
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/verifications${act}`);
    const vers = res.verifications || [];

    if (!vers.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-title">No verification requests yet</div>
              <p class="empty-state-desc">Verification events will appear here in real time as your applications score keystrokes.</p>
              <button class="btn btn-secondary btn-sm" onclick="navigateTo('sandbox')">Test in Sandbox</button>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = vers.map(v => {
      const actBadge = v.action === 'allow' ? '<span class="badge badge-success">ALLOW</span>' : (v.action === 'step_up' ? '<span class="badge badge-warning">STEP UP</span>' : '<span class="badge badge-danger">DENY</span>');
      return `
        <tr>
          <td style="font-family:var(--mono);font-size:11.5px;color:var(--text-muted)">${new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
          <td><strong style="font-family:var(--mono)">${esc(v.user_id)}</strong></td>
          <td>${actBadge}</td>
          <td style="font-family:var(--mono);font-weight:600">${v.trust_score ?? '--'}</td>
          <td><span class="badge badge-neutral">${esc(v.risk_level)}</span></td>
          <td>${v.confidence ? v.confidence + '%' : '--'}</td>
          <td style="font-family:var(--mono);font-size:11.5px">${v.latency_ms || 0}ms</td>
          <td style="font-size:12px;color:var(--text-muted)">${esc(v.reason || '')}</td>
        </tr>`;
    }).join('');
  } catch {}
}'''

new_ver_block = '''// ---------------------------------------------------------------------------
// Page: Verifications
// ---------------------------------------------------------------------------
state.cachedVerifications = [];

function filterVerificationsBySearch(q) {
  const query = (q || '').trim().toLowerCase();
  const filtered = query 
    ? state.cachedVerifications.filter(v => (v.user_id || '').toLowerCase().includes(query) || (v.reason || '').toLowerCase().includes(query))
    : state.cachedVerifications;
  renderVerificationRows(filtered);
}

function renderVerificationRows(vers) {
  const tbody = document.getElementById('verifications-table-body');
  if (!vers.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state" style="padding:28px 0">
            <div class="empty-state-title">No verification requests found</div>
            <p class="empty-state-desc">No events match the current filter criteria.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = vers.map(v => {
    const actBadge = v.action === 'allow' ? '<span class="badge badge-success">ALLOW</span>' : (v.action === 'step_up' ? '<span class="badge badge-warning">STEP UP</span>' : '<span class="badge badge-danger">DENY</span>');
    return `
      <tr>
        <td style="font-family:var(--mono);font-size:11.5px;color:var(--text-muted)">${new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
        <td><strong style="font-family:var(--mono)">${esc(v.user_id)}</strong></td>
        <td>${actBadge}</td>
        <td style="font-family:var(--mono);font-weight:600">${v.trust_score ?? '--'}</td>
        <td><span class="badge badge-neutral">${esc(v.risk_level)}</span></td>
        <td>${v.confidence ? v.confidence + '%' : '--'}</td>
        <td style="font-family:var(--mono);font-size:11.5px">${v.latency_ms || 0}ms</td>
        <td style="font-size:12px;color:var(--text-muted)">${esc(v.reason || '')}</td>
      </tr>`;
  }).join('');
}

function filterVerifications(action) {
  state.verificationsFilter = action;
  ['all', 'allow', 'step_up', 'deny'].forEach(a => {
    const el = document.getElementById(`vf-${a}`);
    if (el) el.classList.toggle('active', a === action);
  });
  loadVerifications();
}

async function loadVerifications() {
  const tbody = document.getElementById('verifications-table-body');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px">Loading verification requests...</td></tr>`;

  try {
    const act = state.verificationsFilter === 'all' ? '' : `?action=${state.verificationsFilter}`;
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/verifications${act}`);
    const vers = res.verifications || [];
    state.cachedVerifications = vers;

    const s = document.getElementById('verifications-search-box');
    filterVerificationsBySearch(s ? s.value : '');
  } catch {}
}'''

if old_ver_block in html:
    html = html.replace(old_ver_block, new_ver_block)

with open(console_path, "w", encoding="utf-8") as f:
    f.write(html)

print("console.html finalized successfully!")
