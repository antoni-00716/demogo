# DemoGo OPC 比赛 PPT 章节规划

## Page 1: 封面
- **Page Type**: Cover
- **Page Title**: DemoGo
- **Page Subtitle**: AI编程产物一键发布与试用平台
- **Content Structure**: 主标题 + 副标题 + 项目负责团队信息
- **Selected Template**: (待填充)

## Page 2: 目录
- **Page Type**: TOC
- **Page Title**: 汇报提纲
- **Content Structure**: 
  1. 项目背景与痛点
  2. 解决方案与产品
  3. 市场分析与竞品
  4. 商业模式与财务
  5. 团队与规划
- **Selected Template**: (待填充)

## Page 3: 项目背景
- **Page Type**: Content
- **Page Title**: 项目背景
- **Page Subtitle**: AI编程时代的"最后一公里"
- **Content Structure**: 
  - **AI编程工具爆发式增长**：2024-2026年，Codex、Cursor、Claude Code、Trae等工具让数千万非技术用户能用自然语言生成软件产品。
  - **新的瓶颈出现**：AI做出来的网页、原型、应用，如何让他人打开试用？非技术用户不会部署、不懂域名、不知如何分享。
  - **市场空白**：Vercel、Netlify面向专业开发者，国内缺乏面向"AI编程产物"的专用发布平台。DemoGo 精准切入这一空白。
- **Content Density**: Medium (3个要点)
- **Narrative Role**: 建立行业背景，引出项目必要性

## Page 4: 项目痛点
- **Page Type**: Content
- **Page Title**: 核心痛点
- **Page Subtitle**: 非技术用户的四大难题
- **Content Structure**: 
  - **不会部署**：AI 生成了项目，但用户不懂服务器、Nginx、域名配置
  - **无法分享**：只能发截图、录屏、压缩包，无法让他人实际体验交互
  - **不知问题**：项目发布后表单不收集、API不运行，用户不知道为什么
  - **不做反馈**：试用后缺少数据回收渠道，无法验证产品价值
- **Content Density**: Medium (4个痛点)
- **Narrative Role**: 具象化用户困境，为解决方案做铺垫

## Page 5: 解决方案
- **Page Type**: Content
- **Page Title**: 解决方案
- **Page Subtitle**: 从代码到链接，一步到位
- **Content Structure**: 
  - **一键发布**：上传项目包或通过AI工具直接发布，自动完成检测、构建、部署
  - **智能识别**：17种项目类型自动识别，自动路由到静态/构建/运行时托管模式
  - **安全发布**：内容安全审查 + 敏感文件拦截 + 发布前体检报告
  - **数据回收**：自动表单收集 + 访问统计 + 试用数据闭环
  - **AI集成**：CLI/MCP/Skill/API 四层集成，AI工具可直接调用发布能力
- **Content Density**: Medium (5个要点)
- **Narrative Role**: 展示 DemoGo 如何系统性解决痛点

## Page 6: 产品架构
- **Page Type**: Content
- **Page Title**: 产品架构
- **Page Subtitle**: 三端 + 四层 AI 集成
- **Content Structure**: 
  - **三端结构**：官网首页（获客）→ 用户工作台（发布管理）→ 运营管理后台（数据运营）
  - **四层 AI 集成**：Agent API → CLI 命令行工具 → MCP Server → Codex Skill，覆盖所有主流 AI 编程工具
  - **三级托管模式**：静态页面托管 → 前端源码构建 → Node.js + Docker 运行时环境
  - **技术栈**：React 19 + Vite 8 + Node.js Express + MySQL + Docker + Nginx
- **Content Density**: Medium (4个要点)
- **Narrative Role**: 全景展示产品技术体系

## Page 7: 核心创新
- **Page Type**: Content
- **Page Title**: 核心技术创新
- **Page Subtitle**: 四大技术突破
- **Content Structure**: 
  - **多层级项目识别引擎**：静态分析 + 依赖图谱 + 框架特征，自动识别17种项目类型
  - **自适应托管路由系统**：根据识别结果自动路由到静态/构建/运行时模式
  - **Docker 隔离运行时管理**：自动创建容器、分配端口、注入环境变量、TTL 自动回收资源
  - **MySQL 试用数据库自动分配**：按需创建隔离数据库和用户，注入连接信息，项目删除自动清理
- **Content Density**: Medium (4个要点)
- **Narrative Role**: 展示技术壁垒和差异化能力

## Page 8: 数据验证
- **Page Type**: Content
- **Page Title**: 数据验证
- **Page Subtitle**: 产品已上线运行
- **Content Structure**: 
  - **平台已上线**：域名 https://demogo.cn，ICP 备案完成，系统稳定运行
  - **CLI 已发布**：@demogo-cn/cli@0.5.0 已发布 npm，支持 npx 一键发布
  - **功能验证**：注册登录、邮箱验证码、项目发布、Node.js运行、MySQL数据库等全链路测试通过
  - **安全基线**：内容安全审查12类规则、敏感文件拦截、fail-closed 策略
  - **储备能力**：项目识别覆盖 17 种类型，MCP/Skill 已交付
- **Content Density**: Medium (5个要点)
- **Narrative Role**: 用数据证明项目不仅停留在概念阶段

## Page 9: 市场分析
- **Page Type**: Content
- **Page Title**: 市场分析
- **Page Subtitle**: 快速增长的市场需求
- **Content Structure**: 
  - **AI编程用户基数**：全球数千万 AI 编程工具用户，国内数百万非技术用户通过 AI 生成项目
  - **部署服务市场**：Vercel 估值超 25 亿美元，Netlify 估值 20 亿美元，市场已验证
  - **差异化空间**：现有平台面向开发者，DemoGo 面向"非技术用户 + AI 工具"，是增量市场
  - **增长驱动力**：AI 编程工具渗透率持续提升，非技术用户创作需求持续爆发
- **Content Density**: Medium (4个要点)
- **Narrative Role**: 证明市场空间和增长潜力

## Page 10: 竞品分析
- **Page Type**: Content
- **Page Title**: 竞品分析
- **Page Subtitle**: 差异化定位清晰
- **Content Structure**: 
  - **Vercel/Netlify**：面向专业开发者，需要 Git/CLI 操作，无 AI 工具集成；DemoGo 面向非技术用户，与 AI 工具深度集成
  - **Railway/Render**：完整云平台，支持多种后端；DemoGo 聚焦试用场景，轻量快速
  - **自建服务器/国内云厂商**：需要运维能力，门槛高；DemoGo 零运维，一键发布
  - **核心优势**：面向非技术用户表达 + 与 AI 编程工具生态深度耦合 + 国内可访问
- **Content Density**: Medium (4个要点)
- **Narrative Role**: 证明差异化定位和竞争壁垒

## Page 11: 知识产权
- **Page Type**: Content
- **Page Title**: 知识产权
- **Page Subtitle**: 核心技术自主可控
- **Content Structure**: 
  - **自主技术体系**：项目识别引擎、托管路由系统、运行时管理器、数据库分配器均为自主研发
  - **开源组件合规使用**：基于 MIT/Apache 2.0 许可的开源框架（Express、React、MySQL2、unzipper、tar 等）
  - **域名与备案**：demogo.cn 域名已注册，ICP 备案号鄂ICP备2026023999号
  - **npm 包发布**：@demogo-cn/cli 已在 npm 公开发布
  - **代码保护**：核心算法和服务端代码私有限制访问
- **Content Density**: Medium (5个要点)
- **Narrative Role**: 证明技术自主性和合规性

## Page 12: 商业模式
- **Page Type**: Content
- **Page Title**: 商业模式
- **Page Subtitle**: 三级套餐 + 生态增值
- **Content Structure**: 
  - **Free 套餐**：1个在线项目、3次月发布、7天有效期 — 免费引流，降低试用门槛
  - **Lite 套餐**：3个在线项目、20次月发布、30天有效期、自定义链接后缀 — 个人创作者
  - **Pro 套餐**：10个在线项目、60次月发布、30天有效期、申请二级域名 — 小型团队和重度用户
  - **未来增值**：企业级私有部署、生态合作分成、开放平台 API 调用计费
- **Content Density**: Medium (4个要点)
- **Narrative Role**: 展示清晰的商业变现路径

## Page 13: 财务预测
- **Page Type**: Content
- **Page Title**: 财务预测
- **Page Subtitle**: 三年发展目标
- **Content Structure**: 
  - **第一年**（验证期）：获取 500+ 注册用户，50+ 付费用户，验证产品市场匹配；收入：套餐订阅约 3-5 万元
  - **第二年**（增长期）：用户规模达 3000+，付费转化率 8-10%；收入：套餐订阅约 30-50 万元
  - **第三年**（扩展期）：开放企业级服务，生态合作；收入：套餐+企业约 100-200 万元
  - **成本结构**：服务器成本（阿里云 ECS）约 5千/年，后续随用户增长增加带宽和存储成本
- **Content Density**: Medium (4个要点)
- **Narrative Role**: 展示清晰的增长预期和可控的成本结构

## Page 14: 融资需求
- **Page Type**: Content
- **Page Title**: 融资需求
- **Page Subtitle**: 用于产品加速和市场推广
- **Content Structure**: 
  - **融资金额**：50-100 万元（天使轮）
  - **资金用途**：40% 产品研发（运行态增强、数据库能力扩展），30% 市场推广（内容营销、社区运营），20% 基础设施（服务器扩容、安全加固），10% 运营储备
  - **预期里程碑**：12 个月内用户达 3000+，付费用户 100+，完成从静态到完整应用的部署能力覆盖
  - **退出策略**：被 AI 编程工具厂商收购、或被云平台整合、或独立发展至 A 轮
- **Content Density**: Medium (4个要点)
- **Narrative Role**: 清晰的资金用途和预期回报

## Page 15: 团队成员
- **Page Type**: Content
- **Page Title**: 团队成员
- **Page Subtitle**: 跨界融合的专业团队
- **Content Structure**: 
  - **项目负责人**：10年IT咨询经验，专注数字化转型与数据资产化，AI重度用户，运营个人技术公众号
  - **核心能力组合**：产品判断力 + AI应用经验 + 技术架构理解 + 市场洞察
  - **顾问资源**：数据交易所行业背景，企业数字化转型咨询网络
  - **开发模式**：AI辅助开发，快速迭代验证，一人企业方法论
- **Content Density**: Medium (4个要点)
- **Narrative Role**: 展示团队能力与项目匹配度

## Page 16: 资质荣誉
- **Page Type**: Content
- **Page Title**: 资质荣誉
- **Page Subtitle**: 合规运营与行业认可
- **Content Structure**: 
  - **ICP 备案**：鄂ICP备2026023999号，合规运营
  - **域名注册**：demogo.cn 正式域名
  - **npm 发布**：@demogo-cn/cli 公开发布
  - **参赛荣誉**：OPC 大赛参赛项目
- **Content Density**: Light (4个要点)
- **Narrative Role**: 补充资质证明

## Page 17: 结束页
- **Page Type**: Ending
- **Page Title**: 感谢聆听
- **Page Subtitle**: DemoGo — 让产品先被看见
- **Content Structure**: 
  - 感谢评委
  - 联系方式
  - 官网：https://demogo.cn
- **Selected Template**: (待填充)
