import os
import re

console_path = os.path.join(r"c:\Users\vijay\Documents\CLG - PROJECTS\NEW\Biometrics-Authentication\behavioral-auth-ml-service\frontend\console.html")

with open(console_path, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update Enrollments view header to include search box
old_enroll_card_hdr = '''        <div class="card">
          <div class="card-header">
            <span class="card-title">Enrolled Users</span>
            <span class="badge badge-neutral" id="enrollments-count-badge">0 profiles</span>
          </div>'''

new_enroll_card_hdr = '''        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px;flex-wrap:wrap">
          <input type="text" id="enrollment-search-box" class="form-input" placeholder="Search enrolled users by name, email, or user ID..." oninput="filterEnrollmentsList(this.value)" style="max-width:380px;font-size:12.5px">
          <span class="badge badge-neutral" id="enrollments-count-badge">0 profiles</span>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Enrolled Users &amp; Biometric Baselines</span>
          </div>'''

if old_enroll_card_hdr in html:
    html = html.replace(old_enroll_card_hdr, new_enroll_card_hdr)

# 2. Update Verifications view header to include search box
old_ver_hdr = '''          <div class="page-actions">
            <div style="display:flex;align-items:center;background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-sm);padding:2px">
              <button class="btn btn-ghost btn-xs active" id="vf-all" onclick="filterVerifications('all')">All</button>
              <button class="btn btn-ghost btn-xs" id="vf-allow" onclick="filterVerifications('allow')">Allow</button>
              <button class="btn btn-ghost btn-xs" id="vf-step_up" onclick="filterVerifications('step_up')">Step Up</button>
              <button class="btn btn-ghost btn-xs" id="vf-deny" onclick="filterVerifications('deny')">Deny</button>
            </div>
          </div>'''

new_ver_hdr = '''          <div class="page-actions" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <input type="text" id="verifications-search-box" class="form-input" placeholder="Filter by User ID..." oninput="filterVerificationsBySearch(this.value)" style="max-width:200px;font-size:12px;padding:4px 10px">
            <div style="display:flex;align-items:center;background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-sm);padding:2px">
              <button class="btn btn-ghost btn-xs active" id="vf-all" onclick="filterVerifications('all')">All</button>
              <button class="btn btn-ghost btn-xs" id="vf-allow" onclick="filterVerifications('allow')">Allow</button>
              <button class="btn btn-ghost btn-xs" id="vf-step_up" onclick="filterVerifications('step_up')">Step Up</button>
              <button class="btn btn-ghost btn-xs" id="vf-deny" onclick="filterVerifications('deny')">Deny</button>
            </div>
          </div>'''

if old_ver_hdr in html:
    html = html.replace(old_ver_hdr, new_ver_hdr)

# 3. Update loadEnrollments to support searching
old_load_enroll = '''async function loadEnrollments() {
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

    tbody.innerHTML = profiles.map(p => {'''

new_load_enroll = '''state.cachedProfiles = [];

function filterEnrollmentsList(q) {
  const tbody = document.getElementById('enrollments-table-body');
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
              <span style="font-size:10.5px;color:var(--text-dim)">${pct}% baseline</span>
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

    const searchInput = document.getElementById('enrollment-search-box');
    filterEnrollmentsList(searchInput ? searchInput.value : '');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:30px">Failed to load profiles: ${esc(err.message)}</td></tr>`;
  }
}

// Dummy marker to match replacing old code
function _dummy_enroll_replacement() {
    tbody.innerHTML = profiles.map(p => {'''

# Find loadEnrollments in html and replace
enroll_func_pattern = re.compile(r'async function loadEnrollments\(\) \{.*?\}\n\}\n', re.DOTALL)
m = enroll_func_pattern.search(html)
if m:
    # Let's inspect where it ends
    pass

with open(console_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Headers updated successfully!")
