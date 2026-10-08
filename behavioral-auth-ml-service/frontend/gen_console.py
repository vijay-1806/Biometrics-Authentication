#!/usr/bin/env python3
"""Generates console.html — BioAuth BaaS Developer Console."""

html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BioAuth BaaS &mdash; Developer Console</title>
<meta name="description" content="Biometric Authentication as a Service Developer Console — Manage API keys, tenants, usage and SDK integration.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#07090f;--surface:#0d1117;--panel:rgba(21,28,42,0.9);--border:rgba(255,255,255,0.07);--border-hl:rgba(255,255,255,0.14);--primary:#3b82f6;--primary-d:#2563eb;--primary-g:rgba(59,130,246,0.18);--accent:#06b6d4;--accent-g:rgba(6,182,212,0.15);--purple:#8b5cf6;--purple-g:rgba(139,92,246,0.15);--good:#10b981;--good-g:rgba(16,185,129,0.15);--warn:#f59e0b;--warn-g:rgba(245,158,11,0.15);--danger:#ef4444;--danger-g:rgba(239,68,68,0.15);--text:#e2e8f0;--text-dim:#64748b;--text-muted:#334155;--sans:"Inter",system-ui,sans-serif;--mono:"JetBrains Mono",monospace;--sidebar-w:240px;--topbar-h:56px;--radius:10px;--radius-lg:14px;--transition:0.18s ease}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{height:100%}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;line-height:1.5;display:flex;flex-direction:column;min-height:100vh;overflow:hidden}
.topbar{height:var(--topbar-h);background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:20px;position:fixed;top:0;left:0;right:0;z-index:200}
.topbar-brand{display:flex;align-items:center;gap:10px;width:calc(var(--sidebar-w) - 20px);flex-shrink:0}
.brand-logo{width:32px;height:32px;background:linear-gradient(135deg,var(--primary),var(--purple));border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(59,130,246,.35)}
.brand-logo svg{width:18px;height:18px;fill:white}
.brand-name{font-size:15px;font-weight:700;letter-spacing:-.3px;color:#fff}
.brand-name span{color:var(--primary);font-family:var(--mono);font-size:11px;display:block}
.topbar-center{flex:1;display:flex;align-items:center;gap:14px}
.project-selector{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer;transition:var(--transition)}
.project-selector:hover{border-color:var(--border-hl);background:rgba(255,255,255,.07)}
.project-selector select{background:transparent;border:none;color:var(--text);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;outline:none;appearance:none}
.topbar-right{display:flex;align-items:center;gap:12px;margin-left:auto}
.health-pill{display:flex;align-items:center;gap:7px;font-size:12px;font-family:var(--mono);padding:5px 12px;border-radius:20px;background:var(--good-g);border:1px solid rgba(16,185,129,.25);color:var(--good);transition:var(--transition)}
.health-pill.offline{background:var(--danger-g);border-color:rgba(239,68,68,.25);color:var(--danger)}
.pulse-dot{width:7px;height:7px;border-radius:50%;background:var(--good);animation:pulse 2s ease-in-out infinite}
.health-pill.offline .pulse-dot{background:var(--danger);animation:none}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,.4)}50%{opacity:.7;box-shadow:0 0 0 5px rgba(16,185,129,0)}}
.topbar-icon-btn{width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:var(--transition);color:var(--text-dim)}
.topbar-icon-btn:hover{background:rgba(255,255,255,.08);color:var(--text);border-color:var(--border-hl)}
.topbar-icon-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2}
.avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--purple));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;cursor:pointer}
.app-shell{display:flex;height:100vh;padding-top:var(--topbar-h);overflow:hidden}
.sidebar{width:var(--sidebar-w);height:100%;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden;flex-shrink:0;padding:16px 0 32px}
.sidebar::-webkit-scrollbar{width:4px}
.sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
.sidebar-section-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);padding:14px 20px 6px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 16px;margin:1px 8px;border-radius:var(--radius);cursor:pointer;color:var(--text-dim);font-size:13.5px;font-weight:500;transition:var(--transition);user-select:none;text-decoration:none}
.nav-item:hover{background:rgba(255,255,255,.05);color:var(--text)}
.nav-item.active{background:var(--primary-g);color:var(--primary)}
.nav-icon{width:16px;height:16px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:2}
.nav-badge{margin-left:auto;font-size:10px;font-weight:700;font-family:var(--mono);background:var(--primary-g);color:var(--primary);padding:2px 7px;border-radius:10px;min-width:20px;text-align:center}
.sidebar-divider{height:1px;background:var(--border);margin:10px 16px}
.main-content{flex:1;overflow-y:auto;overflow-x:hidden;background:radial-gradient(at 20% 5%,rgba(59,130,246,.06) 0,transparent 45%),radial-gradient(at 80% 90%,rgba(139,92,246,.05) 0,transparent 45%),var(--bg)}
.main-content::-webkit-scrollbar{width:6px}
.main-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
.page{display:none;padding:32px;max-width:1100px;animation:fadeSlide .22s ease forwards}
.page.active{display:block}
@keyframes fadeSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.page-header{margin-bottom:28px}
.page-title{font-size:22px;font-weight:700;color:#fff;letter-spacing:-.4px}
.page-subtitle{font-size:13.5px;color:var(--text-dim);margin-top:4px}
.page-actions{display:flex;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap}
.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);backdrop-filter:blur(10px);transition:border-color var(--transition)}
.card:hover{border-color:var(--border-hl)}
.card-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 16px;border-bottom:1px solid var(--border)}
.card-title{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--text-dim);display:flex;align-items:center;gap:8px}
.card-title svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}
.card-body{padding:20px 22px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;display:flex;flex-direction:column;gap:10px;transition:var(--transition);position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--clr,var(--primary)),transparent)}
.stat-card:hover{border-color:var(--border-hl);transform:translateY(-1px)}
.stat-label{font-size:11.5px;text-transform:uppercase;letter-spacing:.7px;color:var(--text-dim);font-weight:600}
.stat-value{font-size:30px;font-weight:800;font-family:var(--mono);color:#fff;line-height:1}
.stat-sub{font-size:12px;color:var(--text-dim)}
.stat-icon{position:absolute;top:18px;right:18px;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--panel-icon-bg,var(--primary-g))}
.stat-icon svg{width:18px;height:18px;stroke:var(--panel-icon-clr,var(--primary));fill:none;stroke-width:2}
.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px;font-size:13.5px;font-weight:600;font-family:var(--sans);border:1px solid transparent;cursor:pointer;transition:all var(--transition);white-space:nowrap}
.btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;flex-shrink:0}
.btn-primary{background:var(--primary);color:#fff;border-color:var(--primary);box-shadow:0 4px 14px rgba(59,130,246,.3)}
.btn-primary:hover{background:var(--primary-d);box-shadow:0 6px 20px rgba(59,130,246,.4);transform:translateY(-1px)}
.btn-ghost{background:rgba(255,255,255,.05);color:var(--text);border-color:var(--border)}
.btn-ghost:hover{background:rgba(255,255,255,.1);border-color:var(--border-hl)}
.btn-danger{background:transparent;color:var(--danger);border-color:rgba(239,68,68,.3)}
.btn-danger:hover{background:var(--danger-g);border-color:var(--danger)}
.btn-sm{padding:6px 13px;font-size:12px}.btn-xs{padding:4px 10px;font-size:11px;border-radius:6px}
.key-list{display:flex;flex-direction:column;gap:1px}
.key-row{display:flex;align-items:center;gap:12px;padding:14px 22px;border-bottom:1px solid var(--border);transition:background var(--transition)}
.key-row:last-child{border-bottom:none}
.key-row:hover{background:rgba(255,255,255,.02)}
.key-type-badge{font-size:10px;font-weight:700;font-family:var(--mono);padding:3px 8px;border-radius:5px;text-transform:uppercase;letter-spacing:.5px;flex-shrink:0}
.key-type-badge.live{background:var(--good-g);color:var(--good);border:1px solid rgba(16,185,129,.25)}
.key-type-badge.test{background:var(--warn-g);color:var(--warn);border:1px solid rgba(245,158,11,.25)}
.key-type-badge.revoked{background:rgba(100,116,139,.15);color:var(--text-dim);border:1px solid var(--border)}
.key-info{flex:1;min-width:0}
.key-name{font-size:13.5px;font-weight:600;color:var(--text)}
.key-meta{font-size:11.5px;color:var(--text-dim);margin-top:2px;font-family:var(--mono)}
.key-value-wrapper{display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:7px;padding:7px 12px;font-family:var(--mono);font-size:12.5px;min-width:260px;max-width:340px;flex-shrink:0}
.key-value-text{flex:1;color:var(--text-dim);letter-spacing:.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.key-eye-btn,.key-copy-btn{background:none;border:none;cursor:pointer;padding:2px;color:var(--text-muted);transition:color var(--transition);flex-shrink:0}
.key-eye-btn:hover{color:var(--accent)}.key-copy-btn:hover{color:var(--good)}
.key-eye-btn svg,.key-copy-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2}
.key-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.show-once-banner{display:flex;align-items:flex-start;gap:14px;padding:16px 20px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:var(--radius);margin-bottom:20px}
.show-once-banner .icon{color:var(--warn);flex-shrink:0}
.show-once-banner .icon svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
.show-once-banner .text p:first-child{font-weight:600;color:var(--warn);font-size:13.5px}
.show-once-banner .text p:last-child{font-size:12.5px;color:var(--text-dim);margin-top:2px}
.key-reveal-box{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.4);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-top:12px;font-family:var(--mono);font-size:13px;word-break:break-all}
.key-reveal-box .key-text{flex:1;color:var(--text)}
.scope-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.scope-tag{font-size:10px;font-family:var(--mono);font-weight:600;padding:2px 8px;border-radius:4px;text-transform:uppercase;background:var(--primary-g);color:var(--primary);border:1px solid rgba(59,130,246,.2)}
.code-block{background:rgba(0,0,0,.5);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;margin:12px 0;font-family:var(--mono);font-size:12.5px;line-height:1.8;overflow-x:auto;position:relative}
.code-block pre{margin:0;white-space:pre;color:#c9d1d9}
.cm{color:#6e7681}.kw{color:#ff7b72}.st{color:#a5d6ff}.fn{color:#d2a8ff}.nu{color:#79c0ff}.ob{color:#ffa657}
.code-copy-btn{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.07);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--text-dim);font-family:var(--sans);font-weight:600;display:flex;align-items:center;gap:5px;transition:var(--transition)}
.code-copy-btn:hover{background:rgba(255,255,255,.12);color:var(--text)}
.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;font-family:var(--mono);text-transform:uppercase;letter-spacing:.5px}
.badge.active,.badge.online{background:var(--good-g);color:var(--good);border:1px solid rgba(16,185,129,.25)}
.badge.inactive{background:rgba(100,116,139,.15);color:var(--text-dim);border:1px solid var(--border)}
.badge.starter{background:rgba(6,182,212,.12);color:var(--accent);border:1px solid rgba(6,182,212,.25)}
.badge.growth{background:var(--purple-g);color:var(--purple);border:1px solid rgba(139,92,246,.25)}
.badge.enterprise{background:var(--warn-g);color:var(--warn);border:1px solid rgba(245,158,11,.25)}
.form-group{margin-bottom:18px}
.form-label{display:block;font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:7px}
.form-sublabel{font-size:11.5px;color:var(--text-dim);margin-top:-4px;margin-bottom:7px}
.form-input,.form-select{width:100%;background:rgba(0,0,0,.35);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-family:var(--sans);font-size:13.5px;outline:none;transition:border-color var(--transition);appearance:none}
.form-input:focus,.form-select:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-g)}
.form-input::placeholder{color:var(--text-muted)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.checkbox-group{display:flex;flex-wrap:wrap;gap:8px}
.checkbox-item{display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:7px;border:1px solid var(--border);cursor:pointer;transition:var(--transition)}
.checkbox-item:hover{border-color:var(--primary);background:var(--primary-g)}
.checkbox-item input{accent-color:var(--primary)}
.checkbox-item span{font-size:12px;font-family:var(--mono);font-weight:600}
.modal-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;padding:20px}
.modal-overlay.open{display:flex}
.modal{background:var(--surface);border:1px solid var(--border-hl);border-radius:var(--radius-lg);padding:28px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;animation:modalIn .18s ease}
@keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1)}}
.modal-title{font-size:17px;font-weight:700;color:#fff;margin-bottom:6px}
.modal-subtitle{font-size:13px;color:var(--text-dim);margin-bottom:22px}
.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}
#toast-root{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none}
.toast{background:var(--surface);border:1px solid var(--border-hl);border-radius:10px;padding:12px 18px;font-size:13px;color:var(--text);display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,.4);animation:toastIn .22s ease;pointer-events:all}
.toast.success{border-left:3px solid var(--good)}.toast.error{border-left:3px solid var(--danger)}.toast.warn{border-left:3px solid var(--warn)}
@keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
.usage-bar-wrap{height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;margin-top:6px}
.usage-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--primary),var(--accent));transition:width .5s ease}
.qs-steps{display:flex;flex-direction:column}
.qs-step{display:flex;gap:18px;padding:22px 0;border-bottom:1px solid var(--border)}
.qs-step:last-child{border-bottom:none}
.qs-step-num{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:var(--primary-g);border:1px solid rgba(59,130,246,.3);color:var(--primary);font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.qs-step-content h3{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px}
.qs-step-content p{font-size:13px;color:var(--text-dim);line-height:1.6}
.tab-strip{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px}
.tab-strip-btn{padding:10px 16px;font-size:13px;font-weight:600;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-dim);cursor:pointer;transition:var(--transition);font-family:var(--sans);margin-bottom:-1px}
.tab-strip-btn:hover{color:var(--text)}.tab-strip-btn.active{color:var(--primary);border-bottom-color:var(--primary)}
.tab-pane{display:none}.tab-pane.active{display:block}
.empty-state{padding:48px 32px;text-align:center;color:var(--text-dim)}
.empty-state svg{width:40px;height:40px;stroke:var(--text-muted);fill:none;stroke-width:1.5;margin:0 auto 12px;display:block}
.empty-state p{font-size:13.5px}
.tenant-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.tenant-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;transition:var(--transition);cursor:pointer;display:flex;flex-direction:column;gap:12px}
.tenant-card:hover{border-color:var(--border-hl);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.25)}
.tenant-card-name{font-size:15px;font-weight:700;color:#fff}
.tenant-card-id{font-size:11px;font-family:var(--mono);color:var(--text-dim);margin-top:2px}
.tenant-card-meta{display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--text-dim)}
.tenant-meta-row{display:flex;justify-content:space-between;align-items:center}
@media(max-width:900px){:root{--sidebar-w:200px}.key-value-wrapper{min-width:200px}}
@media(max-width:700px){.sidebar{display:none}.page{padding:20px 16px}.form-row{grid-template-columns:1fr}.stat-grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-brand">
    <div class="brand-logo"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-4z"/></svg></div>
    <div class="brand-name">BioAuth <span>// BaaS Console v2.1</span></div>
  </div>
  <div class="topbar-center">
    <div class="project-selector">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      <select id="project-select">
        <option value="default">LMS Production Platform</option>
        <option value="demo">Public Sandbox</option>
      </select>
    </div>
  </div>
  <div class="topbar-right">
    <div class="health-pill" id="health-pill"><div class="pulse-dot"></div><span id="health-text">Connecting...</span></div>
    <button class="topbar-icon-btn" title="API Docs" onclick="window.open('http://localhost:8000/docs','_blank')">
      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    </button>
    <div class="avatar">A</div>
  </div>
</header>
<div class="app-shell">
  <nav class="sidebar">
    <span class="sidebar-section-label">Project</span>
    <a class="nav-item active" data-page="dashboard" href="#">
      <svg class="nav-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Dashboard
    </a>
    <a class="nav-item" data-page="api-keys" href="#">
      <svg class="nav-icon" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>API Keys
      <span class="nav-badge" id="keys-count-badge">0</span>
    </a>
    <a class="nav-item" data-page="quickstart" href="#">
      <svg class="nav-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Quickstart
    </a>
    <div class="sidebar-divider"></div>
    <span class="sidebar-section-label">Management</span>
    <a class="nav-item" data-page="tenants" href="#">
      <svg class="nav-icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Tenants
    </a>
    <a class="nav-item" data-page="usage" href="#">
      <svg class="nav-icon" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Usage &amp; Telemetry
    </a>
    <a class="nav-item" data-page="webhooks" href="#">
      <svg class="nav-icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Webhooks
    </a>
    <div class="sidebar-divider"></div>
    <span class="sidebar-section-label">Developer Tools</span>
    <a class="nav-item" href="http://localhost:8000/docs" target="_blank">
      <svg class="nav-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>API Reference
    </a>
    <a class="nav-item" href="http://localhost:8000/demo" target="_blank">
      <svg class="nav-icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>SDK Demo
    </a>
    <a class="nav-item" href="index.html" target="_blank">
      <svg class="nav-icon" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>ML Diagnostics
    </a>
  </nav>
  <main class="main-content">
    <!-- DASHBOARD -->
    <section class="page active" id="page-dashboard">
      <div class="page-header">
        <h1 class="page-title">Project Dashboard</h1>
        <p class="page-subtitle">Real-time overview of your BioAuth service — API activity, health, and enrolled users.</p>
      </div>
      <div class="stat-grid">
        <div class="stat-card" style="--clr:var(--primary)">
          <div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778"/></svg></div>
          <div class="stat-label">API Keys</div><div class="stat-value" id="dash-key-count">--</div><div class="stat-sub">Active in this project</div>
        </div>
        <div class="stat-card" style="--clr:var(--good)">
          <div class="stat-icon" style="--panel-icon-bg:var(--good-g);--panel-icon-clr:var(--good)"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div class="stat-label">Enrolled Users</div><div class="stat-value" id="dash-user-count">--</div><div class="stat-sub">Behavioral profiles</div>
        </div>
        <div class="stat-card" style="--clr:var(--accent)">
          <div class="stat-icon" style="--panel-icon-bg:var(--accent-g);--panel-icon-clr:var(--accent)"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
          <div class="stat-label">Verifications</div><div class="stat-value" id="dash-verify-count">--</div><div class="stat-sub">Total /verify calls</div>
        </div>
        <div class="stat-card" style="--clr:var(--warn)">
          <div class="stat-icon" style="--panel-icon-bg:var(--warn-g);--panel-icon-clr:var(--warn)"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="stat-label">Anomalies</div><div class="stat-value" id="dash-anomaly-count">--</div><div class="stat-sub">Risk events flagged</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><span class="card-title"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Service Health</span><button class="btn btn-ghost btn-sm" id="refresh-health-btn">Refresh</button></div>
          <div class="card-body" id="health-panel"><p style="color:var(--text-dim);font-size:13px">Connecting...</p></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Quick Actions</span></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-primary" onclick="openModal('modal-create-key')"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Generate New API Key</button>
            <button class="btn btn-ghost" onclick="navigateTo('quickstart')"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>SDK Quickstart</button>
            <button class="btn btn-ghost" onclick="navigateTo('tenants')"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Manage Tenants</button>
            <button class="btn btn-ghost" onclick="window.open('http://localhost:8000/docs','_blank')"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16"/><polyline points="14 2 14 8 20 8"/></svg>API Reference</button>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span class="card-title"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778"/></svg>Recent API Keys</span><button class="btn btn-ghost btn-sm" onclick="navigateTo('api-keys')">View All &rarr;</button></div>
        <div id="dash-keys-preview"><div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778"/></svg><p>Loading keys...</p></div></div>
      </div>
    </section>
    <!-- API KEYS PAGE -->
    <section class="page" id="page-api-keys">
      <div class="page-header">
        <h1 class="page-title">API Keys</h1>
        <p class="page-subtitle">Manage your 192-bit cryptographic hex API keys. Keys are <strong style="color:var(--warn)">masked permanently after creation</strong> &mdash; copy them immediately.</p>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openModal('modal-create-key')"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Generate New Key</button>
          <button class="btn btn-ghost" onclick="loadKeys()"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Refresh</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778"/></svg>Active Keys &mdash; <span id="keys-project-name" style="color:var(--text-dim);font-weight:400;font-family:var(--mono)">...</span></span>
          <span style="font-size:11.5px;color:var(--text-dim);font-family:var(--mono)" id="keys-tier-badge"></span>
        </div>
        <div id="keys-list-container"><div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778"/></svg><p>Loading...</p></div></div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span class="card-title"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Security Guidelines</span></div>
        <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <p style="font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:8px">&#10003; Key Security Best Practices</p>
            <ul style="font-size:12px;color:var(--text-dim);line-height:2;list-style:none">
              <li>Never embed live keys in frontend source code</li>
              <li>Use environment variables or secret managers</li>
              <li>Rotate keys on a schedule or after team changes</li>
              <li>Use test keys for development and CI/CD pipelines</li>
              <li>Restrict keys to specific origins in production</li>
            </ul>
          </div>
          <div>
            <p style="font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:8px">&#9889; Available Scopes</p>
            <ul style="font-size:12px;color:var(--text-dim);line-height:2;list-style:none">
              <li><code style="color:var(--accent)">verify</code> &mdash; POST /verify endpoint access</li>
              <li><code style="color:var(--accent)">enroll</code> &mdash; POST /enroll endpoint access</li>
              <li><code style="color:var(--accent)">retrain</code> &mdash; Adaptive model retraining</li>
              <li><code style="color:var(--accent)">admin</code> &mdash; Tenant management endpoints</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
    <!-- QUICKSTART -->
    <section class="page" id="page-quickstart">
      <div class="page-header">
        <h1 class="page-title">SDK Quickstart</h1>
        <p class="page-subtitle">Integrate keystroke behavioral biometrics into your app in under 5 minutes.</p>
      </div>
      <div class="tab-strip">
        <button class="tab-strip-btn active" data-qs-tab="js">JavaScript / Browser SDK</button>
        <button class="tab-strip-btn" data-qs-tab="api">REST API</button>
        <button class="tab-strip-btn" data-qs-tab="lms">LMS Integration</button>
      </div>
      <div class="tab-pane active" id="qs-tab-js">
        <div class="qs-steps">
          <div class="qs-step"><div class="qs-step-num">1</div><div class="qs-step-content">
            <h3>Add the SDK Script Tag</h3>
            <p>Include the auto-injecting BioAuth SDK in your page. No bundler required.</p>
            <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre><span class="cm">&lt;!-- Add before &lt;/body&gt; --&gt;</span>
<span class="kw">&lt;script</span> <span class="ob">src</span>=<span class="st">"http://localhost:8000/sdk.js"</span><span class="kw">&gt;&lt;/script&gt;</span></pre></div>
          </div></div>
          <div class="qs-step"><div class="qs-step-num">2</div><div class="qs-step-content">
            <h3>Initialize with Your API Key</h3>
            <p>Your key is used only at init time &mdash; it is never re-exposed in subsequent SDK API calls.</p>
            <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre><span class="kw">const</span> <span class="ob">bioAuth</span> = <span class="kw">new</span> <span class="fn">BioAuth</span>({
  <span class="ob">apiKey</span>: <span class="st">"bio_live_YOUR_HEX_KEY"</span>,  <span class="cm">// from API Keys tab</span>
  <span class="ob">userId</span>: <span class="st">"student_alice"</span>,
  <span class="ob">mode</span>:   <span class="st">"verify"</span>,               <span class="cm">// "enroll" | "verify"</span>
  <span class="ob">baseUrl</span>:<span class="st">"http://localhost:8000"</span>
});</pre></div>
          </div></div>
          <div class="qs-step"><div class="qs-step-num">3</div><div class="qs-step-content">
            <h3>Listen for Risk Events</h3>
            <p>The SDK fires events on each verification decision. Use them to lock sessions or trigger step-up auth.</p>
            <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre><span class="ob">bioAuth</span>.<span class="fn">on</span>(<span class="st">"verified"</span>, ({ action, trustScore }) =&gt; {
  <span class="kw">if</span> (action === <span class="st">"deny"</span>)    <span class="ob">exam</span>.<span class="fn">lockSession</span>();
  <span class="kw">if</span> (action === <span class="st">"step_up"</span>) <span class="ob">exam</span>.<span class="fn">requestStepUp</span>();
});
<span class="ob">bioAuth</span>.<span class="fn">on</span>(<span class="st">"error"</span>, err =&gt; <span class="ob">console</span>.<span class="fn">error</span>(err));</pre></div>
          </div></div>
          <div class="qs-step"><div class="qs-step-num">4</div><div class="qs-step-content">
            <h3>Attach to Monitored Inputs</h3>
            <p>Only timing intervals are transmitted &mdash; no raw keystrokes leave the browser.</p>
            <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre><span class="cm">// Attach to specific textarea</span>
<span class="ob">bioAuth</span>.<span class="fn">attach</span>(<span class="ob">document</span>.<span class="fn">getElementById</span>(<span class="st">"exam-input"</span>));
<span class="cm">// Or entire page:</span>
<span class="ob">bioAuth</span>.<span class="fn">attach</span>(<span class="ob">document</span>);</pre></div>
          </div></div>
        </div>
      </div>
      <div class="tab-pane" id="qs-tab-api">
        <div class="qs-steps">
          <div class="qs-step"><div class="qs-step-num">1</div><div class="qs-step-content">
            <h3>Authenticate Every Request</h3>
            <p>Pass your key as the <code style="color:var(--accent)">X-API-Key</code> header. Never as a query parameter in production.</p>
            <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre><span class="kw">curl</span> -X POST http://localhost:8000/verify \\
  -H <span class="st">"X-API-Key: bio_live_YOUR_KEY"</span> \\
  -H <span class="st">"Content-Type: application/json"</span> \\
  -d <span class="st">'{"user_id":"alice","events":[...]}'</span></pre></div>
          </div></div>
          <div class="qs-step"><div class="qs-step-num">2</div><div class="qs-step-content">
            <h3>Interpret the Response</h3>
            <p>Enforce the <code style="color:var(--accent)">action</code> field server-side &mdash; never trust client-side enforcement alone.</p>
            <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre>{
  <span class="st">"trust_score"</span>: <span class="nu">82</span>,
  <span class="st">"risk"</span>:        <span class="st">"low"</span>,
  <span class="st">"action"</span>:      <span class="st">"allow"</span>,   <span class="cm">// allow | step_up | deny</span>
  <span class="st">"confidence"</span>:  <span class="nu">91.4</span>,
  <span class="st">"model_state"</span>: <span class="st">"full"</span>
}</pre></div>
          </div></div>
        </div>
      </div>
      <div class="tab-pane" id="qs-tab-lms">
        <div class="qs-steps">
          <div class="qs-step"><div class="qs-step-num">1</div><div class="qs-step-content">
            <h3>Store the Key Securely</h3>
            <p>The LMS backend makes server-to-server calls. Store the key in environment variables, never in source code.</p>
            <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre><span class="cm"># .env (never commit)</span>
<span class="ob">BIOAUTH_API_KEY</span>=<span class="st">bio_live_YOUR_HEX_KEY</span>
<span class="ob">BIOAUTH_URL</span>=<span class="st">http://localhost:8000</span></pre></div>
            <div class="code-block"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre><span class="cm">// behaviorController.js (Node.js backend)</span>
<span class="kw">async function</span> <span class="fn">verifyStudent</span>(userId, events) {
  <span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(`${process.env.BIOAUTH_URL}/verify`, {
    method: <span class="st">"POST"</span>,
    headers: {
      <span class="st">"X-API-Key"</span>: process.env.BIOAUTH_API_KEY,
      <span class="st">"Content-Type"</span>: <span class="st">"application/json"</span>
    },
    body: <span class="ob">JSON</span>.<span class="fn">stringify</span>({ user_id: userId, events })
  });
  <span class="kw">return</span> res.<span class="fn">json</span>(); <span class="cm">// { action, trust_score, risk }</span>
}</pre></div>
          </div></div>
        </div>
      </div>
    </section>
    <!-- TENANTS -->
    <section class="page" id="page-tenants">
      <div class="page-header">
        <h1 class="page-title">Tenants</h1>
        <p class="page-subtitle">Each tenant is an isolated workspace with its own API keys, user data, and rate limits.</p>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openModal('modal-create-tenant')"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Tenant</button>
          <button class="btn btn-ghost" onclick="loadTenants()"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Refresh</button>
        </div>
      </div>
      <div class="tenant-grid" id="tenants-grid">
        <div class="card" style="grid-column:1/-1"><div class="empty-state"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5"/></svg><p>Loading tenants...</p></div></div>
      </div>
    </section>
    <!-- USAGE -->
    <section class="page" id="page-usage">
      <div class="page-header"><h1 class="page-title">Usage &amp; Telemetry</h1><p class="page-subtitle">Monitor API call volume, enrolled users, and anomaly rates.</p></div>
      <div id="usage-content"><div class="card"><div class="empty-state"><svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/></svg><p>Loading...</p></div></div></div>
    </section>
    <!-- WEBHOOKS -->
    <section class="page" id="page-webhooks">
      <div class="page-header"><h1 class="page-title">Webhooks</h1><p class="page-subtitle">Receive HMAC-SHA256 signed event notifications on risk events.</p></div>
      <div class="card">
        <div class="card-header"><span class="card-title"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/></svg>Test Webhook Delivery</span></div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-dim);margin-bottom:16px;line-height:1.7">Each webhook is signed with HMAC-SHA256. Verify the <code style="color:var(--accent)">X-BioAuth-Signature</code> header in your endpoint.</p>
          <div class="form-group"><label class="form-label">Webhook URL</label><input class="form-input" id="webhook-url-input" placeholder="https://your-lms.com/webhooks/bioauth"></div>
          <div class="form-group"><label class="form-label">Event Type</label>
            <select class="form-select" id="webhook-event-type">
              <option value="biometric.test">biometric.test</option>
              <option value="biometric.deny">biometric.deny</option>
              <option value="biometric.step_up">biometric.step_up</option>
            </select>
          </div>
          <button class="btn btn-primary" id="test-webhook-btn"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>Send Test Webhook</button>
          <div class="code-block" style="margin-top:20px"><button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
<pre><span class="cm">// Verify HMAC in your endpoint (Node.js)</span>
<span class="kw">const</span> <span class="ob">crypto</span> = <span class="fn">require</span>(<span class="st">'crypto'</span>);
<span class="kw">function</span> <span class="fn">verifyWebhook</span>(rawBody, signature, secret) {
  <span class="kw">const</span> expected = <span class="ob">crypto</span>.<span class="fn">createHmac</span>(<span class="st">'sha256'</span>, secret)
    .<span class="fn">update</span>(rawBody).<span class="fn">digest</span>(<span class="st">'hex'</span>);
  <span class="kw">return</span> <span class="ob">crypto</span>.<span class="fn">timingSafeEqual</span>(
    <span class="ob">Buffer</span>.<span class="fn">from</span>(expected), <span class="ob">Buffer</span>.<span class="fn">from</span>(signature)
  );
}</pre></div>
        </div>
      </div>
    </section>
  </main>
</div>
<!-- MODALS -->
<div class="modal-overlay" id="modal-create-key">
  <div class="modal">
    <h2 class="modal-title">Generate New API Key</h2>
    <p class="modal-subtitle">A 192-bit cryptographic hex key will be created. <strong style="color:var(--warn)">Copy it immediately</strong> &mdash; it will be masked permanently after this dialog closes.</p>
    <div id="new-key-form-area">
      <div class="form-group"><label class="form-label">Key Name</label><input class="form-input" id="new-key-name" value="Production API Key"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="new-key-type"><option value="live">Live (Production)</option><option value="test">Test (Dev)</option></select></div>
        <div class="form-group"><label class="form-label">Tenant</label><select class="form-select" id="new-key-tenant"></select></div>
      </div>
      <div class="form-group">
        <label class="form-label">Scopes</label>
        <div class="checkbox-group">
          <label class="checkbox-item"><input type="checkbox" value="verify" checked><span>verify</span></label>
          <label class="checkbox-item"><input type="checkbox" value="enroll" checked><span>enroll</span></label>
          <label class="checkbox-item"><input type="checkbox" value="retrain" checked><span>retrain</span></label>
          <label class="checkbox-item"><input type="checkbox" value="admin"><span>admin</span></label>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Allowed Origins</label><input class="form-input" id="new-key-origins" value="*"><p class="form-sublabel" style="margin-top:5px">Comma-separated. Use * for any origin (not recommended for production).</p></div>
    </div>
    <div id="new-key-result-area" style="display:none">
      <div class="show-once-banner">
        <div class="icon"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div class="text"><p>This is the ONLY time your full API key will be shown.</p><p>Copy it now and store it in a password manager or secret vault. It cannot be recovered.</p></div>
      </div>
      <div class="key-reveal-box"><span class="key-text" id="modal-new-key-value">--</span><button class="btn btn-ghost btn-sm" onclick="copyNewKey()">&#128203; Copy Key</button></div>
      <p style="font-size:12px;color:var(--text-dim);margin-top:10px">Key ID: <code style="color:var(--accent)" id="modal-new-key-id">--</code></p>
    </div>
    <div class="modal-actions" id="modal-key-actions">
      <button class="btn btn-ghost" onclick="closeModal('modal-create-key')">Cancel</button>
      <button class="btn btn-primary" id="generate-key-btn" onclick="generateKey()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Generate Key</button>
    </div>
  </div>
</div>
<div class="modal-overlay" id="modal-create-tenant">
  <div class="modal">
    <h2 class="modal-title">Create New Tenant</h2>
    <p class="modal-subtitle">An isolated workspace with its own keys and user data. An initial API key is auto-generated.</p>
    <div class="form-group"><label class="form-label">Tenant ID</label><input class="form-input" id="tenant-id-input" placeholder="e.g. acme_university" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'')"><p class="form-sublabel" style="margin-top:5px">Lowercase, numbers, underscores only</p></div>
    <div class="form-group"><label class="form-label">Organization Name</label><input class="form-input" id="tenant-name-input" placeholder="e.g. ACME University LMS"></div>
    <div class="form-group"><label class="form-label">Plan Tier</label>
      <select class="form-select" id="tenant-tier-select">
        <option value="starter">Starter &mdash; 120 RPM, 3 keys, 30d retention</option>
        <option value="growth" selected>Growth &mdash; 600 RPM, 10 keys, 90d retention</option>
        <option value="enterprise">Enterprise &mdash; 3000 RPM, 50 keys, 365d retention</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Webhook URL (optional)</label><input class="form-input" id="tenant-webhook-input" placeholder="https://your-lms.com/webhooks/bioauth"></div>
    <div id="new-tenant-result" style="display:none"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal('modal-create-tenant')">Cancel</button>
      <button class="btn btn-primary" id="create-tenant-btn" onclick="createTenant()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Create Tenant</button>
    </div>
  </div>
</div>
<div class="modal-overlay" id="modal-revoke-confirm">
  <div class="modal" style="max-width:400px">
    <h2 class="modal-title" style="color:var(--danger)">Revoke API Key?</h2>
    <p class="modal-subtitle">This action is irreversible. All clients using this key will immediately lose access.</p>
    <p style="font-size:13px;color:var(--text-dim)">Key: <code style="color:var(--text)" id="revoke-key-name-display">--</code></p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal('modal-revoke-confirm')">Cancel</button>
      <button class="btn btn-danger" id="confirm-revoke-btn">Revoke Key</button>
    </div>
  </div>
</div>
<div id="toast-root"></div>
<script>
const API = (window.location.protocol.startsWith('http')) ? window.location.origin : 'http://localhost:8000';
let currentTenantId='default',allTenantOptions=[],pendingRevokeKeyId=null,pendingRevokeTenantId=null;

function navigateTo(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.remove('active'));
  const el=document.getElementById('page-'+page);if(el)el.classList.add('active');
  const nav=document.querySelector(`.nav-item[data-page="${page}"]`);if(nav)nav.classList.add('active');
  loadPageData(page);
}
document.querySelectorAll('.nav-item[data-page]').forEach(el=>{el.addEventListener('click',e=>{e.preventDefault();navigateTo(el.dataset.page);});});
function loadPageData(p){if(p==='dashboard')loadDashboard();else if(p==='api-keys')loadKeys();else if(p==='tenants')loadTenants();else if(p==='usage')loadUsage();}
document.getElementById('project-select').addEventListener('change',function(){currentTenantId=this.value;loadPageData(document.querySelector('.page.active')?.id?.replace('page-','')||'dashboard');});
document.querySelectorAll('.tab-strip-btn[data-qs-tab]').forEach(btn=>{btn.addEventListener('click',()=>{const t=btn.dataset.qsTab;document.querySelectorAll('.tab-strip-btn[data-qs-tab]').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active',p.id==='qs-tab-'+t));});});

function openModal(id){const m=document.getElementById(id);if(!m)return;m.classList.add('open');if(id==='modal-create-key')resetKeyModal();}
function closeModal(id){const m=document.getElementById(id);if(m)m.classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');});});

function resetKeyModal(){
  document.getElementById('new-key-form-area').style.display='';
  document.getElementById('new-key-result-area').style.display='none';
  document.getElementById('modal-key-actions').innerHTML=`
    <button class="btn btn-ghost" onclick="closeModal('modal-create-key')">Cancel</button>
    <button class="btn btn-primary" id="generate-key-btn" onclick="generateKey()">
      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Generate Key
    </button>`;
  const sel=document.getElementById('new-key-tenant');
  sel.innerHTML=allTenantOptions.map(t=>`<option value="${esc(t.id)}"${t.id===currentTenantId?' selected':''}>${esc(t.name||t.id)}</option>`).join('');
}

async function apiFetch(path,opts={}){
  const res=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  if(!res.ok){const e=await res.json().catch(()=>({detail:res.statusText}));throw new Error(e.detail||`HTTP ${res.status}`);}
  return res.json();
}

async function checkHealth(){
  const pill=document.getElementById('health-pill'),txt=document.getElementById('health-text');
  try{
    const d=await apiFetch('/v1/system/health');
    pill.className='health-pill';txt.textContent=`v${d.version} \u00b7 Online`;
    renderHealthPanel(d);
  }catch{pill.className='health-pill offline';txt.textContent='Service Offline';
    const p=document.getElementById('health-panel');
    if(p)p.innerHTML='<p style="color:var(--danger);font-size:13px">\u26a0 Service offline. Run: <code>uvicorn main:app --reload --port 8000</code></p>';
  }
}
function renderHealthPanel(d){
  const p=document.getElementById('health-panel');if(!p)return;
  const f=d.features||{},c=d.cache||{};
  p.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px">
  <div><div style="color:var(--text-dim);margin-bottom:8px;font-weight:600;font-size:11px;text-transform:uppercase">Features</div>
    ${Object.entries(f).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-dim)">${k.replace(/_/g,' ')}</span><span style="color:${v?'var(--good)':'var(--danger)'}">${v?'enabled':'off'}</span></div>`).join('')}
  </div>
  <div><div style="color:var(--text-dim);margin-bottom:8px;font-weight:600;font-size:11px;text-transform:uppercase">In-Memory Cache</div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-dim)">Models Cached</span><span style="color:var(--accent);font-family:var(--mono)">${c.size??0}</span></div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-dim)">Hit Rate</span><span style="color:var(--good);font-family:var(--mono)">${c.hit_ratio??'--'}</span></div>
    <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:var(--text-dim)">Total Tenants</span><span style="color:var(--text);font-family:var(--mono)">${d.total_tenants??0}</span></div>
  </div></div>`;
}

async function loadDashboard(){
  checkHealth();
  try{
    const d=await apiFetch(`/v1/tenants/${currentTenantId}`);
    document.getElementById('dash-key-count').textContent=d.active_keys_count??'--';
    document.getElementById('dash-user-count').textContent=d.enrolled_users_count??'--';
    document.getElementById('dash-verify-count').textContent=d.metrics?.total_verifications??'--';
    document.getElementById('dash-anomaly-count').textContent=d.metrics?.anomalies_flagged??'--';
    renderKeyRows((d.keys||[]).slice(0,3),'dash-keys-preview',true);
  }catch(e){toast('Dashboard error: '+e.message,'error');}
}

async function loadKeys(){
  try{
    const d=await apiFetch(`/v1/tenants/${currentTenantId}`);
    const t=d.tenant||{},keys=d.keys||[];
    const pn=document.getElementById('keys-project-name');if(pn)pn.textContent=t.name||currentTenantId;
    const tb=document.getElementById('keys-tier-badge');if(tb)tb.textContent=`${(t.tier||'').toUpperCase()} \u00b7 ${keys.filter(k=>k.active).length}/${keys.length} active`;
    const cb=document.getElementById('keys-count-badge');if(cb)cb.textContent=keys.filter(k=>k.active).length;
    renderKeyRows(keys,'keys-list-container',false);
  }catch(e){toast('Keys error: '+e.message,'error');}
}

function renderKeyRows(keys,cid,compact){
  const c=document.getElementById(cid);if(!c)return;
  if(!keys||!keys.length){c.innerHTML='<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778"/></svg><p>No API keys found. Generate your first key to get started.</p></div>';return;}
  c.innerHTML=`<div class="key-list">${keys.map(k=>renderKeyRow(k,compact)).join('')}</div>`;
}

function renderKeyRow(k,compact){
  const masked=k.masked_key||k.key||'\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf';
  const active=k.active!==false;
  const tc=active?(k.type||'live'):'revoked',tl=active?(k.type||'live').toUpperCase():'REVOKED';
  const scopes=(k.scopes||[]).map(s=>`<span class="scope-tag">${esc(s)}</span>`).join('');
  const lu=k.last_used_at?new Date(k.last_used_at).toLocaleDateString():'Never';
  return `<div class="key-row">
    <span class="key-type-badge ${tc}">${tl}</span>
    <div class="key-info">
      <div class="key-name">${esc(k.name||'API Key')}</div>
      <div class="key-meta">ID: ${esc(k.key_id||'--')} &nbsp;\u00b7&nbsp; Last used: ${lu}</div>
      ${compact?'':`<div class="scope-tags" style="margin-top:5px">${scopes}</div>`}
    </div>
    <div class="key-value-wrapper">
      <span class="key-value-text">${masked}</span>
      ${active?`
      <button class="key-eye-btn" title="Security notice" onclick="revealKey()"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
      <button class="key-copy-btn" title="Copy masked key" onclick="copyText('${masked}','Masked key copied')"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>`:''}
    </div>
    ${active&&!compact?`<div class="key-actions"><button class="btn btn-danger btn-xs" onclick="confirmRevoke('${esc(k.key_id)}','${esc(k.name||'this key')}','${currentTenantId}')">Revoke</button></div>`:''}
  </div>`;
}
function revealKey(){toast('\u26a0 Raw keys are masked server-side after creation. Copy new keys immediately upon generation in the "Generate New Key" dialog.','warn');}

async function generateKey(){
  const name=document.getElementById('new-key-name').value.trim()||'API Key';
  const type=document.getElementById('new-key-type').value;
  const tid=document.getElementById('new-key-tenant').value||currentTenantId;
  const scopes=[...document.querySelectorAll('#modal-create-key .checkbox-item input:checked')].map(el=>el.value);
  const origins=document.getElementById('new-key-origins').value.trim()||'*';
  const btn=document.getElementById('generate-key-btn');
  if(btn){btn.disabled=true;btn.textContent='Generating...';}
  try{
    const d=await apiFetch(`/v1/tenants/${tid}/keys`,{method:'POST',body:JSON.stringify({name,type,scopes,allowed_origins:origins.split(',').map(s=>s.trim())})});
    const nk=d.key;
    document.getElementById('new-key-form-area').style.display='none';
    document.getElementById('new-key-result-area').style.display='';
    document.getElementById('modal-new-key-value').textContent=nk.key;
    document.getElementById('modal-new-key-id').textContent=nk.key_id;
    document.getElementById('modal-key-actions').innerHTML=`<button class="btn btn-ghost" onclick="handleKeyModalClose()">\u2713 I've copied my key &mdash; Close</button>`;
    toast('Key generated! Copy it now \u2014 this is your only chance.','warn');
  }catch(e){toast('Generate failed: '+e.message,'error');if(btn){btn.disabled=false;btn.textContent='Generate Key';}}
}
function handleKeyModalClose(){closeModal('modal-create-key');loadKeys();loadDashboard();}
function copyNewKey(){copyText(document.getElementById('modal-new-key-value').textContent,'API Key copied to clipboard!');}

function confirmRevoke(keyId,keyName,tenantId){
  pendingRevokeKeyId=keyId;pendingRevokeTenantId=tenantId;
  document.getElementById('revoke-key-name-display').textContent=keyName;
  document.getElementById('confirm-revoke-btn').onclick=doRevoke;
  openModal('modal-revoke-confirm');
}
async function doRevoke(){
  if(!pendingRevokeKeyId)return;
  try{await apiFetch(`/v1/tenants/${pendingRevokeTenantId}/keys/${pendingRevokeKeyId}`,{method:'DELETE'});closeModal('modal-revoke-confirm');toast('Key revoked.','success');loadKeys();loadDashboard();}
  catch(e){toast('Revoke failed: '+e.message,'error');}
}

async function loadTenants(){
  try{
    const d=await apiFetch('/v1/tenants');const ts=d.tenants||[];allTenantOptions=ts;
    const sel=document.getElementById('project-select');
    sel.innerHTML=ts.map(t=>`<option value="${esc(t.id)}"${t.id===currentTenantId?' selected':''}>${esc(t.name||t.id)}</option>`).join('');
    const grid=document.getElementById('tenants-grid');if(!grid)return;
    if(!ts.length){grid.innerHTML='<div class="card" style="grid-column:1/-1"><div class="empty-state"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5"/></svg><p>No tenants found.</p></div></div>';return;}
    grid.innerHTML=ts.map(t=>`
      <div class="tenant-card" onclick="selectTenant('${esc(t.id)}')">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div><div class="tenant-card-name">${esc(t.name||t.id)}</div><div class="tenant-card-id">/${esc(t.id)}</div></div>
          <span class="badge ${t.status||'active'}">${t.status||'active'}</span>
        </div>
        <div class="tenant-card-meta">
          <div class="tenant-meta-row"><span>Plan</span><span class="badge ${t.tier||'growth'}">${(t.tier||'growth').toUpperCase()}</span></div>
          <div class="tenant-meta-row"><span>Created</span><span style="font-family:var(--mono);font-size:11px">${t.created_at?new Date(t.created_at).toLocaleDateString():'--'}</span></div>
          <div class="tenant-meta-row"><span>Webhook</span><span style="color:${t.webhook_url?'var(--good)':'var(--text-muted)'}">${t.webhook_url?'\u2713 Configured':'Not set'}</span></div>
        </div>
        <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center" onclick="selectTenant('${esc(t.id)}');event.stopPropagation()">Switch to This Project &rarr;</button>
      </div>`).join('');
  }catch(e){toast('Tenants error: '+e.message,'error');}
}
function selectTenant(id){currentTenantId=id;document.getElementById('project-select').value=id;navigateTo('dashboard');}

async function createTenant(){
  const id=document.getElementById('tenant-id-input').value.trim();
  const name=document.getElementById('tenant-name-input').value.trim();
  const tier=document.getElementById('tenant-tier-select').value;
  const webhook=document.getElementById('tenant-webhook-input').value.trim()||null;
  if(!id||!name){toast('Tenant ID and name are required','error');return;}
  const btn=document.getElementById('create-tenant-btn');btn.disabled=true;btn.textContent='Creating...';
  try{
    const d=await apiFetch('/v1/tenants',{method:'POST',body:JSON.stringify({tenant_id:id,name,tier,webhook_url:webhook})});
    const t=d.tenant;
    const r=document.getElementById('new-tenant-result');r.style.display='';
    r.innerHTML=`<div class="show-once-banner" style="margin-top:16px">
      <div class="icon"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div class="text"><p>Tenant <strong>${esc(name)}</strong> created successfully!</p><p>${esc(t.key_warning||'Copy your initial API key now.')}</p></div>
    </div>
    <div class="key-reveal-box"><span class="key-text" style="font-size:12px">${esc(t.initial_api_key||'--')}</span><button class="btn btn-ghost btn-sm" onclick="copyText('${esc(t.initial_api_key||'')}','Key copied!')">Copy</button></div>`;
    btn.textContent='\u2713 Created \u2014 Close';
    btn.onclick=()=>{closeModal('modal-create-tenant');loadTenants();};
    toast('Tenant created! Copy the API key immediately.','warn');
  }catch(e){toast('Create failed: '+e.message,'error');btn.disabled=false;btn.textContent='Create Tenant';}
}

async function loadUsage(){
  try{
    const d=await apiFetch(`/v1/tenants/${currentTenantId}/usage`);
    const m=d.metrics||{},u=d.enrolled_users_count||0;
    const c=document.getElementById('usage-content');if(!c)return;
    c.innerHTML=`<div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card" style="--clr:var(--accent)"><div class="stat-label">Verifications</div><div class="stat-value">${m.total_verifications||0}</div><div class="stat-sub">Total /verify calls</div></div>
      <div class="stat-card" style="--clr:var(--good)"><div class="stat-label">Enrollments</div><div class="stat-value">${m.total_enrollments||0}</div><div class="stat-sub">Samples collected</div></div>
      <div class="stat-card" style="--clr:var(--warn)"><div class="stat-label">Anomalies</div><div class="stat-value">${m.anomalies_flagged||0}</div><div class="stat-sub">Risk events flagged</div></div>
      <div class="stat-card" style="--clr:var(--purple)"><div class="stat-label">Enrolled Users</div><div class="stat-value">${u}</div><div class="stat-sub">Active profiles</div></div>
    </div>
    <div class="card"><div class="card-header"><span class="card-title">Rate Limit Utilization</span></div>
    <div class="card-body"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span style="color:var(--text-dim)">Total API Calls</span><span style="font-family:var(--mono)">${m.total_verifications||0}</span></div>
    <div class="usage-bar-wrap"><div class="usage-bar-fill" style="width:${Math.min(100,((m.total_verifications||0)/3000)*100)}%"></div></div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:12px">Last active: ${m.last_active?new Date(m.last_active).toLocaleString():'Never'}</div></div></div>`;
  }catch(e){toast('Usage error: '+e.message,'error');}
}

document.getElementById('test-webhook-btn').addEventListener('click',async()=>{
  const url=document.getElementById('webhook-url-input').value.trim();
  const et=document.getElementById('webhook-event-type').value;
  if(!url){toast('Enter a webhook URL first','error');return;}
  try{await apiFetch('/v1/webhooks/test',{method:'POST',body:JSON.stringify({tenant_id:currentTenantId,event_type:et})});toast('Test webhook dispatched with HMAC signature!','success');}
  catch(e){toast('Webhook error: '+e.message,'error');}
});
document.getElementById('refresh-health-btn').addEventListener('click',checkHealth);

function copyText(text,msg){navigator.clipboard.writeText(text).then(()=>toast(msg||'Copied!','success')).catch(()=>{const el=document.createElement('textarea');el.value=text;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();toast(msg||'Copied!','success');});}
function copyCode(btn){const code=btn.closest('.code-block').querySelector('pre').textContent;copyText(code,'Code copied!');const orig=btn.textContent;btn.textContent='Copied!';setTimeout(()=>btn.textContent=orig,2000);}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);}
let _tid=0;
function toast(msg,type='success'){
  const r=document.getElementById('toast-root');
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;r.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity 0.3s';el.style.opacity='0';setTimeout(()=>el.remove(),300);},4000);
}

async function init(){
  const host = (window.location.protocol.startsWith('http')) ? window.location.origin : 'http://localhost:8000';
  document.querySelectorAll('.code-block pre').forEach(p => {
    p.innerHTML = p.innerHTML.replaceAll('http://localhost:8000', host);
  });
  try{const d=await apiFetch('/v1/tenants');allTenantOptions=d.tenants||[];const sel=document.getElementById('project-select');sel.innerHTML=allTenantOptions.map(t=>`<option value="${esc(t.id)}"${t.id===currentTenantId?' selected':''}>${esc(t.name||t.id)}</option>`).join('');}catch{}
  loadDashboard();
}
init();
</script>
</body>
</html>"""

with open('console.html', 'w', encoding='utf-8') as f:
    f.write(html)

import os
print(f"console.html written: {os.path.getsize('console.html'):,} bytes")
