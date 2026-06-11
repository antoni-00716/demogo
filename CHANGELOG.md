# Changelog



> **???** v0.9.31 ??????????????????????????? v0.9.35 ???? UTF-8 ???????

## v0.9.35 (2026-06-04)

### Bug 修复
- 修复 deployment-pipeline-service.js 缺少 getDeployEvents 导入导致 demo 更新报 500 错误
- 修复前端 lint 错误：AgentPublishPanel 空 catch 块、OverviewView StatCard 组件在 render 中创建
- 修复烟雾测试中 5 处 inspection 响应字段路径错误（适配新版 inspection 嵌套结构）

### 部署
- 服务器、站点预览、CLI (@demogo-cn/cli)、MCP (demogo-mcp) 同步更新至 0.9.35

---

## 缁撴瀯璋冩暣 (2026-06-02)

### 鐩綍閲嶆瀯
- codex-skill/ 鍚堝苟鍏?codex-plugin/锛堟彃浠跺凡鍖呭惈 skill锛?- rand/logos/assets/ 鎵佸钩鍖?鈫?rand/
- server/scripts/ 鍒犻櫎锛?涓猂edis娴嬭瘯鑴氭湰锛?- samples/*/dist/ + samples/*/.demogo/ 娓呯悊锛?0涓畫鐣欑洰褰曪級
- web/playwright-report/ 	est-results/ dist/ 娓呯悊
- shared/ 鏂板 package.json锛屾垚涓烘寮忔ā鍧?- server/package.json 淇鏂鐨?sync-version 寮曠敤
- .gitignore 琛ュ厖 web 娴嬭瘯浜х墿瑙勫垯

---

## v0.9.32 (2026-06-02)

### Fixed
- **闄嶄綆 runtimeMaxInstances 榛樿鍊?*锛氫粠 10 闄嶈嚦 2锛岄槻姝?2G 鍐呭瓨鏈嶅姟鍣?OOM锛堝彲閫氳繃鐜鍙橀噺瑕嗙洊锛?- **閮ㄧ讲鏇存柊娴佺▼澧炲姞鍥炴粴鏈哄埗**锛氭洿鏂?Demo 鏃跺厛澶囦唤鏃ф枃浠跺啀瑙ｅ帇锛岃В鍘嬪け璐ヨ嚜鍔ㄦ仮澶?
### Changed
- **鎻愬彇閲嶅宸ュ叿鍑芥暟**锛氭柊寤?server/src/lib/utils.js锛岀粺涓€ exists銆乻leep銆?ormatBytes锛屾秷闄?4 涓枃浠朵腑鐨勯噸澶嶅畾涔?
---

## v0.9.31 椤圭洰娓呯悊 (2026-06-02)

### 鏂囨。鏁村悎
- docs/product/ 10 涓?PPT 鏂囦欢鍚堝苟涓?1 涓?opc-pitch-deck.md
- samples/README.md 涓?DEMOS_SUMMARY.md 鍚堝苟
- 鍒犻櫎 ARCHITECTURE.md锛堝唴瀹瑰苟鍏?AGENTS.md锛?- 鍒犻櫎 ROADMAP.md锛堟柟鍚戝苟鍏?README.md锛屽巻鍙插湪 CHANGELOG锛?- OPERATIONS.md 骞跺叆 DEPLOYMENT.md
- README.md 绮剧畝锛屽幓闄や笌 AGENTS.md 鐨勯噸澶?
### 浠ｇ爜娓呯悊
- 鍒犻櫎 42 涓?_fix_*.py 璋冭瘯鑴氭湰
- 鍒犻櫎 cr-debug.mjs銆乧r-diag.mjs銆乨iag-test.mjs 璇婃柇鑴氭湰
- 鍒犻櫎 sync-version.js锛堜繚鐣?sync-version.ps1锛?- 鍒犻櫎 web/src/assets/vite.svg锛圴ite 妯℃澘娈嬬暀锛?- 鍒犻櫎 ssets/ 绌虹洰褰?- 鍒犻櫎 	ests/ 绌虹洰褰?
### 鏂囨。鏇存柊
- AGENTS.md锛歴ervices 21鈫?3銆乺outes 10鈫?1銆佹妧鏈€烘暟鎹洿鏂?- README.md锛氱簿绠€骞舵柊澧炲悗缁柟鍚?- web/README.md锛氶噸鍐欎负 DemoGo 鍓嶇璇存槑

---
## v0.9.25 (2026-06-01)

### Changed
- **import 璇彞褰掍綅**锛氬皢 v0.9.23鈥搗0.9.24 搴旀€ユ坊鍔犳椂鏁ｈ惤鍦ㄤ唬鐮佷腑閮ㄧ殑 2 鏉?import 绉昏嚦鏂囦欢椤堕儴锛屾仮澶嶄唬鐮佽鑼?
---

## v0.9.24 (2026-06-01)

### Fixed
- **绯荤粺鎬х己澶卞鍏ヤ慨澶?*锛氳ˉ鍏?`admin-helpers.js`锛坄createRuntimeConfigStatus`銆乣publicRuntimeEnv`銆乣runtimeEnvForDemo`锛夈€乣deploy-helpers.js`锛坄deploySourceLabel`銆乣normalizeDeploySource`锛夈€乣project-utils.js`锛坄isGenericProjectName`銆乣slugify`锛夌殑瀵煎叆
- **闆嗘垚娴嬭瘯 tar.gz 閮ㄧ讲閫氳繃**锛氫慨澶嶄簡閮ㄧ讲璺緞涓婄骇鑱旂己澶卞鍏ュ鑷寸殑绯诲垪 ReferenceError

### Known Issues
- 闆嗘垚娴嬭瘯 zip 閮ㄧ讲鍙楀椁愰厤棰濋檺鍒讹紙Free 1 涓湪绾块」鐩級锛屽睘娴嬭瘯鐜闂

---

## v0.9.23 (2026-06-01)

### Fixed
- **涓棿浠堕『搴忎慨澶?*锛歚express.json()` / `cookieParser()` / CSRF 绛変腑闂翠欢绉昏嚦璺敱娉ㄥ唽涔嬪墠锛屼慨澶?POST 璇锋眰 `req.body` 涓虹┖瀵艰嚧娉ㄥ唽/鐧诲綍 400 閿欒
- **ExpiryBadge Lint 淇**锛氭媶鍒?`ExpiryBadge.tsx`锛屽皢 `getDemoExpiryStatus` 鍜?`ExpiryStatus` 绉诲叆鐙珛鐨?`ExpiryUtils.tsx`
- **缂哄け瀵煎叆淇**锛氳ˉ鍏?`detectDeploySource`銆乣deploySourceLabel`銆乣cleanProjectName`銆乣isGenericProjectName`銆乣slugify` 绛夊嚱鏁扮殑 import

### Known Issues
- 闆嗘垚娴嬭瘯 tar.gz 閮ㄧ讲娴佺▼瑙﹀彂绾ц仈缂哄け瀵煎叆锛坄createRuntimeConfigStatus` 绛夛級锛岄渶鍦?v0.9.24 绯荤粺鎬ф壂鎻忎慨澶?
---
## v0.9.22 (2026-06-01)

### Changed
- **server.js 杩愯鏃舵娴嬪嚱鏁拌縼绉?*锛? 涓繍琛屾椂鍑芥暟杩佺Щ鍒?`runtime-service.js`锛宻erver.js -186 琛?- **server.js 褰掓。鍒嗘瀽鍑芥暟杩佺Щ**锛氬鍏?archive-analyzer.js 鐨?50 涓鍑哄嚱鏁帮紝鍒犻櫎 44 涓噸澶嶅唴鑱斿畾涔夛紝server.js -443 琛?- **build-service.js 鐙珛瀵煎嚭**锛氭彁鍙?`formatBytes` 鍜?`stripBom` 涓烘ā鍧楃骇瀵煎嚭锛屼慨澶?`routes/demos.js` 瀵煎叆澶辫触瀵艰嚧鏈嶅姟鍣ㄦ棤娉曞惎鍔ㄧ殑闂

### Added
- **project-classifier-service 鍗曞厓娴嬭瘯**锛?1 涓祴璇曠敤渚?
### Removed
- **鏍圭洰褰曢仐鐣欐枃浠舵竻鐞?*锛氬綊妗?8 涓复鏃惰剼鏈紝绉婚櫎 `.workbuddy/`銆乣artifacts/`

### Summary
- server.js: 4131 鈫?3510 琛岋紙-621 琛岋紝-15%锛夛紝娴嬭瘯: 120 鈫?131

---
## v0.9.21 (2026-06-01)

### Fixed
- **涓枃涔辩爜淇**锛氫慨澶?5 涓枃浠朵腑鍥犵紪鐮侀棶棰樺鑷寸殑涓枃鍐呭涓㈠け
  - `server/src/services/build-service.js`锛氫慨澶嶆瀯寤洪敊璇彁绀轰腑鏂?  - `server/src/services/failure-diagnosis-service.js`锛氫慨澶嶅け璐ヨ瘖鏂腑鏂囨彁绀?  - `server/src/lib/inspection-builder.js`锛氫慨澶嶇姸鎬佹爣绛句腑鏂?  - `server/src/server.js`锛氫慨澶嶅埌鏈熸彁閱掓棩蹇椾腑鏂?  - `CHANGELOG.md`锛氶噸鍐欏叏閮ㄤ腑鏂囧唴瀹?- 纭 58 涓枃浠朵腑鏂囩紪鐮佹甯革紝鍓嶆湡"绯荤粺鎬т贡鐮?鍒ゆ柇涓?PowerShell Get-Content 鏄剧ず闂

---

## v0.9.20 (2026-06-01)

### Changed
- **pre-deploy-check.ps1 浠?9 椤瑰崌绾т负 10 椤规鏌?*
  - 鏂板 TypeScript 妫€鏌ワ細`npx tsc --noEmit`
  - 鏂板鐗堟湰鍙蜂竴鑷存€ф鏌ワ細5 涓枃浠讹紙VERSION + server/cli/mcp/web锛?  - 鎻愮ず淇鍛戒护锛歚node scripts/sync-version.js`
- **AGENTS.md 鏂囨。鏇存柊**
  - 娴嬭瘯鏁伴噺浠?95 鏇存柊鍒?120
  - 鏈嶅姟鏁伴噺浠?15 鏇存柊鍒?21
  - 閮ㄧ讲鍓嶆鏌ラ」鏇存柊涓?10 椤?  - 鏂板鏋舵瀯鎽樿璇存槑

### Architecture Summary (v0.9.20)
- server.js: 4383 琛岋紙-39.2% vs v0.9.7锛?- 21 涓湇鍔℃ā鍧?+ 10 涓矾鐢辨ā鍧?- 120 涓祴璇曞叏閫氳繃锛? 澶辫触
- UserDashboard 2302 琛?+ AdminDashboard 402 琛?- 28 涓墠绔粍浠舵枃浠?- P2 鍟嗕笟鍖栧姛鑳藉畬澶囷紙鍒嗘瀽闈㈡澘 + 鍒版湡鎻愰啋锛?
---

## v0.9.19 (2026-06-01)

### Added
- **鐗堟湰鍙峰悓姝ュ伐鍏?* `scripts/sync-version.js`
  - 涓€閿悓姝?`VERSION` 鏂囦欢鍒?server/cli/mcp/web 鍥涗釜 `package.json`
  - 鏀寔 `node scripts/sync-version.js` 鎴?`npm run sync-version`锛堝湪 server/ 鐩綍涓嬶級
  - 鍐欏叆鍓嶈嚜鍔ㄥ浠藉師鏂囦欢锛岄槻姝㈡剰澶栬鐩?
### Changed
- 纭 `runtimeProcesses` 鎸佷箙鍖栧凡鍦?`runtime-service.js` 涓疄鐜?- 鏈嶅姟閲嶅惎鍚庡彲鎭㈠杩愯涓殑 Demo 瀹炰緥

### Fixed
- `runtime-service.js` 涓枃涔辩爜淇锛堣繍琛屽櫒鎻愮ず淇℃伅锛?- `build-service.js` 涓枃涔辩爜淇

---

## v0.9.18 (2026-06-01)

### Changed
- **AdminDashboard.tsx 缁勪欢鎷嗗垎**锛氬皢 24 涓鍥剧粍浠朵粠 AdminDashboard.tsx锛?714 琛岋級鎻愬彇鍒?`AdminPanels.tsx`
  - AdminDashboard.tsx 缂╁噺鑷?402 琛岋紙-79.2%锛?  - 鍖呭惈锛欰dminSidebar銆丄dminOverviewView銆丄dminTrialFunnel銆丄dminTaskBoard銆丄dminDemoList銆丄dminUsers 绛?
---

## v0.9.17 (2026-06-01)

### Added
- **build-service 鍗曞厓娴嬭瘯**锛? 涓祴璇曡鐩?formatBytes銆乻tripBom銆乪xplainBuildError銆乻anitizeBuildEnv銆乧ommandAvailable

### Fixed
- 纭 docs/ 鐩綍鏂囦欢涓?UTF-8 缂栫爜

---

## v0.9.16 (2026-06-01)

### Added
- **Demo 鍒版湡鎻愰啋**锛歚ExpiryBadge.tsx` 鍓嶇缁勪欢锛屾樉绀?Demo 鍒版湡鍊掕鏃?- 澶嶇敤宸叉湁 `demo-expiration-service.js` 鍚庣鏈嶅姟

---

## v0.9.15 (2026-06-01)

### Added
- **Demo 璁块棶鍒嗘瀽闈㈡澘**锛歚GET /api/demos/:id/analytics` + `AnalyticsPanel.tsx`
  - 灞曠ず姣忎釜 Demo 鐨勮闂噺銆佽闂秼鍔裤€佽澶?娴忚鍣ㄥ垎甯?  - 闈㈠悜闈炴妧鏈敤鎴凤細鏄剧ず"琚湅浜嗗灏戞 / 澶氬皯浜虹湅杩?

### Fixed
- **鍏抽敭 Bug**锛歞emos 璺敱缂哄皯 `createDeploymentJob`/`runDeploymentJob`/`publicDeploymentJob` 渚濊禆娉ㄥ叆

---

## v0.9.14 (2026-06-01)

### Changed
- **UserDashboard.tsx 缁勪欢鎷嗗垎**锛氭彁鍙?4 涓粍浠?  - `FeedbackPanel.tsx`锛氱敤鎴峰弽棣堥潰鏉?  - `FailureDiagnosisPanel.tsx`锛氬け璐ヨ瘖鏂潰鏉?  - `PlanRequestsTable.tsx`锛氬椁愬崌绾ц姹傝〃
  - `DeployHistory.tsx`锛氶儴缃插巻鍙茶褰?
---

## v0.9.13 (2026-06-01)

### Added
- **閮ㄧ讲浠诲姟 CRUD 娴嬭瘯**锛?7 涓祴璇曡鐩?deployment-job 鍏ㄧ敓鍛藉懆鏈?
---

## v0.9.12 (2026-06-01)

### Changed
- **build-service.js 鍒涘缓**锛氫粠 server.js 鎻愬彇 build/analytics/tracking 鐩稿叧鍑芥暟
  - 杩佺Щ鍑芥暟锛歜uildNodeProject銆乨etectBuildAndNormalizeOutput銆乫indPublishableOutput 绛?  - 宸ュ叿鍑芥暟锛歠ormatBytes銆乻tripBom銆乪xplainBuildError銆乻anitizeBuildEnv銆乧ommandAvailable

---

## v0.9.11 (2026-06-01)

### Changed
- **deployment-job-service.js 鍒涘缓**锛氫粠 server.js 鎻愬彇閮ㄧ讲浠诲姟 CRUD 鍜屾墽琛岄€昏緫

---

## v0.9.10 (2026-06-01)

### Fixed
- 璺敱娉ㄥ唽 bug 淇
- 澶氫釜闆嗘垚娴嬭瘯闂淇

---

## v0.9.7 (2026-05-31)

### Changed
- 璺敱鏋舵瀯娓呯悊锛氭墍鏈夎矾鐢辫縼绉诲埌 `routes/` 鐩綍锛岀粺涓€浣跨敤 `registerXxxRoutes(app, deps)` 妯″紡





