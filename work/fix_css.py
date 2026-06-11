fp = r"C:\Users\wei.gu\Documents\demogo\web\src\styles\dashboard.css"
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()

fixes = [
    ('(??????)', '(\u5957\u9910\u9009\u9879)'),
    ('(AI ?????)', '(AI \u53d1\u5e03\u547d\u4ee4)'),
    ('(???????)', '(\u5347\u7ea7\u6a2a\u5e45)'),
    ('(????)', '(\u90e8\u7f72\u6b65\u9aa4)'),
]
# Need to be careful - multiple (????) and (??????) variants
c = c.replace('/* ====== Plan options (??????) ====== */', '/* ====== Plan options (\u5957\u9910\u9009\u9879) ====== */')
c = c.replace('/* ====== Upgrade form (??????) ====== */', '/* ====== Upgrade form (\u5347\u7ea7\u8868\u5355) ====== */')
c = c.replace('/* ====== AI command box (AI ?????) ====== */', '/* ====== AI command box (AI \u53d1\u5e03\u547d\u4ee4) ====== */')
c = c.replace('/* ====== Fix prompt box (??????) ====== */', '/* ====== Fix prompt box (\u4fee\u590d\u63d0\u793a) ====== */')
c = c.replace('/* ====== Upgrade banner (???????) ====== */', '/* ====== Upgrade banner (\u5347\u7ea7\u6a2a\u5e45) ====== */')
c = c.replace('/* ====== Deployment steps (????) ====== */', '/* ====== Deployment steps (\u90e8\u7f72\u6b65\u9aa4) ====== */')
c = c.replace('/* ====== Quick create panel (????) ====== */', '/* ====== Quick create panel (\u5feb\u6377\u521b\u5efa) ====== */')
c = c.replace('/* ====== Upload form (????) ====== */', '/* ====== Upload form (\u4e0a\u4f20\u8868\u5355) ====== */')

with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)

print(f"Fixed. Remaining ????: {c.count('????')}")
