path = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(path, "a", encoding="utf-8") as f:
    f.write("""

/* ================================================================
   Upload Panel — Drop zone & file display
   ================================================================ */

/* --- Drop zone --- */
.up-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 24px;
  border: 1.5px dashed var(--border-light);
  border-radius: 12px;
  background: #fdfdfc;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  text-align: center;
}
.up-drop:hover {
  border-color: var(--cyan-300);
  background: #fafeff;
}
.up-drop input { display: none; }
.up-drop svg { color: var(--text-tertiary); }
.up-drop strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.up-drop span {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* --- File selected display --- */
.up-file-selected {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid var(--cyan-200);
  border-radius: 10px;
}
.up-file-selected strong {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.up-file-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all 0.15s;
}
.up-file-remove:hover { background: var(--gray-100); color: var(--text-primary); }
""")
print("Upload CSS appended")
