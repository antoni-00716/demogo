path = r"C:\Users\wei.gu\Documents\demogo\web\src\pages\dashboard\AgentPublishPanel.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_import = 'import { Sparkles, Copy, Key, CheckCircle2, Eye, EyeOff, Upload, RefreshCw, Wand2, Circle, ChevronRight } from "lucide-react";'
new_import = 'import { Sparkles, Copy, CheckCircle2, Eye, EyeOff, Upload, RefreshCw, Wand2, ChevronRight } from "lucide-react";'

content = content.replace(old_import, new_import)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Unused imports removed")
