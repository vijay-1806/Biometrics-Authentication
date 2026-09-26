/**
 * Universal Behavioral Biometrics Client SDK (BioAuth)
 * Embeddable on any web application for keystroke behavioral authentication & proctoring.
 * Version: 1.0.0
 */
(function (global) {
  'use strict';

  class BioAuth {
    constructor(config = {}) {
      if (!config.apiKey) {
        console.warn('[BioAuth] Warning: No apiKey specified. Falling back to default tenant.');
      }
      this.apiKey = config.apiKey || 'bio_live_default_lms_key';
      this.userId = config.userId || 'guest_user';
      this.apiUrl = (config.apiUrl || this._detectApiUrl()).replace(/\/+$/, '');
      
      // Active session state
      this._sessionActive = false;
      this._examId = null;
      this._eventsBuffer = [];
      this._flushTimer = null;
      this._onScoreCallback = null;
      this._onViolationCallback = null;
      this._boundKeyDown = null;
      this._boundKeyUp = null;
      this._boundPaste = null;
      this._boundCopy = null;
      this._boundBlur = null;
      this._boundVisibilityChange = null;
      this._lastBlurTime = 0;
    }

    _detectApiUrl() {
      // If loaded from script tag, use that origin; otherwise localhost:8000
      if (typeof document !== 'undefined') {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          const src = scripts[i].src;
          if (src && (src.includes('/sdk.js') || src.includes('/biometrics.js'))) {
            try {
              const url = new URL(src);
              return `${url.protocol}//${url.host}`;
            } catch (e) {}
          }
        }
      }
      return 'http://127.0.0.1:8000';
    }

    _headers() {
      return {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      };
    }

    /**
     * Fetch biometric enrollment and model training status
     */
    async getStatus() {
      try {
        const res = await fetch(`${this.apiUrl}/users/${encodeURIComponent(this.userId)}/status`, {
          headers: this._headers()
        });
        if (!res.ok) {
          return { state: 'collecting', samples_collected: 0, model_ready: false };
        }
        const data = await res.json();
        return {
          ...data,
          model_ready: data.state === 'provisional' || data.state === 'full'
        };
      } catch (err) {
        console.error('[BioAuth] Failed to fetch status:', err);
        return { state: 'collecting', samples_collected: 0, model_ready: false, error: err.message };
      }
    }

    /**
     * Launch the Drop-in Calibration Modal for 20-sample training
     */
    async openEnrollmentModal(options = {}) {
      const targetSamples = options.targetSamples || 20;
      const onComplete = options.onComplete || (() => {});
      const onCancel = options.onCancel || (() => {});

      // Inject styles if needed
      this._injectModalStyles();

      // Fetch initial status and passage
      let passageText = 'the quick brown fox jumps over the lazy dog while the early morning sun rises above the quiet green hills';
      let currentStatus = { state: 'collecting', samples_collected: 0 };

      try {
        const [pRes, sRes] = await Promise.all([
          fetch(`${this.apiUrl}/passage/enroll`, { headers: this._headers() }),
          this.getStatus()
        ]);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.text) passageText = pData.text;
        }
        currentStatus = sRes;
      } catch (e) {
        console.warn('[BioAuth] Error loading enrollment config, using defaults:', e);
      }

      // Check if already completed
      if (currentStatus.samples_collected >= targetSamples) {
        const confirmed = confirm(`User ${this.userId} already has ${currentStatus.samples_collected} samples recorded (${currentStatus.state.toUpperCase()}). Do you want to train additional samples?`);
        if (!confirmed) {
          onComplete({ ...currentStatus, model_ready: true });
          return;
        }
      }

      // Build and mount modal DOM
      const modalId = 'bioauth-enrollment-modal';
      let existingModal = document.getElementById(modalId);
      if (existingModal) existingModal.remove();

      const modalWrapper = document.createElement('div');
      modalWrapper.id = modalId;
      modalWrapper.className = 'bioauth-modal-overlay';
      modalWrapper.innerHTML = `
        <div class="bioauth-modal-card">
          <div class="bioauth-modal-header">
            <div class="bioauth-title-group">
              <div class="bioauth-shield-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <h3 class="bioauth-title">Behavioral Biometrics Calibration</h3>
                <p class="bioauth-subtitle">Type the calibration passage naturally to train your unique typing rhythm.</p>
              </div>
            </div>
            <button class="bioauth-close-btn" id="bioauth-btn-close">&times;</button>
          </div>

          <div class="bioauth-progress-section">
            <div class="bioauth-progress-bar-bg">
              <div class="bioauth-progress-bar-fill" id="bioauth-progress-fill" style="width: ${Math.min(100, (currentStatus.samples_collected / targetSamples) * 100)}%;"></div>
            </div>
            <div class="bioauth-milestones">
              <span id="bioauth-badge-collecting" class="bioauth-badge ${currentStatus.samples_collected < 10 ? 'active' : 'done'}">Phase 1: Collecting (0-9)</span>
              <span id="bioauth-badge-provisional" class="bioauth-badge ${currentStatus.samples_collected >= 10 && currentStatus.samples_collected < 20 ? 'active' : currentStatus.samples_collected >= 20 ? 'done' : ''}">Phase 2: Provisional (10)</span>
              <span id="bioauth-badge-full" class="bioauth-badge ${currentStatus.samples_collected >= 20 ? 'done' : ''}">Phase 3: Full Protection (20)</span>
            </div>
          </div>

          <div class="bioauth-passage-box">
            <span class="bioauth-passage-label">REFERENCE PASSAGE:</span>
            <p class="bioauth-passage-text" id="bioauth-ref-text">${passageText}</p>
          </div>

          <div class="bioauth-input-container">
            <textarea 
              id="bioauth-typing-input" 
              class="bioauth-textarea" 
              placeholder="Click here and type the exact passage above naturally..." 
              rows="3"
              spellcheck="false"
              autocomplete="off"
            ></textarea>
          </div>

          <div class="bioauth-metrics-bar">
            <div class="bioauth-metric">
              <span class="bioauth-metric-label">SAMPLES</span>
              <span class="bioauth-metric-val" id="bioauth-metric-samples">${currentStatus.samples_collected} / ${targetSamples}</span>
            </div>
            <div class="bioauth-metric">
              <span class="bioauth-metric-label">STATUS</span>
              <span class="bioauth-metric-val" id="bioauth-metric-state">${(currentStatus.state || 'COLLECTING').toUpperCase()}</span>
            </div>
            <div class="bioauth-metric">
              <span class="bioauth-metric-label">KEYSTROKES</span>
              <span class="bioauth-metric-val" id="bioauth-metric-keys">0</span>
            </div>
          </div>

          <div id="bioauth-alert-pill" class="bioauth-alert-pill" style="display: none;"></div>

          <div class="bioauth-footer">
            <button class="bioauth-btn bioauth-btn-secondary" id="bioauth-btn-cancel">Cancel</button>
            <button class="bioauth-btn bioauth-btn-primary" id="bioauth-btn-submit" disabled>Record Sample</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalWrapper);

      // Elements
      const inputEl = document.getElementById('bioauth-typing-input');
      const submitBtn = document.getElementById('bioauth-btn-submit');
      const cancelBtn = document.getElementById('bioauth-btn-cancel');
      const closeBtn = document.getElementById('bioauth-btn-close');
      const progressFill = document.getElementById('bioauth-progress-fill');
      const metricSamples = document.getElementById('bioauth-metric-samples');
      const metricState = document.getElementById('bioauth-metric-state');
      const metricKeys = document.getElementById('bioauth-metric-keys');
      const alertPill = document.getElementById('bioauth-alert-pill');
      const badgeColl = document.getElementById('bioauth-badge-collecting');
      const badgeProv = document.getElementById('bioauth-badge-provisional');
      const badgeFull = document.getElementById('bioauth-badge-full');

      let sampleEvents = [];
      let samplesCount = currentStatus.samples_collected || 0;

      const showAlert = (msg, type = 'info') => {
        alertPill.textContent = msg;
        alertPill.className = `bioauth-alert-pill bioauth-alert-${type}`;
        alertPill.style.display = 'block';
      };

      const updateProgressUI = (n, state) => {
        samplesCount = n;
        metricSamples.textContent = `${n} / ${targetSamples}`;
        metricState.textContent = state.toUpperCase();
        const pct = Math.min(100, Math.round((n / targetSamples) * 100));
        progressFill.style.width = `${pct}%`;

        badgeColl.className = `bioauth-badge ${n < 10 ? 'active' : 'done'}`;
        badgeProv.className = `bioauth-badge ${n >= 10 && n < 20 ? 'active' : n >= 20 ? 'done' : ''}`;
        badgeFull.className = `bioauth-badge ${n >= 20 ? 'done' : ''}`;
      };

      const cleanupModal = () => {
        modalWrapper.remove();
      };

      closeBtn.onclick = () => { cleanupModal(); onCancel(); };
      cancelBtn.onclick = () => { cleanupModal(); onCancel(); };

      // Input event listener for keystroke dynamics
      inputEl.addEventListener('keydown', (e) => {
        sampleEvents.push({
          key: e.key,
          type: 'down',
          t: Date.now()
        });
        metricKeys.textContent = sampleEvents.length;
        if (inputEl.value.trim().length > 15) {
          submitBtn.removeAttribute('disabled');
        }
      });

      inputEl.addEventListener('keyup', (e) => {
        sampleEvents.push({
          key: e.key,
          type: 'up',
          t: Date.now()
        });
        metricKeys.textContent = sampleEvents.length;
        if (inputEl.value.trim().length > 15) {
          submitBtn.removeAttribute('disabled');
        }
      });

      // Submit sample
      submitBtn.onclick = async () => {
        if (sampleEvents.length < 10) {
          showAlert('Please type more of the passage before submitting.', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving & Training...';
        showAlert('Analyzing biometric timing vectors...', 'info');

        try {
          const res = await fetch(`${this.apiUrl}/enroll`, {
            method: 'POST',
            headers: this._headers(),
            body: JSON.stringify({
              user_id: this.userId,
              events: sampleEvents
            })
          });

          if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Failed to submit sample');
          }

          const data = await res.json();
          updateProgressUI(data.samples_collected, data.state);

          inputEl.value = '';
          sampleEvents = [];
          metricKeys.textContent = '0';

          if (data.samples_collected >= targetSamples) {
            showAlert(`Congratulations! Calibration complete (${data.samples_collected} samples). Model is fully trained!`, 'success');
            submitBtn.textContent = 'Completed!';
            setTimeout(() => {
              cleanupModal();
              onComplete({ ...data, model_ready: true });
            }, 1200);
          } else {
            showAlert(`Sample #${data.samples_collected} recorded! (${data.state.toUpperCase()}). Please type again.`, 'success');
            submitBtn.textContent = 'Record Sample';
            submitBtn.disabled = true;
            inputEl.focus();
          }
        } catch (err) {
          console.error('[BioAuth] Enrollment error:', err);
          showAlert(`Error: ${err.message}`, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Record Sample';
        }
      };

      inputEl.focus();
    }

    /**
     * Start continuous proctoring / verification during an assessment
     */
    startSession(options = {}) {
      if (this._sessionActive) {
        this.endSession();
      }

      this._sessionActive = true;
      this._examId = options.examId || 'session_' + Date.now();
      this._intervalMs = options.intervalMs || 5000;
      this._onScoreCallback = options.onScore || (() => {});
      this._onViolationCallback = options.onViolation || (() => {});
      this._eventsBuffer = [];

      // 1. Capture-phase Key listeners
      this._boundKeyDown = (e) => {
        if (!this._sessionActive) return;
        this._eventsBuffer.push({
          key: e.key,
          type: 'down',
          t: Date.now()
        });
      };

      this._boundKeyUp = (e) => {
        if (!this._sessionActive) return;
        this._eventsBuffer.push({
          key: e.key,
          type: 'up',
          t: Date.now()
        });
      };

      // 2. Capture-phase Paste listener
      this._boundPaste = (e) => {
        if (!this._sessionActive) return;
        let pastedLen = 0;
        try {
          const text = (e.clipboardData || window.clipboardData).getData('text');
          pastedLen = text ? text.length : 0;
        } catch (err) {}

        this._onViolationCallback({
          type: 'paste_detected',
          length: pastedLen,
          timestamp: Date.now()
        });
      };

      // 3. Capture-phase Copy listener
      this._boundCopy = (e) => {
        if (!this._sessionActive) return;
        let copiedLen = 0;
        try {
          const sel = window.getSelection ? window.getSelection().toString() : '';
          copiedLen = sel ? sel.length : 0;
        } catch (err) {}

        this._onViolationCallback({
          type: 'copy_detected',
          length: copiedLen,
          timestamp: Date.now()
        });
      };

      // 4. Tab switch & window blur listeners
      // Fix: In-app clicks (like Description/Attempts tabs or Monaco editor) must NOT trigger false tab switch
      this._boundBlur = () => {
        if (!this._sessionActive) return;
        // Delay verification to allow in-page focus shifts to settle
        setTimeout(() => {
          if (!this._sessionActive) return;
          // If the document still has focus, or document is not hidden and active element is within page, do not trigger
          if (document.hidden) {
            const now = Date.now();
            if (now - this._lastBlurTime < 1500) return;
            this._lastBlurTime = now;
            this._onViolationCallback({
              type: 'tab_switch',
              timestamp: now
            });
          }
        }, 350);
      };

      this._boundVisibilityChange = () => {
        if (!this._sessionActive) return;
        if (document.hidden) {
          const now = Date.now();
          if (now - this._lastBlurTime < 1500) return;
          this._lastBlurTime = now;

          this._onViolationCallback({
            type: 'tab_switch',
            timestamp: now
          });
        }
      };

      // Attach with capture: true so Monaco/code editors cannot swallow them
      window.addEventListener('keydown', this._boundKeyDown, { capture: true });
      window.addEventListener('keyup', this._boundKeyUp, { capture: true });
      window.addEventListener('paste', this._boundPaste, { capture: true });
      window.addEventListener('copy', this._boundCopy, { capture: true });
      window.addEventListener('blur', this._boundBlur, { capture: true });
      document.addEventListener('visibilitychange', this._boundVisibilityChange);

      // Periodic verification flush timer
      this._flushTimer = setInterval(() => this._flushTelemetry(), this._intervalMs);
      console.log(`[BioAuth] Session started for user: ${this.userId}, exam: ${this._examId}`);
    }

    async _flushTelemetry() {
      if (!this._sessionActive || this._eventsBuffer.length < 6) return;

      const downs = this._eventsBuffer.filter(e => e.type === 'down');
      if (downs.length < 2) return;

      const eventsToSend = [...this._eventsBuffer];
      this._eventsBuffer = [];

      try {
        const res = await fetch(`${this.apiUrl}/verify`, {
          method: 'POST',
          headers: this._headers(),
          body: JSON.stringify({
            user_id: this.userId,
            events: eventsToSend
          })
        });

        if (!res.ok) return;
        const data = await res.json();
        
        // Dispatch live score callback
        this._onScoreCallback(data);

        // Check for behavioral deviation anomalies
        if (data.action === 'deny' || data.risk_level === 'high') {
          this._onViolationCallback({
            type: 'biometric_anomaly',
            trustScore: data.trust_score,
            riskLevel: data.risk_level,
            action: data.action,
            reason: data.reason,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.warn('[BioAuth] Telemetry flush error:', err);
      }
    }

    /**
     * Terminate continuous proctoring session and remove listeners
     */
    endSession() {
      this._sessionActive = false;
      if (this._flushTimer) {
        clearInterval(this._flushTimer);
        this._flushTimer = null;
      }

      if (this._boundKeyDown) window.removeEventListener('keydown', this._boundKeyDown, { capture: true });
      if (this._boundKeyUp) window.removeEventListener('keyup', this._boundKeyUp, { capture: true });
      if (this._boundPaste) window.removeEventListener('paste', this._boundPaste, { capture: true });
      if (this._boundCopy) window.removeEventListener('copy', this._boundCopy, { capture: true });
      if (this._boundBlur) window.removeEventListener('blur', this._boundBlur, { capture: true });
      if (this._boundVisibilityChange) document.removeEventListener('visibilitychange', this._boundVisibilityChange);

      this._eventsBuffer = [];
      console.log('[BioAuth] Session ended & listeners detached.');
    }

    _injectModalStyles() {
      if (document.getElementById('bioauth-sdk-styles')) return;
      const style = document.createElement('style');
      style.id = 'bioauth-sdk-styles';
      style.textContent = `
        .bioauth-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(4, 7, 18, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          box-sizing: border-box;
        }
        .bioauth-modal-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          width: 100%;
          max-width: 640px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          padding: 28px;
          color: #f8fafc;
          animation: bioauth-fade-in 0.2s ease-out;
        }
        @keyframes bioauth-fade-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .bioauth-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .bioauth-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .bioauth-shield-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 0 16px rgba(37, 99, 235, 0.4);
        }
        .bioauth-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: #f8fafc;
        }
        .bioauth-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 3px 0 0 0;
        }
        .bioauth-close-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 26px;
          cursor: pointer;
          line-height: 1;
        }
        .bioauth-close-btn:hover { color: #f8fafc; }
        .bioauth-progress-section {
          margin-bottom: 20px;
        }
        .bioauth-progress-bar-bg {
          height: 8px;
          background: #1e293b;
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .bioauth-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
          transition: width 0.3s ease;
        }
        .bioauth-milestones {
          display: flex;
          justify-content: space-between;
          gap: 6px;
        }
        .bioauth-badge {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 6px;
          background: #1e293b;
          color: #64748b;
          font-weight: 600;
        }
        .bioauth-badge.active {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.4);
        }
        .bioauth-badge.done {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .bioauth-passage-box {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 16px;
        }
        .bioauth-passage-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #38bdf8;
          display: block;
          margin-bottom: 6px;
        }
        .bioauth-passage-text {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #e2e8f0;
          margin: 0;
        }
        .bioauth-input-container {
          margin-bottom: 16px;
        }
        .bioauth-textarea {
          width: 100%;
          background: #090d16;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 14px;
          color: #f8fafc;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          line-height: 1.6;
          resize: none;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }
        .bioauth-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .bioauth-metrics-bar {
          display: flex;
          gap: 16px;
          background: #131d31;
          padding: 10px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .bioauth-metric {
          display: flex;
          flex-direction: column;
        }
        .bioauth-metric-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
        }
        .bioauth-metric-val {
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
        }
        .bioauth-alert-pill {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 16px;
          font-weight: 500;
        }
        .bioauth-alert-info { background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3); }
        .bioauth-alert-success { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); }
        .bioauth-alert-error { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }
        .bioauth-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .bioauth-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .bioauth-btn-secondary {
          background: #1e293b;
          color: #94a3b8;
        }
        .bioauth-btn-secondary:hover { background: #334155; color: #fff; }
        .bioauth-btn-primary {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .bioauth-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
        .bioauth-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Export to global window
  global.BioAuth = BioAuth;
})(typeof window !== 'undefined' ? window : this);
