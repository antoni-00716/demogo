import re
path = r"C:\Users\wei.gu\Documents\demogo\server\src\tests\deployment-job-crud.test.mjs"
with open(path, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()

# Fix line 81: statusLabel
content = content.replace(
    "assert.strictEqual(job.statusLabel, '????')",
    "assert.strictEqual(job.statusLabel, '排队中')"
)

# Fix lines 274, 277: build step message
content = content.replace(
    "svc.markDeploymentStep(steps, 'build', 'success', '????')",
    "svc.markDeploymentStep(steps, 'build', 'success', '构建成功')"
)
content = content.replace(
    "assert.strictEqual(buildStep.message, '????')",
    "assert.strictEqual(buildStep.message, '构建成功')"
)

# Fix line 296: error message
content = content.replace(
    "new Error('????')",
    "new Error('测试错误')"
)

# Fix the label test (lines 306-310) using regex
old_pattern = r"(it\(\"returns Chinese labels\", \(\) => \{[^}]+\}\;)"
new_text = 'it("returns Chinese labels", () => {\n    assert.strictEqual(svc.deploymentJobStatusLabel("queued"), "排队中");\n    assert.strictEqual(svc.deploymentJobStatusLabel("running"), "执行中");\n    assert.strictEqual(svc.deploymentJobStatusLabel("success"), "成功");\n    assert.strictEqual(svc.deploymentJobStatusLabel("failed"), "失败");\n    assert.strictEqual(svc.deploymentJobStatusLabel("unknown"), "未知");\n  });'
content = re.sub(old_pattern, new_text, content, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done - test file fixed")
