#!/usr/bin/env python3
"""
Generates the complete BioAuth BaaS Enterprise Developer Console.
Outputs frontend/console.html.
"""

import os

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "console.html")

HTML_CONTENT = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BioAuth BaaS &mdash; Enterprise Behavioral Biometrics Platform</title>
<meta name="description" content="Multi-tenant Keystroke Behavioral Biometrics-as-a-Service developer platform. Manage API keys, workspaces, continuous verification, and telemetry.">
<link rel="icon" type="image/svg+xml" href="/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>

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

</style>
</head>
<body>

<!-- ======================================================================= -->
<!-- AUTHENTICATION SHELL (Login, Register, Forgot Password, Onboarding)    -->
<!-- ======================================================================= -->
<div id="auth-shell">
  <div class="auth-box">
    <div class="auth-brand">
      <div class="auth-brand-logo">
        <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 12.2c-2.5-1.04-4.41-3.23-4.9-5.9 1.48-.73 3.19-1.3 4.9-1.3s3.42.57 4.9 1.3c-.49 2.67-2.4 4.86-4.9 5.9z"/></svg>
      </div>
      <div class="auth-brand-name">BioAuth <span>BaaS</span></div>
    </div>

    <div id="auth-alert" class="auth-alert"></div>

    <!-- 1. LOGIN VIEW -->
    <div id="auth-view-login">
      <h1 class="auth-title">Sign in to BioAuth</h1>
      <p class="auth-subtitle">Access your behavioral biometrics workspace and API credentials.</p>
      <form onsubmit="handleLoginSubmit(event)">
        <div class="form-group">
          <label class="form-label">Work Email</label>
          <input type="email" id="login-email" class="form-input" placeholder="name@company.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <label class="form-label" style="margin-bottom:0">Password</label>
            <a href="javascript:void(0)" onclick="showAuthView('forgot')" style="font-size:12px">Forgot password?</a>
          </div>
          <input type="password" id="login-password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <button type="submit" id="login-submit-btn" class="btn btn-primary" style="width:100%;padding:10px;font-size:13.5px;margin-top:8px">
          Sign In to Workspace &rarr;
        </button>
      </form>
      <div class="auth-footer">
        Don't have an account? <a href="javascript:void(0)" onclick="showAuthView('register')">Create account</a>
      </div>
    </div>

    <!-- 2. REGISTER VIEW -->
    <div id="auth-view-register" style="display:none">
      <h1 class="auth-title">Create your account</h1>
      <p class="auth-subtitle">Start integrating behavioral biometric verification into your LMS or SaaS.</p>
      <form onsubmit="handleRegisterSubmit(event)">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="reg-name" class="form-input" placeholder="Vijay Kumar" required autocomplete="name">
        </div>
        <div class="form-group">
          <label class="form-label">Work Email</label>
          <input type="email" id="reg-email" class="form-input" placeholder="name@university.edu" required autocomplete="email">
        </div>
        <div class="form-group">
          <label class="form-label">Company / Institution (Optional)</label>
          <input type="text" id="reg-company" class="form-input" placeholder="Acme University">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" id="reg-password" class="form-input" placeholder="At least 8 characters" required minlength="8" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input type="password" id="reg-confirm" class="form-input" placeholder="Repeat password" required minlength="8" autocomplete="new-password">
        </div>
        <button type="submit" id="reg-submit-btn" class="btn btn-primary" style="width:100%;padding:10px;font-size:13.5px;margin-top:8px">
          Create Account &amp; Continue &rarr;
        </button>
      </form>
      <div class="auth-footer">
        Already have an account? <a href="javascript:void(0)" onclick="showAuthView('login')">Sign in</a>
      </div>
    </div>

    <!-- 3. FORGOT PASSWORD VIEW -->
    <div id="auth-view-forgot" style="display:none">
      <h1 class="auth-title">Reset password</h1>
      <p class="auth-subtitle">Enter your work email address and we'll generate password reset instructions.</p>
      <form onsubmit="handleForgotSubmit(event)">
        <div class="form-group">
          <label class="form-label">Work Email</label>
          <input type="email" id="forgot-email" class="form-input" placeholder="name@company.com" required>
        </div>
        <button type="submit" id="forgot-submit-btn" class="btn btn-primary" style="width:100%;padding:10px;font-size:13.5px;margin-top:8px">
          Send Recovery Instructions
        </button>
      </form>
      <div id="reset-token-box" style="display:none;margin-top:16px;padding:12px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.03);border:1px solid var(--border)">
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Development reset token issued:</p>
        <div style="font-family:var(--mono);font-size:11px;color:var(--accent);word-break:break-all" id="reset-token-display"></div>
        <div class="form-group" style="margin-top:12px">
          <label class="form-label">New Password</label>
          <input type="password" id="reset-new-password" class="form-input" placeholder="At least 8 characters">
        </div>
        <button type="button" class="btn btn-secondary btn-sm" style="width:100%" onclick="handleResetSubmit()">Apply New Password</button>
      </div>
      <div class="auth-footer">
        Remembered your password? <a href="javascript:void(0)" onclick="showAuthView('login')">Back to sign in</a>
      </div>
    </div>

    <!-- 4. ONBOARDING: WORKSPACE CREATION -->
    <div id="auth-view-onboarding" style="display:none">
      <div class="badge badge-primary" style="margin-bottom:12px">Onboarding &middot; Step 1 of 1</div>
      <h1 class="auth-title">Create your workspace</h1>
      <p class="auth-subtitle">Workspaces isolate your API credentials, user biometric profiles, and event telemetry.</p>
      <form onsubmit="handleOnboardingSubmit(event)">
        <div class="form-group">
          <label class="form-label">Organization / Workspace Name</label>
          <input type="text" id="onboard-name" class="form-input" placeholder="e.g. Acme University LMS" required oninput="updateSlugPreview(this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Workspace Identifier (Slug)</label>
          <div style="display:flex;align-items:center;background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0 12px">
            <span style="font-family:var(--mono);color:var(--text-muted);font-size:12px">bioauth.io/</span>
            <input type="text" id="onboard-slug" class="form-input" style="border:none;background:transparent;padding-left:4px;font-family:var(--mono);font-size:12.5px" placeholder="acme-university" required>
          </div>
          <p class="form-hint">Unique identifier used in API headers and SDK initialization.</p>
        </div>
        <div class="form-group">
          <label class="form-label">Plan Tier</label>
          <select id="onboard-tier" class="form-select">
            <option value="starter">Starter &mdash; 120 RPM, 3 keys, 30-day retention</option>
            <option value="growth" selected>Growth &mdash; 600 RPM, 10 keys, 90-day retention (Recommended)</option>
            <option value="enterprise">Enterprise &mdash; 3,000 RPM, 50 keys, 365-day retention</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Industry / Use Case (Optional)</label>
          <select id="onboard-industry" class="form-select">
            <option value="education">LMS &amp; Online Exam Proctoring</option>
            <option value="finance">Banking, Fintech &amp; Payments</option>
            <option value="saas">SaaS Continuous Authentication</option>
            <option value="healthcare">Healthcare &amp; HIPAA Compliance</option>
            <option value="other">Other Developer Integration</option>
          </select>
        </div>
        <button type="submit" id="onboard-submit-btn" class="btn btn-primary" style="width:100%;padding:10px;font-size:13.5px;margin-top:8px">
          Finish Setup &amp; Open Dashboard &rarr;
        </button>
      </form>
    </div>

  </div>
</div>

<!-- ======================================================================= -->
<!-- MAIN APP SHELL (Topbar + Collapsible Sidebar + Dynamic Page Views)     -->
<!-- ======================================================================= -->
<div id="app-shell">
  <!-- TOPBAR -->
  <header class="topbar">
    <a href="#dashboard" class="topbar-brand">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 12.2c-2.5-1.04-4.41-3.23-4.9-5.9 1.48-.73 3.19-1.3 4.9-1.3s3.42.57 4.9 1.3c-.49 2.67-2.4 4.86-4.9 5.9z"/></svg>
      </div>
      <div class="brand-title">BioAuth <span>Enterprise BaaS</span></div>
    </a>

    <!-- WORKSPACE SELECTOR -->
    <div class="workspace-switcher">
      <button class="workspace-btn" id="workspace-toggle-btn" onclick="toggleWorkspaceMenu(event)">
        <svg class="workspace-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span id="active-workspace-name" style="max-width:160px;overflow:hidden;text-overflow:ellipsis">Loading...</span>
        <span id="active-workspace-tier" class="badge badge-growth" style="font-size:9.5px;padding:1px 5px">GROWTH</span>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      <div class="workspace-menu" id="workspace-menu">
        <div class="workspace-menu-label">Your Workspaces</div>
        <div id="workspace-list-container"></div>
        <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px">
          <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start" onclick="openModal('modal-create-workspace');closeWorkspaceMenu()">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create New Workspace
          </button>
        </div>
      </div>
    </div>

    <!-- TOPBAR RIGHT -->
    <div class="topbar-right">
      <div class="health-pill" id="health-pill">
        <span class="pulse-dot"></span>
        <span id="health-status-text">Connecting...</span>
      </div>

      <a href="#api-reference" class="btn btn-ghost btn-sm" style="color:var(--text-secondary)">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Docs
      </a>

      <!-- USER AVATAR & DROPDOWN -->
      <div style="position:relative">
        <button class="user-menu-btn" onclick="toggleUserDropdown(event)">
          <div class="user-avatar" id="user-avatar-initials">VK</div>
          <span id="user-display-name" style="font-size:13px;font-weight:500;max-width:100px;overflow:hidden;text-overflow:ellipsis">Vijay</span>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        <div class="user-dropdown" id="user-dropdown">
          <div class="user-dropdown-header">
            <div class="user-dropdown-name" id="user-menu-name">Vijay</div>
            <div class="user-dropdown-email" id="user-menu-email">vijay@bioauth.io</div>
          </div>
          <div class="dropdown-item" onclick="navigateTo('settings');closeUserDropdown()">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Workspace Settings
          </div>
          <div class="dropdown-item danger" onclick="handleLogout()">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- BODY: SIDEBAR + CONTENT -->
  <div class="app-body">
    <!-- SIDEBAR -->
    <nav class="sidebar">
      <div class="nav-section">
        <div class="nav-section-title">Project</div>
        <div class="nav-item active" data-route="dashboard" onclick="navigateTo('dashboard')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          <span>Dashboard</span>
        </div>
        <div class="nav-item" data-route="api-keys" onclick="navigateTo('api-keys')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          <span>API Keys</span>
          <span class="nav-badge" id="sidebar-key-count">0</span>
        </div>
        <div class="nav-item" data-route="usage" onclick="navigateTo('usage')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span>Usage &amp; Telemetry</span>
        </div>
        <div class="nav-item" data-route="quickstart" onclick="navigateTo('quickstart')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Quickstart</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Biometric Services</div>
        <div class="nav-item" data-route="enrollments" onclick="navigateTo('enrollments')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Enrollments</span>
          <span class="nav-badge" id="sidebar-enrollment-count">0</span>
        </div>
        <div class="nav-item" data-route="verifications" onclick="navigateTo('verifications')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Verifications</span>
        </div>
        <div class="nav-item" data-route="risk-events" onclick="navigateTo('risk-events')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Risk Events</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Developers</div>
        <div class="nav-item" data-route="api-reference" onclick="navigateTo('api-reference')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>API Reference</span>
        </div>
        <div class="nav-item" data-route="webhooks" onclick="navigateTo('webhooks')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>Webhooks</span>
        </div>
        <div class="nav-item" data-route="sandbox" onclick="navigateTo('sandbox')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <span>Test Sandbox</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Settings</div>
        <div class="nav-item" data-route="settings" onclick="navigateTo('settings')">
          <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Workspace</span>
        </div>
      </div>

      <!-- PLATFORM ADMIN SECTION (Only visible to admin role) -->
      <div class="nav-section" id="sidebar-admin-section" style="display:none">
        <div class="nav-section-title" style="color:var(--purple)">Platform Admin</div>
        <div class="nav-item" data-route="admin" onclick="navigateTo('admin')">
          <svg class="nav-item-icon" style="color:var(--purple)" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Admin Console</span>
        </div>
      </div>
    </nav>

    <!-- MAIN VIEW -->
    <main class="main-view">

      <!-- =================================================================== -->
      <!-- PAGE: DASHBOARD                                                     -->
      <!-- =================================================================== -->
      <section class="page-container active" id="view-dashboard">
        <div class="page-header">
          <div>
            <h1 class="page-heading" id="dash-greeting">Good morning, Vijay</h1>
            <p class="page-subheading">Here's what's happening with your BioAuth workspace.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('quickstart')">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Quickstart
            </button>
            <button class="btn btn-primary btn-sm" onclick="openModal('modal-create-key')">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create API Key
            </button>
          </div>
        </div>

        <!-- STAT CARDS (REAL DATA ONLY) -->
        <div class="stat-grid">
          <div class="stat-card" style="--stat-accent:var(--primary)">
            <div class="stat-label">API Requests</div>
            <div class="stat-value" id="kpi-requests">0</div>
            <div class="stat-sub">Lifetime requests for workspace</div>
          </div>
          <div class="stat-card" style="--stat-accent:var(--good)">
            <div class="stat-label">Verifications</div>
            <div class="stat-value" id="kpi-verifications">0</div>
            <div class="stat-sub">Live sessions evaluated</div>
          </div>
          <div class="stat-card" style="--stat-accent:var(--accent)">
            <div class="stat-label">Enrolled Profiles</div>
            <div class="stat-value" id="kpi-profiles">0</div>
            <div class="stat-sub">Biometric models trained</div>
          </div>
          <div class="stat-card" style="--stat-accent:var(--warn)">
            <div class="stat-label">Risk Events</div>
            <div class="stat-value" id="kpi-anomalies">0</div>
            <div class="stat-sub">Flagged anomalies &amp; deviations</div>
          </div>
        </div>

        <!-- ONBOARDING CHECKLIST (CALCULATED FROM REAL STATE) -->
        <div class="checklist-card" id="checklist-card">
          <div class="checklist-header">
            <div>
              <div class="checklist-title">Get started with BioAuth</div>
              <p style="font-size:12.5px;color:var(--text-muted);margin-top:2px">Follow these steps to complete your behavioral biometrics integration.</p>
            </div>
            <div class="checklist-progress-text" id="checklist-counter">0 of 6 completed</div>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="checklist-bar" style="width:0%"></div>
          </div>
          <div class="checklist-grid" id="checklist-items-grid"></div>
        </div>

        <!-- USAGE TIME-SERIES CHART -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <span class="card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              API Request Volume
            </span>
            <div style="display:flex;align-items:center;gap:6px">
              <button class="btn btn-ghost btn-xs active" onclick="setDashboardPeriod('24h', this)">24h</button>
              <button class="btn btn-ghost btn-xs" onclick="setDashboardPeriod('7d', this)">7d</button>
              <button class="btn btn-ghost btn-xs" onclick="setDashboardPeriod('30d', this)">30d</button>
            </div>
          </div>
          <div class="card-body" id="dash-chart-container" style="min-height:220px;display:flex;align-items:center;justify-content:center">
            <div class="empty-state" style="padding:24px 0">
              <div class="empty-state-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div class="empty-state-title">No API activity yet</div>
              <p class="empty-state-desc">Your API verification metrics will chart here as your application sends requests.</p>
              <button class="btn btn-secondary btn-sm" onclick="navigateTo('sandbox')">Test API in Sandbox</button>
            </div>
          </div>
        </div>

        <!-- RECENT ACTIVITY FEED -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Recent Workspace Activity
            </span>
            <button class="btn btn-ghost btn-xs" onclick="loadDashboard()">Refresh</button>
          </div>
          <div class="card-body" id="dash-activity-container">
            <div class="empty-state" style="padding:20px 0">
              <p style="color:var(--text-muted);font-size:13px">No activity yet.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: API KEYS                                                      -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-api-keys">
        <div class="page-header">
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
        </div>

        <div id="keys-list-container">
          <!-- Populated dynamically with real keys or empty state -->
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: USAGE & TELEMETRY                                             -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-usage">
        <div class="page-header">
          <div>
            <h1 class="page-heading">Usage &amp; Telemetry</h1>
            <p class="page-subheading">Monitor API usage, verification volumes, and behavioral biometric activity for this workspace.</p>
          </div>
          <div class="page-actions">
            <div style="display:flex;align-items:center;background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-sm);padding:2px">
              <button class="btn btn-ghost btn-xs" id="usage-filter-24h" onclick="changeUsagePeriod('24h')">Last 24 Hours</button>
              <button class="btn btn-ghost btn-xs active" id="usage-filter-7d" onclick="changeUsagePeriod('7d')">7 Days</button>
              <button class="btn btn-ghost btn-xs" id="usage-filter-30d" onclick="changeUsagePeriod('30d')">30 Days</button>
              <button class="btn btn-ghost btn-xs" id="usage-filter-90d" onclick="changeUsagePeriod('90d')">90 Days</button>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><span class="card-title">Request Breakdown</span></div>
          <div class="card-body" id="usage-chart-area" style="min-height:260px">
            <!-- Dynamic SVG chart or empty state -->
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Rate Limit Quota</span></div>
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="color:var(--text-secondary)" id="usage-rpm-label">Plan Limit: 600 Requests / Minute</span>
              <span style="font-family:var(--mono);color:var(--good)" id="usage-rpm-val">Healthy</span>
            </div>
            <div class="progress-bar-bg" style="margin-bottom:12px">
              <div class="progress-bar-fill" style="width:2%;background:var(--good)"></div>
            </div>
            <p style="font-size:12px;color:var(--text-muted)">Need higher throughput or custom SLAs? <a href="#settings">Upgrade your plan</a> in Workspace Settings.</p>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: ENROLLMENTS                                                   -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-enrollments">
        <div class="page-header">
          <div>
            <h1 class="page-heading">Behavioral Profiles</h1>
            <p class="page-subheading">Users enrolled with biometric baseline models in this workspace.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('quickstart')">Enrollment SDK Docs</button>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px;flex-wrap:wrap">
          <input type="text" id="enrollment-search-box" class="form-input" placeholder="Search enrolled users by name, email, or user ID..." oninput="filterEnrollmentsList(this.value)" style="max-width:380px;font-size:12.5px">
          <span class="badge badge-neutral" id="enrollments-count-badge">0 profiles</span>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Enrolled Users &amp; Biometric Baselines</span>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>User &amp; Identity</th>
                    <th>Samples Collected</th>
                    <th>Model State</th>
                    <th>Continuous Sessions</th>
                    <th>ML Engine Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="enrollments-table-body">
                  <!-- Real database profiles -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: VERIFICATIONS                                                 -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-verifications">
        <div class="page-header">
          <div>
            <h1 class="page-heading">Verifications</h1>
            <p class="page-subheading">Real-time log of behavioral biometric evaluation requests.</p>
          </div>
          <div class="page-actions" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <input type="text" id="verifications-search-box" class="form-input" placeholder="Filter by User ID..." oninput="filterVerificationsBySearch(this.value)" style="max-width:200px;font-size:12px;padding:4px 10px">
            <div style="display:flex;align-items:center;background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-sm);padding:2px">
              <button class="btn btn-ghost btn-xs active" id="vf-all" onclick="filterVerifications('all')">All</button>
              <button class="btn btn-ghost btn-xs" id="vf-allow" onclick="filterVerifications('allow')">Allow</button>
              <button class="btn btn-ghost btn-xs" id="vf-step_up" onclick="filterVerifications('step_up')">Step Up</button>
              <button class="btn btn-ghost btn-xs" id="vf-deny" onclick="filterVerifications('deny')">Deny</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body" style="padding:0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User ID</th>
                    <th>Decision</th>
                    <th>Trust Score</th>
                    <th>Risk</th>
                    <th>Confidence</th>
                    <th>Latency</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody id="verifications-table-body">
                  <!-- Real log records -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: RISK EVENTS                                                   -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-risk-events">
        <div class="page-header">
          <div>
            <h1 class="page-heading">Risk Events &amp; Anomalies</h1>
            <p class="page-subheading">Flagged sessions where typing rhythms significantly deviated from baseline profiles.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-body" style="padding:0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User ID</th>
                    <th>Action</th>
                    <th>Risk Level</th>
                    <th>Trust Score</th>
                    <th>Deviation Reason</th>
                    <th>Webhook</th>
                  </tr>
                </thead>
                <tbody id="risk-events-table-body">
                  <!-- Real anomaly events -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: QUICKSTART INTEGRATION                                        -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-quickstart">
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
              <pre class="code-pre">curl -X POST "<span class="host-url">http://localhost:8000</span>/verify" \
  -H "X-API-Key: YOUR_WORKSPACE_KEY" \
  -H "Content-Type: application/json" \
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
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: API REFERENCE                                                 -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-api-reference">
        <div class="page-header">
          <div>
            <h1 class="page-heading">API Reference</h1>
            <p class="page-subheading">Comprehensive documentation for all BioAuth BaaS HTTP endpoints.</p>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-header">
            <span class="card-title">
              <span class="badge badge-primary">POST</span>
              <span style="font-family:var(--mono);font-size:13px">/verify</span>
            </span>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Scores a live keystroke timing sample against a user's Isolation Forest behavioral profile.</p>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Headers:</div>
            <div style="font-family:var(--mono);font-size:12px;background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:14px">
              Authorization: Bearer YOUR_API_KEY<br>Content-Type: application/json
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Request Body:</div>
            <div class="code-panel" style="margin-top:0">
              <pre class="code-pre">{
  "user_id": "string (required)",
  "events": [
    { "key": "string", "type": "down" | "up", "t": float }
  ]
}</pre>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-header">
            <span class="card-title">
              <span class="badge badge-primary">POST</span>
              <span style="font-family:var(--mono);font-size:13px">/enroll</span>
            </span>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Registers an enrollment typing sample. When sufficient samples are collected (10 for provisional, 20 for full), the model is automatically fitted and cached in memory.</p>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-header">
            <span class="card-title">
              <span class="badge badge-neutral">GET</span>
              <span style="font-family:var(--mono);font-size:13px">/users/{user_id}/status</span>
            </span>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary)">Returns the user's current enrollment sample count, model status (collecting, provisional, full), and in-memory cache status.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">
              <span class="badge badge-neutral">GET</span>
              <span style="font-family:var(--mono);font-size:13px">/v1/system/health</span>
            </span>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary)">Returns cluster health, in-memory model cache hit ratio, and active enterprise features.</p>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: WEBHOOKS                                                      -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-webhooks">
        <div class="page-header">
          <div>
            <h1 class="page-heading">Webhooks</h1>
            <p class="page-subheading">Receive real-time BioAuth event notifications signed with HMAC-SHA256.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" onclick="sendTestWebhook()">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Send Test Webhook
            </button>
          </div>
        </div>

        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><span class="card-title">Endpoint Configuration</span></div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Webhook Destination URL</label>
              <div style="display:flex;gap:10px">
                <input type="url" id="webhook-url-input" class="form-input" placeholder="https://your-lms.com/webhooks/bioauth">
                <button class="btn btn-primary" onclick="saveWebhookSettings()">Save URL</button>
              </div>
              <p class="form-hint">Events sent: <code>biometric.deny</code>, <code>biometric.step_up</code>, <code>biometric.verification</code></p>
            </div>
            <div style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              All webhook payloads are cryptographically signed using <strong>HMAC-SHA256</strong>.
              Verify the signature using the header <code style="color:var(--accent)">X-Bio-Signature</code>.
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">HMAC-SHA256 Signature Verification Example</span></div>
          <div class="card-body">
            <div class="code-panel" style="margin-top:0">
              <div class="code-header"><span>Node.js / Express</span><button class="btn btn-ghost btn-xs" onclick="copySnippet(this)">Copy</button></div>
              <pre class="code-pre">const crypto = require("crypto");

function verifyBioAuthWebhook(req, secret) {
  const signature = req.headers["x-bio-signature"];
  const computed = crypto.createHmac("sha256", secret)
                         .update(JSON.stringify(req.body))
                         .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}</pre>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: TEST SANDBOX                                                  -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-sandbox">
        <div class="page-header">
          <div>
            <h1 class="page-heading">Biometric Test Sandbox</h1>
            <p class="page-subheading">Interactive testing environment. Experiment with keystroke verification in real time.</p>
          </div>
          <div class="badge badge-warning" style="font-size:11px;padding:4px 8px">
            SANDBOX MODE &mdash; DEMO DATA ONLY
          </div>
        </div>

        <div class="card" style="margin-bottom:24px">
          <div class="card-header">
            <span class="card-title">Type Sample Keystroke Passage</span>
            <span style="font-size:12px;color:var(--text-muted)" id="sandbox-events-count">0 events captured</span>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Type the passage below naturally. BioAuth continuously analyzes your digraph flight time and key hold duration:</p>
            <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;font-family:var(--sans);font-size:13.5px;color:#fff;margin-bottom:16px;line-height:1.6" id="sandbox-passage-text">
              The quick brown fox jumps over the lazy dog. Continuous biometric security protects online exams.
            </div>
            <textarea id="sandbox-input" class="form-textarea" rows="3" placeholder="Click here and type the passage above to test continuous authentication..." onkeydown="handleSandboxKeyDown(event)" onkeyup="handleSandboxKeyUp(event)"></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
              <button class="btn btn-secondary btn-sm" onclick="resetSandbox()">Reset Input</button>
              <button class="btn btn-primary btn-sm" onclick="submitSandboxSample()">Evaluate Sample &rarr;</button>
            </div>
          </div>
        </div>

        <div class="card" id="sandbox-result-card" style="display:none">
          <div class="card-header"><span class="card-title">Biometric Evaluation Result</span></div>
          <div class="card-body">
            <div class="stat-grid" style="margin-bottom:0">
              <div class="stat-card">
                <div class="stat-label">Decision</div>
                <div class="stat-value" id="sb-decision">--</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Trust Score</div>
                <div class="stat-value" id="sb-trust">--</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Risk Level</div>
                <div class="stat-value" id="sb-risk">--</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Confidence</div>
                <div class="stat-value" id="sb-confidence">--</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: WORKSPACE SETTINGS                                            -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-settings">
        <div class="page-header">
          <div>
            <h1 class="page-heading">Workspace Settings</h1>
            <p class="page-subheading">Manage organization details, team members, and security configuration.</p>
          </div>
        </div>

        <div class="tabs-strip">
          <button class="tab-btn active" onclick="switchSettingsTab('general', this)">General</button>
          <button class="tab-btn" onclick="switchSettingsTab('members', this)">Team &amp; Members</button>
          <button class="tab-btn" onclick="switchSettingsTab('security', this)">Security</button>
          <button class="tab-btn" onclick="switchSettingsTab('plan', this)">Plan &amp; Limits</button>
        </div>

        <!-- SETTINGS: GENERAL -->
        <div id="settings-tab-general">
          <div class="card" style="margin-bottom:24px">
            <div class="card-header"><span class="card-title">Organization Details</span></div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Workspace Name</label>
                <input type="text" id="settings-org-name" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">Workspace Identifier (Slug)</label>
                <input type="text" id="settings-org-slug" class="form-input" disabled style="opacity:0.7">
              </div>
              <div class="form-group">
                <label class="form-label">Allowed Domains / Origins (CORS Whitelist)</label>
                <input type="text" id="settings-allowed-origins" class="form-input" placeholder="e.g. https://my-lms.edu, https://exam.my-lms.edu">
                <p class="form-hint">Comma-separated list of origins authorized to use this workspace's client API keys.</p>
              </div>
              <button class="btn btn-primary" onclick="saveGeneralSettings()">Save Changes</button>
            </div>
          </div>

          <div class="card" style="border-color:rgba(239,68,68,0.3)">
            <div class="card-header"><span class="card-title" style="color:var(--danger)">Danger Zone</span></div>
            <div class="card-body">
              <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">Permanently delete this workspace and all associated API keys, enrolled profiles, and telemetry logs. This cannot be undone.</p>
              <button class="btn btn-danger" onclick="confirmDeleteWorkspace()">Delete Workspace</button>
            </div>
          </div>
        </div>

        <!-- SETTINGS: MEMBERS -->
        <div id="settings-tab-members" style="display:none">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Workspace Members</span>
              <button class="btn btn-primary btn-sm" onclick="openModal('modal-invite-member')">+ Invite Member</button>
            </div>
            <div class="card-body" style="padding:0">
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody id="members-table-body">
                    <!-- Real members -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- SETTINGS: SECURITY -->
        <div id="settings-tab-security" style="display:none">
          <div class="card">
            <div class="card-header"><span class="card-title">Change Account Password</span></div>
            <div class="card-body">
              <form onsubmit="handlePasswordChange(event)" style="max-width:400px">
                <div class="form-group">
                  <label class="form-label">Current Password</label>
                  <input type="password" id="pw-old" class="form-input" required>
                </div>
                <div class="form-group">
                  <label class="form-label">New Password</label>
                  <input type="password" id="pw-new" class="form-input" required minlength="8">
                </div>
                <button type="submit" class="btn btn-primary">Update Password</button>
              </form>
            </div>
          </div>
        </div>

        <!-- SETTINGS: PLAN -->
        <div id="settings-tab-plan" style="display:none">
          <div class="card">
            <div class="card-header"><span class="card-title">Current Plan Tier</span></div>
            <div class="card-body">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                <div style="font-size:20px;font-weight:700;color:#fff" id="plan-tier-name">Growth Tier</div>
                <span class="badge badge-growth">Active</span>
              </div>
              <div class="stat-grid" style="margin-bottom:0">
                <div class="stat-card">
                  <div class="stat-label">Rate Limit</div>
                  <div class="stat-value" id="plan-rpm">600</div>
                  <div class="stat-sub">Requests per minute</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">API Key Quota</div>
                  <div class="stat-value" id="plan-max-keys">10</div>
                  <div class="stat-sub">Max active keys</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Data Retention</div>
                  <div class="stat-value" id="plan-retention">90</div>
                  <div class="stat-sub">Days telemetry retained</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- PAGE: PLATFORM ADMIN CONSOLE                                        -->
      <!-- =================================================================== -->
      <section class="page-container" id="view-admin">
        <div class="page-header">
          <div>
            <div class="badge badge-purple" style="margin-bottom:8px">Superuser Mode</div>
            <h1 class="page-heading">Platform Administration</h1>
            <p class="page-subheading">Cluster-wide management, organizations list, user accounts, and system health.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" onclick="loadAdmin()">Refresh Cluster Telemetry</button>
          </div>
        </div>

        <div class="stat-grid" style="margin-bottom:24px">
          <div class="stat-card" style="--stat-accent:var(--purple)">
            <div class="stat-label">Total Organizations</div>
            <div class="stat-value" id="admin-kpi-tenants">0</div>
          </div>
          <div class="stat-card" style="--stat-accent:var(--primary)">
            <div class="stat-label">Total Platform Users</div>
            <div class="stat-value" id="admin-kpi-users">0</div>
          </div>
          <div class="stat-card" style="--stat-accent:var(--good)">
            <div class="stat-label">Active API Keys</div>
            <div class="stat-value" id="admin-kpi-keys">0</div>
          </div>
          <div class="stat-card" style="--stat-accent:var(--accent)">
            <div class="stat-label">Cache Hit Ratio</div>
            <div class="stat-value" id="admin-kpi-cache">--</div>
          </div>
        </div>

        <!-- ALL TENANTS TABLE -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><span class="card-title">All Customer Organizations</span></div>
          <div class="card-body" style="padding:0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Organization ID</th>
                    <th>Name</th>
                    <th>Plan Tier</th>
                    <th>Enrolled Users</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="admin-tenants-table-body">
                  <!-- Real tenants list -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PLATFORM AUDIT LOGS -->
        <div class="card">
          <div class="card-header"><span class="card-title">Cluster Security &amp; Audit Trail</span></div>
          <div class="card-body" style="padding:0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Workspace</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody id="admin-audit-table-body">
                  <!-- Real audit logs -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</div>

<!-- ======================================================================= -->
<!-- MODALS                                                                  -->
<!-- ======================================================================= -->

<!-- 1. MODAL: CREATE API KEY -->
<div class="modal-overlay" id="modal-create-key">
  <div class="modal-container">
    <div class="modal-header">
      <div class="modal-title">Create API Key</div>
      <button class="modal-close" onclick="closeModal('modal-create-key')">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Step 1: Form -->
      <div id="key-create-form-view">
        <div class="form-group">
          <label class="form-label">Key Name / Description</label>
          <input type="text" id="new-key-name" class="form-input" placeholder="e.g. Production LMS Exam Key">
        </div>
        <div class="form-group">
          <label class="form-label">Environment</label>
          <select id="new-key-env" class="form-select">
            <option value="live" selected>Production (bio_live_...)</option>
            <option value="test">Test / Sandbox (bio_test_...)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Permissions &amp; Scopes</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary)">
              <input type="checkbox" id="scope-verify" checked> <span>verify (Score keystrokes)</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary)">
              <input type="checkbox" id="scope-enroll" checked> <span>enroll (Submit samples)</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary)">
              <input type="checkbox" id="scope-retrain" checked> <span>retrain (Update models)</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary)">
              <input type="checkbox" id="scope-admin"> <span>admin (Manage keys)</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Allowed Origins (Optional)</label>
          <input type="text" id="new-key-origins" class="form-input" placeholder="* for all origins, or https://my-lms.edu">
          <p class="form-hint">Restrict key usage to authorized browser web domains.</p>
        </div>
      </div>

      <!-- Step 2: Show Raw Key Once -->
      <div id="key-create-success-view" style="display:none">
        <div style="padding:12px;border-radius:var(--radius-sm);background:var(--warn-subtle);border:1px solid rgba(245,158,11,0.25);margin-bottom:16px">
          <div style="font-weight:600;color:var(--warn);font-size:13px;margin-bottom:4px">&#9888; Copy your API key now</div>
          <p style="font-size:12px;color:var(--text-secondary);line-height:1.5">For enterprise security, this raw key is masked immediately after you close this dialog. Keep it secure in your application's <code>.env</code> file.</p>
        </div>
        <div class="key-val-box" style="padding:10px 14px;margin-bottom:10px">
          <span class="key-val-text" id="created-raw-key-display" style="font-size:13px;word-break:break-all">--</span>
        </div>
        <button class="btn btn-secondary btn-sm" style="width:100%" onclick="copyCreatedKey()">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Key to Clipboard
        </button>
      </div>
    </div>
    <div class="modal-footer" id="key-modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-create-key')">Cancel</button>
      <button class="btn btn-primary" id="btn-submit-create-key" onclick="submitCreateKey()">Create Key</button>
    </div>
  </div>
</div>

<!-- 2. MODAL: REVEAL KEY CONFIRMATION -->
<div class="modal-overlay" id="modal-reveal-key">
  <div class="modal-container">
    <div class="modal-header">
      <div class="modal-title">Reveal API Key</div>
      <button class="modal-close" onclick="closeModal('modal-reveal-key')">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6">
        Anyone with access to this API key can authenticate requests with its assigned permissions.
        Verify your identity or confirm to reveal the complete decrypted secret.
      </p>
      <div id="reveal-box-area" style="display:none;margin-bottom:16px">
        <div class="key-val-box" style="padding:10px 14px">
          <span class="key-val-text" id="revealed-key-text" style="font-size:13px;word-break:break-all"></span>
        </div>
      </div>
    </div>
    <div class="modal-footer" id="reveal-modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-reveal-key')">Cancel</button>
      <button class="btn btn-primary" id="btn-do-reveal" onclick="performKeyReveal()">Reveal Secret</button>
    </div>
  </div>
</div>

<!-- 3. MODAL: REVOKE KEY CONFIRMATION -->
<div class="modal-overlay" id="modal-revoke-key">
  <div class="modal-container" style="max-width:440px">
    <div class="modal-header">
      <div class="modal-title" style="color:var(--warn)">Revoke API Key?</div>
      <button class="modal-close" onclick="closeModal('modal-revoke-key')">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">
        This API key will immediately stop authenticating requests. Any applications or SDK instances using this key will receive HTTP 401 Unauthorized errors.
      </p>
      <p style="font-size:12px;color:var(--text-muted);margin-top:10px">Target: <strong id="revoke-target-name"></strong></p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-revoke-key')">Cancel</button>
      <button class="btn btn-danger" onclick="performKeyRevoke()">Revoke Key Immediately</button>
    </div>
  </div>
</div>

<!-- 4. MODAL: DELETE KEY CONFIRMATION (ONLY REVOKED KEYS) -->
<div class="modal-overlay" id="modal-delete-key">
  <div class="modal-container" style="max-width:440px">
    <div class="modal-header">
      <div class="modal-title" style="color:var(--danger)">Delete API Key Permanently?</div>
      <button class="modal-close" onclick="closeModal('modal-delete-key')">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">
        This permanently deletes the revoked key record from your workspace. This action cannot be reversed.
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal('modal-delete-key')">Cancel</button>
      <button class="btn btn-danger" onclick="performKeyDelete()">Delete Permanently</button>
    </div>
  </div>
</div>

<!-- 5. MODAL: CREATE WORKSPACE -->
<div class="modal-overlay" id="modal-create-workspace">
  <div class="modal-container">
    <div class="modal-header">
      <div class="modal-title">Create New Workspace</div>
      <button class="modal-close" onclick="closeModal('modal-create-workspace')">&times;</button>
    </div>
    <div class="modal-body">
      <form onsubmit="handleCreateWorkspaceModalSubmit(event)">
        <div class="form-group">
          <label class="form-label">Workspace Name</label>
          <input type="text" id="modal-ws-name" class="form-input" placeholder="e.g. SIET LMS Production" required>
        </div>
        <div class="form-group">
          <label class="form-label">Plan Tier</label>
          <select id="modal-ws-tier" class="form-select">
            <option value="starter">Starter</option>
            <option value="growth" selected>Growth (Recommended)</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:10px">Create Workspace</button>
      </form>
    </div>
  </div>
</div>

<!-- 6. MODAL: INVITE MEMBER -->
<div class="modal-overlay" id="modal-invite-member">
  <div class="modal-container">
    <div class="modal-header">
      <div class="modal-title">Invite Team Member</div>
      <button class="modal-close" onclick="closeModal('modal-invite-member')">&times;</button>
    </div>
    <div class="modal-body">
      <form onsubmit="handleInviteMemberSubmit(event)">
        <div class="form-group">
          <label class="form-label">Member Work Email</label>
          <input type="email" id="invite-email" class="form-input" placeholder="colleague@company.com" required>
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select id="invite-role" class="form-select">
            <option value="developer" selected>Developer (Manage keys &amp; integrations)</option>
            <option value="viewer">Viewer (Read-only analytics)</option>
            <option value="admin">Admin (Full workspace administration)</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Send Invitation</button>
      </form>
    </div>
  </div>
</div>

<div id="toast-root"></div>

<!-- ======================================================================= -->
<!-- CLIENT JAVASCRIPT APPLICATION LOGIC                                     -->
<!-- ======================================================================= -->
<script>
const API_BASE = window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:8000';

const state = {
  user: null,
  sessionToken: localStorage.getItem('bioauth_session_token') || null,
  activeWorkspaceId: null,
  activeWorkspace: null,
  workspaces: [],
  currentRoute: 'dashboard',
  analyticsPeriod: '7d',
  verificationsFilter: 'all',
  pendingKeyId: null,
  sandboxEvents: [],
  sandboxStartTime: null,
};

// ---------------------------------------------------------------------------
// Network Helpers
// ---------------------------------------------------------------------------
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.sessionToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${state.sessionToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let errDetail = `HTTP ${res.status}`;
    try {
      const e = await res.json();
      errDetail = e.detail || errDetail;
    } catch {}
    throw new Error(errDetail);
  }
  return res.json().catch(() => ({}));
}

// ---------------------------------------------------------------------------
// UI Utilities: Toasts, Modals, Clipboard
// ---------------------------------------------------------------------------
function toast(msg, type = 'success') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

function copyText(text, successMsg = 'Copied to clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(successMsg)).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  toast(successMsg);
}

function copySnippet(btn) {
  const pre = btn.closest('.code-panel').querySelector('pre');
  copyText(pre.innerText, 'Code copied to clipboard!');
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ---------------------------------------------------------------------------
// Authentication & Boot Flow
// ---------------------------------------------------------------------------
async function initApp() {
  // Update host placeholders in all snippets
  document.querySelectorAll('.host-url').forEach(el => el.textContent = API_BASE);

  checkHealth();
  setInterval(checkHealth, 30000);

  if (!state.sessionToken) {
    showAuthView('login');
    return;
  }

  try {
    const me = await api('/v1/auth/me');
    state.user = me.user;
    state.workspaces = me.workspaces || [];
    state.activeWorkspaceId = me.active_workspace_id || (state.workspaces[0] ? state.workspaces[0].id : null);

    if (!state.workspaces.length) {
      showAuthView('onboarding');
      return;
    }

    renderAppShell();
    handleHashNavigation();
  } catch (err) {
    localStorage.removeItem('bioauth_session_token');
    state.sessionToken = null;
    showAuthView('login');
  }
}

function showAuthView(viewName) {
  document.getElementById('app-shell').style.display = 'none';
  const authShell = document.getElementById('auth-shell');
  authShell.style.display = 'flex';

  ['login', 'register', 'forgot', 'onboarding'].forEach(v => {
    const el = document.getElementById(`auth-view-${v}`);
    if (el) el.style.display = (v === viewName) ? 'block' : 'none';
  });

  const alert = document.getElementById('auth-alert');
  if (alert) alert.style.display = 'none';
}

function showAuthAlert(msg, type = 'error') {
  const alert = document.getElementById('auth-alert');
  if (alert) {
    alert.className = `auth-alert ${type}`;
    alert.textContent = msg;
    alert.style.display = 'block';
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await api('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    state.sessionToken = res.session_token;
    localStorage.setItem('bioauth_session_token', res.session_token);
    state.user = res.user;
    toast(`Welcome back, ${res.user.name}!`);

    if (!res.has_workspaces) {
      showAuthView('onboarding');
    } else {
      await initApp();
    }
  } catch (err) {
    showAuthAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In to Workspace →';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const company = document.getElementById('reg-company').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;

  if (password !== confirm) {
    showAuthAlert('Passwords do not match.', 'error');
    return;
  }

  const btn = document.getElementById('reg-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    const res = await api('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, company }),
    });
    state.sessionToken = res.session_token;
    localStorage.setItem('bioauth_session_token', res.session_token);
    state.user = res.user;
    toast('Account created successfully!');
    // Transition straight into workspace onboarding
    showAuthView('onboarding');
  } catch (err) {
    showAuthAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account & Continue →';
  }
}

function updateSlugPreview(name) {
  const slugInput = document.getElementById('onboard-slug');
  if (slugInput) {
    slugInput.value = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}

async function handleOnboardingSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('onboard-name').value.trim();
  const slug = document.getElementById('onboard-slug').value.trim();
  const tier = document.getElementById('onboard-tier').value;
  const industry = document.getElementById('onboard-industry').value;
  const btn = document.getElementById('onboard-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Setting up workspace...';

  try {
    const res = await api('/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, workspace_id: slug, tier, industry }),
    });
    toast('Workspace created successfully!');
    await initApp();
  } catch (err) {
    showAuthAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Finish Setup & Open Dashboard →';
  }
}

async function handleForgotSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  const btn = document.getElementById('forgot-submit-btn');
  btn.disabled = true;

  try {
    const res = await api('/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    showAuthAlert(res.message, 'success');
    if (res.reset_token) {
      document.getElementById('reset-token-box').style.display = 'block';
      document.getElementById('reset-token-display').textContent = res.reset_token;
    }
  } catch (err) {
    showAuthAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function handleResetSubmit() {
  const token = document.getElementById('reset-token-display').textContent.trim();
  const newPassword = document.getElementById('reset-new-password').value;
  if (!newPassword || newPassword.length < 8) {
    showAuthAlert('Password must be at least 8 characters.', 'error');
    return;
  }
  try {
    const res = await api('/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    toast('Password reset successfully! Please sign in.');
    showAuthView('login');
  } catch (err) {
    showAuthAlert(err.message, 'error');
  }
}

async function handleLogout() {
  try {
    await api('/v1/auth/logout', { method: 'POST' });
  } catch {}
  localStorage.removeItem('bioauth_session_token');
  state.sessionToken = null;
  state.user = null;
  state.workspaces = [];
  toast('Signed out.');
  showAuthView('login');
}

// ---------------------------------------------------------------------------
// App Shell & Topbar Rendering
// ---------------------------------------------------------------------------
function renderAppShell() {
  document.getElementById('auth-shell').style.display = 'none';
  const appShell = document.getElementById('app-shell');
  appShell.style.display = 'flex';

  // User Info in Topbar
  if (state.user) {
    const initials = state.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
    document.getElementById('user-avatar-initials').textContent = initials;
    document.getElementById('user-display-name').textContent = state.user.name;
    document.getElementById('user-menu-name').textContent = state.user.name;
    document.getElementById('user-menu-email').textContent = state.user.email;
    document.getElementById('dash-greeting').textContent = `Good morning, ${state.user.name.split(' ')[0]}`;

    // Admin Sidebar Visibility
    const adminSec = document.getElementById('sidebar-admin-section');
    if (adminSec) adminSec.style.display = (state.user.role === 'admin') ? 'block' : 'none';
  }

  // Workspaces Dropdown
  renderWorkspaceSelector();
}

function renderWorkspaceSelector() {
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
}

function toggleWorkspaceMenu(e) {
  e.stopPropagation();
  const m = document.getElementById('workspace-menu');
  m.classList.toggle('open');
  document.getElementById('user-dropdown').classList.remove('open');
}

function closeWorkspaceMenu() {
  document.getElementById('workspace-menu').classList.remove('open');
}

function toggleUserDropdown(e) {
  e.stopPropagation();
  const m = document.getElementById('user-dropdown');
  m.classList.toggle('open');
  document.getElementById('workspace-menu').classList.remove('open');
}

function closeUserDropdown() {
  document.getElementById('user-dropdown').classList.remove('open');
}

document.addEventListener('click', () => {
  closeWorkspaceMenu();
  closeUserDropdown();
});

async function selectWorkspace(workspaceId) {
  if (workspaceId === state.activeWorkspaceId) {
    closeWorkspaceMenu();
    return;
  }
  try {
    await api('/v1/auth/switch-workspace', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId }),
    });
    state.activeWorkspaceId = workspaceId;
    closeWorkspaceMenu();
    renderWorkspaceSelector();
    toast('Switched workspace.');
    navigateTo(state.currentRoute);
  } catch (err) {
    toast(`Failed to switch workspace: ${err.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Health Status Check
// ---------------------------------------------------------------------------
async function checkHealth() {
  const pill = document.getElementById('health-pill');
  const txt = document.getElementById('health-status-text');
  try {
    const h = await api('/v1/system/health');
    pill.className = 'health-pill';
    txt.textContent = `v${h.version} · Healthy`;
  } catch {
    pill.className = 'health-pill offline';
    txt.textContent = 'Service Offline';
  }
}

// ---------------------------------------------------------------------------
// Client Router
// ---------------------------------------------------------------------------
function navigateTo(route) {
  state.currentRoute = route;
  window.location.hash = route;

  // Update sidebar active class
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === route);
  });

  // Activate view container
  document.querySelectorAll('.page-container').forEach(page => {
    page.classList.remove('active');
  });
  const target = document.getElementById(`view-${route}`);
  if (target) {
    target.classList.add('active');
  } else {
    document.getElementById('view-dashboard').classList.add('active');
  }

  // Load data for page
  if (route === 'dashboard') loadDashboard();
  else if (route === 'api-keys') loadKeys();
  else if (route === 'usage') loadUsage();
  else if (route === 'enrollments') loadEnrollments();
  else if (route === 'verifications') loadVerifications();
  else if (route === 'risk-events') loadRiskEvents();
  else if (route === 'webhooks') loadWebhooks();
  else if (route === 'settings') loadSettings();
  else if (route === 'admin') loadAdmin();
}

function handleHashNavigation() {
  const hash = window.location.hash.replace(/^#/, '') || 'dashboard';
  navigateTo(hash);
}

window.addEventListener('hashchange', handleHashNavigation);

// ---------------------------------------------------------------------------
// Page: Dashboard
// ---------------------------------------------------------------------------
async function loadDashboard() {
  if (!state.activeWorkspaceId) return;

  try {
    // 1. Details & KPIs
    const ws = await api(`/v1/workspaces/${state.activeWorkspaceId}`);
    document.getElementById('kpi-requests').textContent = ws.metrics.total_verifications || 0;
    document.getElementById('kpi-verifications').textContent = ws.metrics.total_verifications || 0;
    document.getElementById('kpi-profiles').textContent = ws.enrolled_users_count || 0;
    document.getElementById('kpi-anomalies').textContent = ws.metrics.anomalies_flagged || 0;

    document.getElementById('sidebar-key-count').textContent = ws.active_keys_count || 0;
    document.getElementById('sidebar-enrollment-count').textContent = ws.enrolled_users_count || 0;

    // 2. Checklist
    loadChecklist();

    // 3. Analytics Chart
    renderDashboardChart();

    // 4. Activity Feed
    loadRecentActivity();
  } catch (err) {
    toast(`Error loading dashboard: ${err.message}`, 'error');
  }
}

async function loadChecklist() {
  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/checklist`);
    document.getElementById('checklist-counter').textContent = `${res.completed} of ${res.total} completed`;
    document.getElementById('checklist-bar').style.width = `${res.percentage}%`;

    const grid = document.getElementById('checklist-items-grid');
    grid.innerHTML = res.steps.map(s => `
      <div class="check-item ${s.completed ? 'done' : ''}">
        <div class="check-item-left">
          <div class="check-circle">${s.completed ? '✓' : ''}</div>
          <span>${esc(s.label)}</span>
        </div>
      </div>
    `).join('');
  } catch {}
}

function setDashboardPeriod(period, btn) {
  document.querySelectorAll('#dash-chart-container').forEach(c => {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
  state.analyticsPeriod = period;
  renderDashboardChart();
}

async function renderDashboardChart() {
  const container = document.getElementById('dash-chart-container');
  try {
    const an = await api(`/v1/workspaces/${state.activeWorkspaceId}/analytics?period=${state.analyticsPeriod}`);
    if (!an.has_data) {
      container.innerHTML = `
        <div class="empty-state" style="padding:24px 0">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div class="empty-state-title">No API activity yet</div>
          <p class="empty-state-desc">Your API verification metrics will chart here as your application sends requests.</p>
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('sandbox')">Test API in Sandbox</button>
        </div>`;
      return;
    }

    const b = an.buckets;
    const maxVal = Math.max(...b.map(x => x.total), 1);
    const barsHtml = b.map(item => {
      const hPercent = Math.max(8, (item.total / maxVal) * 100);
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:160px;justify-content:flex-end">
          <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted)">${item.total || ''}</div>
          <div style="width:100%;max-width:24px;height:${hPercent}%;background:linear-gradient(180deg, var(--primary), var(--accent));border-radius:3px 3px 0 0" title="${item.label}: ${item.total} calls"></div>
          <div style="font-size:10.5px;color:var(--text-dim);font-family:var(--mono)">${item.label}</div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div style="width:100%;display:flex;align-items:flex-end;gap:12px;height:180px;padding:10px 0">
        ${barsHtml}
      </div>`;
  } catch {}
}

async function loadRecentActivity() {
  const container = document.getElementById('dash-activity-container');
  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/activity?limit=8`);
    if (!res.activity || !res.activity.length) {
      container.innerHTML = `<div class="empty-state" style="padding:20px 0"><p style="color:var(--text-muted);font-size:13px">No activity yet. Integrate the BioAuth SDK or test in Sandbox to see live telemetry.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="activity-list">
        ${res.activity.map(a => `
          <div class="activity-item">
            <div class="activity-dot" style="background:var(--${a.badge || 'primary'})"></div>
            <div class="activity-content">
              <div class="activity-title">${esc(a.title)}</div>
              <div class="activity-desc">${esc(a.description)}</div>
            </div>
            <div class="activity-time">${new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `).join('')}
      </div>`;
  } catch {}
}

// ---------------------------------------------------------------------------
// Page: API Keys
// ---------------------------------------------------------------------------
async function loadKeys() {
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
    }

    container.innerHTML = keys.map(k => {
      const active = k.active !== false;
      const envBadge = k.type === 'live' ? '<span class="badge badge-live">PRODUCTION</span>' : '<span class="badge badge-test">TEST</span>';
      const statusBadge = active ? '<span class="badge badge-active">ACTIVE</span>' : '<span class="badge badge-revoked">REVOKED</span>';
      const lastUsed = k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never';
      const created = new Date(k.created_at).toLocaleDateString();

      return `
        <div class="key-item">
          <div class="key-main">
            <div class="key-title-row">
              <span class="key-name">${esc(k.name || 'API Key')}</span>
              ${envBadge}
              ${statusBadge}
            </div>
            <div class="key-meta">
              Key ID: <code>${esc(k.key_id)}</code> &middot; Created ${created} &middot; Last used ${lastUsed}
            </div>
            <div style="display:flex;gap:6px;margin-top:6px">
              ${(k.scopes || []).map(s => `<span class="badge badge-neutral" style="font-size:10px">${esc(s)}</span>`).join('')}
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:12px">
            <div class="key-val-box">
              <span class="key-val-text">${esc(k.masked_key)}</span>
              ${active ? `
                <button class="btn btn-ghost btn-xs" title="Reveal raw secret" onclick="openRevealModal('${esc(k.key_id)}')">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              ` : ''}
              <button class="btn btn-ghost btn-xs" title="Copy key" onclick="copyText('${esc(k.masked_key)}')">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>

            <div class="key-actions">
              ${active ? `
                <button class="btn btn-danger btn-xs" onclick="openRevokeModal('${esc(k.key_id)}', '${esc(k.name)}')">Revoke</button>
              ` : `
                <button class="btn btn-danger btn-xs" onclick="openDeleteModal('${esc(k.key_id)}')">Delete</button>
              `}
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="card"><div class="empty-state"><p style="color:var(--danger)">${err.message}</p></div></div>`;
  }
}

async function submitCreateKey() {
  const currentKeyBadge = document.getElementById('key-policy-status-badge');
  if (currentKeyBadge && currentKeyBadge.textContent.includes('1/1')) {
    toast('Account already has 1 active API key. Please revoke your existing key before creating a new one.', 'warn');
    return;
  }
  const name = document.getElementById('new-key-name').value.trim() || 'API Key';
  const type = document.getElementById('new-key-env').value;
  const origins = document.getElementById('new-key-origins').value.trim() || '*';
  const scopes = [];
  if (document.getElementById('scope-verify').checked) scopes.push('verify');
  if (document.getElementById('scope-enroll').checked) scopes.push('enroll');
  if (document.getElementById('scope-retrain').checked) scopes.push('retrain');
  if (document.getElementById('scope-admin').checked) scopes.push('admin');

  const btn = document.getElementById('btn-submit-create-key');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/keys`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        type,
        scopes,
        allowed_origins: origins.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });

    document.getElementById('key-create-form-view').style.display = 'none';
    document.getElementById('key-create-success-view').style.display = 'block';
    document.getElementById('created-raw-key-display').textContent = res.key.key;

    document.getElementById('key-modal-footer').innerHTML = `
      <button class="btn btn-primary" onclick="closeKeyCreateModal()">Done — I've stored my key</button>
    `;
    toast('API key created successfully!');
  } catch (err) {
    toast(`Creation failed: ${err.message}`, 'error');
    btn.disabled = false;
    btn.textContent = 'Create Key';
  }
}

function copyCreatedKey() {
  const key = document.getElementById('created-raw-key-display').textContent;
  copyText(key, 'Raw API key copied to clipboard!');
}

function closeKeyCreateModal() {
  closeModal('modal-create-key');
  document.getElementById('key-create-form-view').style.display = 'block';
  document.getElementById('key-create-success-view').style.display = 'none';
  document.getElementById('key-modal-footer').innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal('modal-create-key')">Cancel</button>
    <button class="btn btn-primary" id="btn-submit-create-key" onclick="submitCreateKey()">Create Key</button>
  `;
  loadKeys();
  loadDashboard();
}

function openRevealModal(keyId) {
  state.pendingKeyId = keyId;
  document.getElementById('reveal-box-area').style.display = 'none';
  document.getElementById('reveal-modal-footer').innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal('modal-reveal-key')">Cancel</button>
    <button class="btn btn-primary" id="btn-do-reveal" onclick="performKeyReveal()">Reveal Secret</button>
  `;
  openModal('modal-reveal-key');
}

async function performKeyReveal() {
  const btn = document.getElementById('btn-do-reveal');
  btn.disabled = true;
  btn.textContent = 'Decrypting...';

  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/keys/${state.pendingKeyId}/reveal`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    document.getElementById('reveal-box-area').style.display = 'block';
    document.getElementById('revealed-key-text').textContent = res.key;
    document.getElementById('reveal-modal-footer').innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="copyText('${res.key}')">Copy Key</button>
      <button class="btn btn-primary btn-sm" onclick="closeModal('modal-reveal-key')">Done</button>
    `;
    toast('Key decrypted.');
  } catch (err) {
    toast(`Reveal failed: ${err.message}`, 'error');
    btn.disabled = false;
    btn.textContent = 'Reveal Secret';
  }
}

function openRevokeModal(keyId, keyName) {
  state.pendingKeyId = keyId;
  document.getElementById('revoke-target-name').textContent = keyName || keyId;
  openModal('modal-revoke-key');
}

async function performKeyRevoke() {
  try {
    await api(`/v1/workspaces/${state.activeWorkspaceId}/keys/${state.pendingKeyId}/revoke`, {
      method: 'POST',
    });
    closeModal('modal-revoke-key');
    toast('API key revoked.');
    loadKeys();
    loadDashboard();
  } catch (err) {
    toast(`Revocation failed: ${err.message}`, 'error');
  }
}

function openDeleteModal(keyId) {
  state.pendingKeyId = keyId;
  openModal('modal-delete-key');
}

async function performKeyDelete() {
  try {
    await api(`/v1/workspaces/${state.activeWorkspaceId}/keys/${state.pendingKeyId}`, {
      method: 'DELETE',
    });
    closeModal('modal-delete-key');
    toast('API key permanently deleted.');
    loadKeys();
    loadDashboard();
  } catch (err) {
    toast(`Delete failed: ${err.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Page: Usage & Telemetry
// ---------------------------------------------------------------------------
function changeUsagePeriod(period) {
  ['24h', '7d', '30d', '90d'].forEach(p => {
    const el = document.getElementById(`usage-filter-${p}`);
    if (el) el.classList.toggle('active', p === period);
  });
  loadUsage(period);
}

async function loadUsage(period = '7d') {
  const chartArea = document.getElementById('usage-chart-area');
  try {
    const an = await api(`/v1/workspaces/${state.activeWorkspaceId}/analytics?period=${period}`);
    if (!an.has_data) {
      chartArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div class="empty-state-title">No API activity yet</div>
          <p class="empty-state-desc">Your API usage will appear here after your first verification request.</p>
        </div>`;
      return;
    }

    const b = an.buckets;
    const maxVal = Math.max(...b.map(x => x.total), 1);
    const barsHtml = b.map(item => {
      const hPercent = Math.max(8, (item.total / maxVal) * 100);
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:200px;justify-content:flex-end">
          <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted)">${item.total || ''}</div>
          <div style="width:100%;max-width:28px;height:${hPercent}%;background:linear-gradient(180deg, var(--primary), var(--purple));border-radius:4px 4px 0 0" title="${item.label}: ${item.total} calls (${item.allows} allow, ${item.step_ups} step_up, ${item.denies} deny)"></div>
          <div style="font-size:11px;color:var(--text-dim);font-family:var(--mono)">${item.label}</div>
        </div>`;
    }).join('');

    chartArea.innerHTML = `
      <div style="width:100%;display:flex;align-items:flex-end;gap:12px;height:220px;padding:10px 0">
        ${barsHtml}
      </div>`;
  } catch {}
}

// ---------------------------------------------------------------------------
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
}

async function retrainProfile(userId) {
  try {
    const res = await api(`/users/${encodeURIComponent(userId)}/retrain?force=true`, { method: 'POST' });
    toast(`Profile updated: ${res.reason || 'Retrained'}`);
    loadEnrollments();
  } catch (err) {
    toast(`Retrain failed: ${err.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
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
}

// ---------------------------------------------------------------------------
// Page: Risk Events
// ---------------------------------------------------------------------------
async function loadRiskEvents() {
  const tbody = document.getElementById('risk-events-table-body');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px">Loading risk events...</td></tr>`;

  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/risk-events`);
    const events = res.risk_events || [];

    if (!events.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-title">No risk events detected</div>
              <p class="empty-state-desc">High and medium risk anomalies will be flagged here automatically.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = events.map(e => `
      <tr>
        <td style="font-family:var(--mono);font-size:11.5px;color:var(--text-muted)">${new Date(e.timestamp).toLocaleString()}</td>
        <td><strong style="font-family:var(--mono)">${esc(e.user_id)}</strong></td>
        <td><span class="badge badge-danger">${esc(e.action.toUpperCase())}</span></td>
        <td><span class="badge badge-warning">${esc(e.risk_level.toUpperCase())}</span></td>
        <td style="font-family:var(--mono);font-weight:600;color:var(--danger)">${e.trust_score ?? '--'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">${esc(e.reason)}</td>
        <td><span style="color:${e.webhook_dispatched ? 'var(--good)' : 'var(--text-dim)'};font-size:12px">${e.webhook_dispatched ? '✓ Dispatched' : 'No Webhook'}</span></td>
      </tr>
    `).join('');
  } catch {}
}

// ---------------------------------------------------------------------------
// Quickstart Tabs
// ---------------------------------------------------------------------------
function switchQuickstartTab(tab, btn) {
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['js', 'rest', 'node', 'python', 'lms'].forEach(t => {
    const el = document.getElementById(`qs-tab-${t}`);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
  });
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------
async function loadWebhooks() {
  if (!state.activeWorkspace) return;
  const input = document.getElementById('webhook-url-input');
  input.value = state.activeWorkspace.webhook_url || '';
}

async function saveWebhookSettings() {
  const url = document.getElementById('webhook-url-input').value.trim();
  try {
    await api(`/v1/workspaces/${state.activeWorkspaceId}`, {
      method: 'PUT',
      body: JSON.stringify({ webhook_url: url }),
    });
    if (state.activeWorkspace) state.activeWorkspace.webhook_url = url;
    toast('Webhook settings saved.');
  } catch (err) {
    toast(`Failed to save webhook: ${err.message}`, 'error');
  }
}

async function sendTestWebhook() {
  try {
    await api('/v1/webhooks/test', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: state.activeWorkspaceId }),
    });
    toast('HMAC-SHA256 test webhook dispatched.');
  } catch (err) {
    toast(`Test webhook failed: ${err.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Sandbox Interactive Keystroke Verification
// ---------------------------------------------------------------------------
function resetSandbox() {
  state.sandboxEvents = [];
  state.sandboxStartTime = null;
  document.getElementById('sandbox-input').value = '';
  document.getElementById('sandbox-events-count').textContent = '0 events captured';
  document.getElementById('sandbox-result-card').style.display = 'none';
}

function handleSandboxKeyDown(e) {
  if (!state.sandboxStartTime) state.sandboxStartTime = performance.now();
  const t = Math.round((performance.now() - state.sandboxStartTime) * 10) / 10;
  state.sandboxEvents.push({ key: e.key.toLowerCase(), type: 'down', t });
  document.getElementById('sandbox-events-count').textContent = `${state.sandboxEvents.length} events captured`;
}

function handleSandboxKeyUp(e) {
  if (!state.sandboxStartTime) return;
  const t = Math.round((performance.now() - state.sandboxStartTime) * 10) / 10;
  state.sandboxEvents.push({ key: e.key.toLowerCase(), type: 'up', t });
  document.getElementById('sandbox-events-count').textContent = `${state.sandboxEvents.length} events captured`;
}

async function submitSandboxSample() {
  if (state.sandboxEvents.length < 15) {
    toast('Type at least 15 characters to evaluate rhythm timing.', 'warn');
    return;
  }

  try {
    const res = await api('/verify', {
      method: 'POST',
      body: JSON.stringify({
        user_id: 'student_demo',
        events: state.sandboxEvents,
      }),
    });

    document.getElementById('sandbox-result-card').style.display = 'block';
    document.getElementById('sb-decision').textContent = res.action.toUpperCase();
    document.getElementById('sb-decision').style.color = res.action === 'allow' ? 'var(--good)' : (res.action === 'step_up' ? 'var(--warn)' : 'var(--danger)');
    document.getElementById('sb-trust').textContent = res.trust_score ?? '--';
    document.getElementById('sb-risk').textContent = res.risk_level.toUpperCase();
    document.getElementById('sb-confidence').textContent = `${res.confidence || 0}%`;

    toast(`Evaluated sample: ${res.action.toUpperCase()}`);
  } catch (err) {
    toast(`Evaluation error: ${err.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Settings Tabs
// ---------------------------------------------------------------------------
function switchSettingsTab(tab, btn) {
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['general', 'members', 'security', 'plan'].forEach(t => {
    const el = document.getElementById(`settings-tab-${t}`);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
  });
}

async function loadSettings() {
  const ws = state.activeWorkspace;
  if (!ws) return;

  document.getElementById('settings-org-name').value = ws.name || '';
  document.getElementById('settings-org-slug').value = ws.id || '';
  document.getElementById('settings-allowed-origins').value = (ws.allowed_origins || ['*']).join(', ');

  document.getElementById('plan-tier-name').textContent = `${(ws.tier || 'growth').toUpperCase()} TIER`;
  const limits = {
    starter: { rpm: 120, keys: 3, ret: 30 },
    growth: { rpm: 600, keys: 10, ret: 90 },
    enterprise: { rpm: 3000, keys: 50, ret: 365 },
  }[ws.tier || 'growth'] || { rpm: 600, keys: 10, ret: 90 };

  document.getElementById('plan-rpm').textContent = limits.rpm;
  document.getElementById('plan-max-keys').textContent = limits.keys;
  document.getElementById('plan-retention').textContent = limits.ret;

  loadMembers();
}

async function saveGeneralSettings() {
  const name = document.getElementById('settings-org-name').value.trim();
  const origins = document.getElementById('settings-allowed-origins').value.split(',').map(s => s.trim()).filter(Boolean);

  try {
    await api(`/v1/workspaces/${state.activeWorkspaceId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, allowed_origins: origins }),
    });
    toast('Workspace settings updated.');
    initApp();
  } catch (err) {
    toast(`Update failed: ${err.message}`, 'error');
  }
}

async function loadMembers() {
  const tbody = document.getElementById('members-table-body');
  try {
    const res = await api(`/v1/workspaces/${state.activeWorkspaceId}/members`);
    const members = res.members || [];
    tbody.innerHTML = members.map(m => `
      <tr>
        <td><strong>${esc(m.name)}</strong></td>
        <td>${esc(m.email)}</td>
        <td><span class="badge badge-neutral">${esc(m.role.toUpperCase())}</span></td>
        <td>${new Date(m.joined_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch {}
}

async function handleInviteMemberSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('invite-email').value.trim();
  const role = document.getElementById('invite-role').value;

  try {
    await api(`/v1/workspaces/${state.activeWorkspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
    closeModal('modal-invite-member');
    toast(`Invited ${email} as ${role}.`);
    loadMembers();
  } catch (err) {
    toast(`Invitation failed: ${err.message}`, 'error');
  }
}

async function handlePasswordChange(e) {
  e.preventDefault();
  const oldPassword = document.getElementById('pw-old').value;
  const newPassword = document.getElementById('pw-new').value;

  try {
    await api('/v1/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    toast('Password changed successfully.');
    document.getElementById('pw-old').value = '';
    document.getElementById('pw-new').value = '';
  } catch (err) {
    toast(`Failed to update password: ${err.message}`, 'error');
  }
}

async function confirmDeleteWorkspace() {
  if (!confirm(`Are you sure you want to permanently delete workspace "${state.activeWorkspace.name}"? This cannot be undone.`)) {
    return;
  }
  try {
    await api(`/v1/workspaces/${state.activeWorkspaceId}`, { method: 'DELETE' });
    toast('Workspace deleted.');
    await initApp();
  } catch (err) {
    toast(`Delete failed: ${err.message}`, 'error');
  }
}

async function handleCreateWorkspaceModalSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('modal-ws-name').value.trim();
  const tier = document.getElementById('modal-ws-tier').value;

  try {
    await api('/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, tier }),
    });
    closeModal('modal-create-workspace');
    toast('New workspace created!');
    await initApp();
  } catch (err) {
    toast(`Failed: ${err.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Page: Platform Admin
// ---------------------------------------------------------------------------
async function loadAdmin() {
  if (state.user.role !== 'admin') return;

  try {
    const overview = await api('/v1/admin/overview');
    document.getElementById('admin-kpi-tenants').textContent = overview.total_organizations;
    document.getElementById('admin-kpi-users').textContent = overview.total_users;
    document.getElementById('admin-kpi-keys').textContent = overview.active_keys;
    document.getElementById('admin-kpi-cache').textContent = overview.cache?.hit_ratio || '100%';

    const orgsRes = await api('/v1/admin/organizations');
    const orgs = orgsRes.organizations || [];
    document.getElementById('admin-tenants-table-body').innerHTML = orgs.map(o => `
      <tr>
        <td><strong style="font-family:var(--mono)">${esc(o.id)}</strong></td>
        <td>${esc(o.name)}</td>
        <td><span class="badge badge-${o.tier || 'growth'}">${esc((o.tier || 'growth').toUpperCase())}</span></td>
        <td>${o.enrolled_users || 0}</td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="selectWorkspace('${esc(o.id)}')">Open Workspace &rarr;</button>
        </td>
      </tr>
    `).join('');

    const auditRes = await api('/v1/admin/audit-logs');
    const logs = auditRes.audit_logs || [];
    document.getElementById('admin-audit-table-body').innerHTML = logs.map(l => `
      <tr>
        <td style="font-family:var(--mono);font-size:11px">${new Date(l.timestamp).toLocaleString()}</td>
        <td><code>${esc(l.tenant_id)}</code></td>
        <td>${esc(l.actor)}</td>
        <td><span class="badge badge-neutral">${esc(l.action)}</span></td>
        <td style="font-size:12px;color:var(--text-secondary)">${esc(l.details)}</td>
      </tr>
    `).join('');
  } catch (err) {
    toast(`Admin data load error: ${err.message}`, 'error');
  }
}

// Boot application
window.addEventListener('DOMContentLoaded', initApp);
</script>
</body>
</html>
"""

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(HTML_CONTENT)

size = os.path.getsize(OUTPUT_FILE)
print(f"Generated {OUTPUT_FILE} successfully: {size:,} bytes")
