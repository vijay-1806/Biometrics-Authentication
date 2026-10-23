#!/usr/bin/env python3
"""
BioAuth BaaS — Enterprise SaaS Developer Console Generator
Produces frontend/console.html — a commercial-grade, multi-tenant developer platform
with authentication, onboarding, tenant isolation, key lifecycle management,
real telemetry (zero fake data), and separated Platform Admin Console.
"""

import os

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "console.html")

CSS_STYLES = """
:root {
  --bg: #07090e;
  --surface: #0d121c;
  --surface-raised: #121826;
  --panel: rgba(18, 24, 38, 0.75);
  --panel-solid: #151d2e;
  --border: rgba(255, 255, 255, 0.08);
  --border-hl: rgba(255, 255, 255, 0.16);
  --border-focus: rgba(59, 130, 246, 0.5);
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --primary-subtle: rgba(59, 130, 246, 0.12);
  --accent: #06b6d4;
  --accent-subtle: rgba(6, 182, 212, 0.12);
  --good: #10b981;
  --good-subtle: rgba(16, 185, 129, 0.12);
  --warn: #f59e0b;
  --warn-subtle: rgba(245, 158, 11, 0.12);
  --danger: #ef4444;
  --danger-subtle: rgba(239, 68, 68, 0.12);
  --purple: #8b5cf6;
  --purple-subtle: rgba(139, 92, 246, 0.12);
  --text: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-dim: #475569;
  --sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --sidebar-w: 248px;
  --topbar-h: 60px;
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.5);
  --shadow-lg: 0 10px 30px rgba(0,0,0,0.6);
  --transition: 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-size: 13.5px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

/* Typography Utilities */
h1, h2, h3, h4 { color: #fff; font-weight: 600; letter-spacing: -0.02em; }
code, pre { font-family: var(--mono); }
a { color: var(--primary); text-decoration: none; transition: var(--transition); }
a:hover { color: #60a5fa; }

/* Scrollbars */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
  user-select: none;
}
.btn-primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  box-shadow: 0 1px 3px rgba(59,130,246,0.3);
}
.btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
.btn-secondary {
  background: var(--surface-raised);
  color: var(--text);
  border-color: var(--border);
}
.btn-secondary:hover { background: rgba(255,255,255,0.08); border-color: var(--border-hl); color: #fff; }
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}
.btn-ghost:hover { background: rgba(255,255,255,0.06); color: var(--text); }
.btn-danger {
  background: var(--danger-subtle);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.25);
}
.btn-danger:hover { background: var(--danger); color: #fff; border-color: var(--danger); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-xs { padding: 3px 8px; font-size: 11px; border-radius: 4px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge-live, .badge-active, .badge-success { background: var(--good-subtle); color: var(--good); border: 1px solid rgba(16,185,129,0.25); }
.badge-test, .badge-warning { background: var(--warn-subtle); color: var(--warn); border: 1px solid rgba(245,158,11,0.25); }
.badge-revoked, .badge-danger, .badge-deny { background: var(--danger-subtle); color: var(--danger); border: 1px solid rgba(239,68,68,0.25); }
.badge-primary, .badge-growth, .badge-owner { background: var(--primary-subtle); color: var(--primary); border: 1px solid rgba(59,130,246,0.25); }
.badge-purple, .badge-enterprise { background: var(--purple-subtle); color: var(--purple); border: 1px solid rgba(139,92,246,0.25); }
.badge-neutral { background: rgba(255,255,255,0.06); color: var(--text-secondary); border: 1px solid var(--border); }

/* Forms */
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 12.5px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }
.form-input, .form-select, .form-textarea {
  width: 100%;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  color: #fff;
  font-family: var(--sans);
  font-size: 13.5px;
  transition: var(--transition);
  outline: none;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.form-input::placeholder { color: var(--text-dim); }
.form-hint { font-size: 11.5px; color: var(--text-muted); margin-top: 5px; }

/* Cards & Panels */
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  backdrop-filter: blur(12px);
  position: relative;
  transition: border-color var(--transition);
}
.card:hover { border-color: var(--border-hl); }
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title { font-size: 14px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px; }
.card-body { padding: 20px; }

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
}
.empty-state-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
.empty-state-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 6px; }
.empty-state-desc { font-size: 13px; color: var(--text-muted); max-width: 400px; margin: 0 auto 20px; line-height: 1.6; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 7, 13, 0.75);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-overlay.open { display: flex; }
.modal-container {
  background: var(--surface);
  border: 1px solid var(--border-hl);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 520px;
  overflow: hidden;
  animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.modal-header {
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-title { font-size: 15px; font-weight: 600; color: #fff; }
.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: var(--transition);
}
.modal-close:hover { color: #fff; background: rgba(255,255,255,0.06); }
.modal-body { padding: 22px; max-height: calc(85vh - 120px); overflow-y: auto; }
.modal-footer {
  padding: 14px 22px;
  border-top: 1px solid var(--border);
  background: rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

/* Toast Root */
#toast-root {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  min-width: 280px;
  max-width: 420px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: toastIn 0.25s ease forwards;
}
.toast.success { border-left: 4px solid var(--good); }
.toast.error { border-left: 4px solid var(--danger); }
.toast.warn { border-left: 4px solid var(--warn); }
@keyframes toastIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ========================================================================= */
/* AUTH CONTAINER (Login, Register, Onboarding, Forgot Password)             */
/* ========================================================================= */
#auth-shell {
  display: none;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  background: radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.08) 0, transparent 60%), var(--bg);
  overflow-y: auto;
}
.auth-box {
  width: 100%;
  max-width: 440px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 36px 32px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(20px);
}
.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}
.auth-brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--primary), var(--purple));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px rgba(59,130,246,0.35);
}
.auth-brand-logo svg { width: 20px; height: 20px; fill: white; }
.auth-brand-name { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.4px; }
.auth-title { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px; }
.auth-subtitle { font-size: 13.5px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.5; }
.auth-alert {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  margin-bottom: 18px;
  display: none;
}
.auth-alert.error { background: var(--danger-subtle); border: 1px solid rgba(239, 68, 68, 0.25); color: #fca5a5; display: block; }
.auth-alert.success { background: var(--good-subtle); border: 1px solid rgba(16, 185, 129, 0.25); color: #86efac; display: block; }
.auth-footer { margin-top: 24px; text-align: center; font-size: 13px; color: var(--text-muted); }

/* ========================================================================= */
/* MAIN APP SHELL                                                            */
/* ========================================================================= */
#app-shell {
  display: none;
  height: 100vh;
  flex-direction: column;
}
.topbar {
  height: var(--topbar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  position: relative;
  z-index: 100;
  flex-shrink: 0;
}
.topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  width: calc(var(--sidebar-w) - 20px);
  flex-shrink: 0;
  text-decoration: none;
}
.brand-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), var(--purple));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(59,130,246,0.3);
}
.brand-icon svg { width: 16px; height: 16px; fill: white; }
.brand-title { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
.brand-title span { color: var(--primary); font-family: var(--mono); font-size: 11px; display: block; }

/* Workspace Switcher in Header */
.workspace-switcher {
  position: relative;
}
.workspace-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  cursor: pointer;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  transition: var(--transition);
}
.workspace-btn:hover { border-color: var(--border-hl); background: rgba(255,255,255,0.08); }
.workspace-icon { width: 14px; height: 14px; color: var(--text-muted); }
.workspace-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 280px;
  background: var(--surface-raised);
  border: 1px solid var(--border-hl);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 6px;
  display: none;
  z-index: 500;
}
.workspace-menu.open { display: block; }
.workspace-menu-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); padding: 8px 10px 4px; letter-spacing: 0.05em; }
.workspace-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: var(--transition);
}
.workspace-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.workspace-item.active { background: var(--primary-subtle); color: var(--primary); font-weight: 500; }
.workspace-item-info { display: flex; flex-direction: column; gap: 2px; }
.workspace-item-name { font-size: 13px; }
.workspace-item-slug { font-size: 11px; font-family: var(--mono); color: var(--text-dim); }

/* Topbar Center & Right */
.topbar-center { flex: 1; display: flex; align-items: center; gap: 12px; }
.topbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
.health-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-family: var(--mono);
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--good-subtle);
  border: 1px solid rgba(16,185,129,0.2);
  color: var(--good);
}
.health-pill.offline { background: var(--danger-subtle); border-color: rgba(239,68,68,0.2); color: var(--danger); }
.pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* User Avatar & Menu */
.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 20px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--text);
  transition: var(--transition);
}
.user-menu-btn:hover { background: rgba(255,255,255,0.06); border-color: var(--border); }
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--purple));
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 20px;
  width: 220px;
  background: var(--surface-raised);
  border: 1px solid var(--border-hl);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 6px;
  display: none;
  z-index: 500;
}
.user-dropdown.open { display: block; }
.user-dropdown-header { padding: 10px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.user-dropdown-name { font-size: 13px; font-weight: 600; color: #fff; }
.user-dropdown-email { font-size: 11.5px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; }
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}
.dropdown-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.dropdown-item.danger { color: var(--danger); }
.dropdown-item.danger:hover { background: var(--danger-subtle); }

/* Body Layout */
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-w);
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
  padding: 16px 8px 24px;
}
.nav-section { margin-bottom: 18px; }
.nav-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 6px 12px;
  letter-spacing: 0.08em;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.nav-item.active { background: var(--primary-subtle); color: var(--primary); font-weight: 600; }
.nav-item-icon { width: 16px; height: 16px; flex-shrink: 0; stroke-width: 2; }
.nav-badge {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255,255,255,0.08);
  color: var(--text-muted);
}
.nav-item.active .nav-badge { background: var(--primary); color: #fff; }

/* Main Content Area */
.main-view {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px 60px;
  background: radial-gradient(circle at 10% 5%, rgba(59, 130, 246, 0.04) 0, transparent 40%), var(--bg);
}
.page-container {
  max-width: 1080px;
  margin: 0 auto;
  display: none;
  animation: pageFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.page-container.active { display: block; }
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-header {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-heading { font-size: 24px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
.page-subheading { font-size: 13.5px; color: var(--text-muted); margin-top: 4px; }
.page-actions { display: flex; align-items: center; gap: 10px; }

/* Stat Grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  position: relative;
  overflow: hidden;
  transition: border-color var(--transition);
}
.stat-card:hover { border-color: var(--border-hl); }
.stat-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--stat-accent, var(--primary));
  opacity: 0.7;
}
.stat-label { font-size: 12px; font-weight: 500; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
.stat-value { font-size: 28px; font-weight: 700; font-family: var(--mono); color: #fff; letter-spacing: -0.03em; }
.stat-sub { font-size: 11.5px; color: var(--text-dim); margin-top: 4px; }

/* Checklist Card */
.checklist-card {
  background: linear-gradient(180deg, rgba(59,130,246,0.06), rgba(18,24,38,0.85));
  border: 1px solid rgba(59,130,246,0.25);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  margin-bottom: 24px;
}
.checklist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.checklist-title { font-size: 15px; font-weight: 600; color: #fff; }
.checklist-progress-text { font-family: var(--mono); font-size: 12.5px; color: var(--primary); font-weight: 600; }
.progress-bar-bg {
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
  margin-bottom: 18px;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  transition: width 0.4s ease;
}
.checklist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}
.check-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  font-size: 13px;
}
.check-item-left { display: flex; align-items: center; gap: 10px; }
.check-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  flex-shrink: 0;
}
.check-item.done .check-circle {
  background: var(--good);
  border-color: var(--good);
  color: white;
}
.check-item.done span { color: var(--text-secondary); text-decoration: line-through; }

/* Table Styles */
.table-wrap {
  width: 100%;
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}
.table th {
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
}
.table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
}
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: rgba(255,255,255,0.02); }

/* Key Cards / Rows */
.key-item {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: border-color var(--transition);
}
.key-item:hover { border-color: var(--border-hl); }
.key-main { display: flex; flex-direction: column; gap: 4px; }
.key-title-row { display: flex; align-items: center; gap: 10px; }
.key-name { font-size: 14px; font-weight: 600; color: #fff; }
.key-meta { font-size: 11.5px; color: var(--text-muted); }
.key-val-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text);
}
.key-val-text { user-select: all; }
.key-actions { display: flex; align-items: center; gap: 8px; }

/* Tabs */
.tabs-strip {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}
.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 16px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 600; }

/* Code Blocks */
.code-panel {
  background: #090d15;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  position: relative;
  overflow: hidden;
  margin-top: 12px;
}
.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,0.02);
  font-size: 11.5px;
  color: var(--text-muted);
}
.code-pre {
  padding: 14px 16px;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: #e2e8f0;
}

/* Activity Items */
.activity-list { display: flex; flex-direction: column; gap: 10px; }
.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
}
.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}
.activity-content { flex: 1; }
.activity-title { font-size: 13px; font-weight: 500; color: #fff; }
.activity-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.activity-time { font-size: 11px; font-family: var(--mono); color: var(--text-dim); }

/* Responsive Navigation */
@media (max-width: 900px) {
  :root { --sidebar-w: 64px; }
  .topbar-brand .brand-title, .nav-section-title, .nav-item span:not(.nav-item-icon) { display: none; }
  .nav-item { justify-content: center; padding: 10px; }
  .main-view { padding: 20px 16px; }
}
"""

print("CSS styles compiled.")
