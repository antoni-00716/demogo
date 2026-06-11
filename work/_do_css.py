path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

new_css = """

/* ================================================================
   Agent Publish — Step-by-step (ag-*)
   ================================================================ */

/* --- Step block --- */
.ag-step {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  padding: 22px 24px;
  transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.ag-step.active {
  border-color: var(--cyan-400);
  box-shadow: 0 0 0 1px var(--cyan-400), 0 4px 20px rgba(6,182,212,0.08);
}
.ag-step.completed {
  border-color: var(--border-light);
}
.ag-step.pending {
  border-color: var(--border-light);
  opacity: 0.45;
  pointer-events: none;
}

/* --- Step head --- */
.ag-step-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.ag-step-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 1px;
}
.ag-step-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}
.ag-step-desc {
  font-size: 12.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

/* --- Step dot --- */
.ag-step-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.2s;
}
.ag-step-dot.pending { background: var(--gray-150, #e5e5e5); color: var(--text-tertiary); }
.ag-step-dot.active { background: var(--cyan-500); color: #fff; }
.ag-step-dot.completed { background: var(--green-500); color: #fff; }

/* --- Step body --- */
.ag-step-body {
  margin-top: 16px;
  padding-left: 44px;
}

/* --- Step arrow --- */
.ag-step-arrow {
  display: flex;
  justify-content: center;
  padding: 4px 0 4px 12px;
  color: var(--text-tertiary);
}

/* --- Token row (step 1) --- */
.ag-token-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ag-token-value {
  flex: 1;
  padding: 9px 12px;
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: all;
}
.ag-token-eye {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.ag-token-eye:hover { background: var(--gray-100); color: var(--text-primary); }
.ag-token-div {
  width: 1px;
  height: 20px;
  background: var(--border-light);
  margin: 0 4px;
}
.ag-token-reset {
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text-tertiary);
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.ag-token-reset:hover { color: var(--text-secondary); background: var(--gray-100); }

/* --- Mode selector (step 2) --- */
.ag-mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.ag-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 18px 20px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.ag-mode-btn strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.ag-mode-btn span {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
}
.ag-mode-btn svg {
  color: var(--cyan-400);
  margin-bottom: 4px;
}
.ag-mode-btn:hover {
  border-color: var(--cyan-300);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(6,182,212,0.06);
}
.ag-mode-btn.active {
  border-color: var(--cyan-400);
  background: #fff;
  box-shadow: 0 0 0 1px var(--cyan-400), 0 4px 16px rgba(6,182,212,0.06);
}

/* --- URL input (step 2, update mode) --- */
.ag-url-input {
  width: 100%;
  margin-top: 14px;
  padding: 10px 14px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.ag-url-input:focus {
  border-color: var(--cyan-400);
  box-shadow: 0 0 0 2px rgba(6,182,212,0.1);
}
.ag-url-input::placeholder { color: var(--text-tertiary); }

/* --- Generate area (step 3, before generation) --- */
.ag-gen-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ag-gen-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* --- Result (step 3, after generation) --- */
.ag-result {
  border: 1px solid var(--border-light);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.ag-result-pre {
  margin: 0;
  padding: 18px 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
  background: #fdfdfc;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}
.ag-result-action {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--border-light);
}

/* --- Supported tools bar --- */
.ag-tools {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  margin-top: 24px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  font-size: 12.5px;
  color: var(--text-tertiary);
}
.ag-tools strong { color: var(--text-secondary); font-weight: 600; }
"""

with open(path, "a", encoding="utf-8") as f:
    f.write(new_css)
print("New ag-* CSS appended")
