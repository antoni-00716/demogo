path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

step_styles = """

/* ================================================================
   Agent Publish — Step-by-step guided layout
   ================================================================ */

/* --- Step block --- */
.agent-step-block {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: #fafaf9;
  padding: 20px 24px;
  margin-bottom: 0;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.agent-step-block.active {
  border-color: var(--cyan-400);
  box-shadow: 0 0 0 1px var(--cyan-400), 0 4px 16px rgba(6, 182, 212, 0.06);
}
.agent-step-block.completed {
  border-color: var(--border-light);
}
.agent-step-block.pending {
  opacity: 0.55;
}

/* --- Step head (indicator + title + desc) --- */
.agent-step-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.agent-step-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 1px;
}
.agent-step-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}
.agent-step-desc {
  font-size: 12.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

/* --- Step dot (circle indicator) --- */
.agent-step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.2s;
}
.agent-step-dot.pending {
  background: var(--gray-100);
  color: var(--text-tertiary);
}
.agent-step-dot.active {
  background: var(--cyan-500);
  color: #fff;
}
.agent-step-dot.completed {
  background: var(--green-500);
  color: #fff;
}

/* --- Step body (content below head) --- */
.agent-step-body {
  margin-top: 16px;
  margin-left: 46px;
}

/* --- Step connector arrow --- */
.agent-step-connector {
  display: flex;
  justify-content: center;
  padding: 6px 0;
  color: var(--text-tertiary);
}
.agent-step-connector svg {
  transform: rotate(90deg);
}

/* --- Token row (within step 1) --- */
.agent-step-block .agent-token-row {
  margin: 0;
}
.agent-step-block .agent-token-row .agent-token-value {
  background: #fff;
}

/* --- Mode selector (within step 2) --- */
.agent-step-block .agent-mode-selector {
  margin-bottom: 0;
}

/* --- Instruction result (within step 3) --- */
.agent-instruction-result {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
  background: #fdfdfc;
}
.agent-instruction-result .agent-instruction-body {
  border: none;
  max-height: 300px;
  background: transparent;
}
"""

# Insert before Token display card section
marker = "/* --- Token display card --- */"
if marker in content:
    content = content.replace(marker, step_styles + "\n" + marker)
    print("Step styles added")
else:
    print("Marker not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("CSS updated")
