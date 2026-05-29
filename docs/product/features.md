# PPT Outline

## Overview
DemoGo OPC比赛PPT，17页，采用 SCQA 故事结构 + Tech 科技风格。从行业背景切入，展示 DemoGo 作为"AI编程产物一键发布平台"的项目价值、技术创新和商业前景。

## Outline Content

## Page 1: 封面
- **Page Type**: Cover
- **Page Title**: DemoGo
- **Page Subtitle**: AI编程产物一键发布与试用平台

## Page 2: 目录
- **Page Type**: TOC
- **Page Title**: 汇报提纲
- **Content Structure**: 项目背景与痛点 / 解决方案与产品 / 技术创新 / 市场分析 / 商业模式 / 团队与财务

## Page 3: 项目背景
- **Page Type**: Content
- **Page Title**: 项目背景
- **Page Subtitle**: AI编程时代的"最后一公里"
- **Content Structure**: AI编程工具爆发式增长，2024-2026年Codex/Cursor/Claude Code等工具让数千万非技术用户能用自然语言生成软件产品。新瓶颈出现：AI做出来的网页、原型、应用如何让他人打开试用？非技术用户不会部署、不懂域名配置。Vercel/Netlify面向专业开发者，国内缺乏面向AI编程产物的专用发布平台。

## Page 4: 核心痛点
- **Page Type**: Content
- **Page Title**: 核心痛点
- **Page Subtitle**: 非技术用户面临的四大难题
- **Content Structure**: 不会部署：AI生成项目但不懂服务器和域名配置。无法分享：只能发截图录屏，无法让他人实际体验交互。不知问题：项目发布后表单不收集、API不运行，用户不知道为什么。不做反馈：试用后缺少数据回收渠道，无法验证产品价值。

## Page 5: 解决方案
- **Page Type**: Content
- **Page Title**: 解决方案
- **Page Subtitle**: DemoGo — 从代码到链接，一步到位
- **Content Structure**: 一键发布：上传项目包或通过AI工具直接发布，自动完成检测构建部署。智能识别：17种项目类型自动识别，自动路由到静态/构建/运行时托管模式。安全发布：12类内容安全审查规则，敏感文件拦截，fail-closed策略。AI深度集成：CLI/MCP/Skill/API四层集成体系，覆盖所有主流AI编程工具。

## Page 6: 产品架构
- **Page Type**: Content
- **Page Title**: 产品架构
- **Page Subtitle**: 三端 + 四层 + 三级托管
- **Content Structure**: 三端结构：官网首页获客转化 → 用户工作台发布管理 → 运营管理后台数据运营。四层AI集成：Agent API → CLI命令行 → MCP Server → Codex Skill，层层递进。三级托管模式：静态页面托管 → 前端源码构建 → Node.js + Docker运行时。技术栈：React 19 + Vite 8 + Express + MySQL + Docker + Nginx。

## Page 7: 核心技术创新
- **Page Type**: Content
- **Page Title**: 核心技术创新
- **Page Subtitle**: 四项自主研发能力
- **Content Structure**: 多层级项目识别引擎：静态分析 + 依赖图谱 + 框架特征，自动识别17种项目类型。自适应托管路由系统：根据识别结果自动路由到静态/构建/运行时模式。Docker隔离运行时管理：自动创建容器、分配端口、注入环境变量、TTL自动回收。MySQL试用数据库自动分配：按需创建隔离数据库和用户，项目删除时自动清理。

## Page 8: 产品验证
- **Page Type**: Content
- **Page Title**: 产品验证
- **Page Subtitle**: 已上线运行，核心指标达标
- **Content Structure**: 平台已上线：域名 https://demogo.cn（ICP备案），系统稳定运行。v0.5.0已发布：Node.js运行时+MySQL数据库线上开启。CLI已发布：@demogo-cn/cli@0.5.0 已在npm公开发布，npx一键发布验证通过。全链路测试通过：注册登录、邮箱验证、项目发布、内容审查、Node运行、MySQL分配。

## Page 9: 市场分析
- **Page Type**: Content
- **Page Title**: 市场分析
- **Page Subtitle**: AI编程生态的快速增长红利
- **Content Structure**: AI编程用户基数：全球数千万用户，国内数百万非技术用户通过AI生成项目。部署服务市场已验证：Vercel估值超25亿美元，Netlify估值20亿美元。差异化定位：现有平台面向开发者，DemoGo面向非技术用户+AI工具生态，切入增量市场。增长驱动力：AI编程工具渗透率持续提升，非技术创作需求持续爆发。

## Page 10: 竞品分析
- **Page Type**: Content
- **Page Title**: 竞品分析
- **Page Subtitle**: 明确的差异化竞争壁垒
- **Content Structure**: vs Vercel/Netlify：面向专业开发者，需要Git/CLI；DemoGo面向非技术用户+AI工具原生集成。vs Railway/Render：完整云平台；DemoGo聚焦试用验证场景，更轻量快速。vs 国内云厂商：需要运维能力；DemoGo零运维一键发布。核心优势：非技术用户表达 + AI工具生态深度耦合 + 国内可访问 + 项目智能识别。

## Page 11: 知识产权
- **Page Type**: Content
- **Page Title**: 知识产权
- **Page Subtitle**: 核心技术自主可控
- **Content Structure**: 自主技术体系：项目识别引擎、托管路由系统、运行时管理器、数据库分配器均为自主研发。合规开源使用：基于MIT/Apache2许可的开源框架。域名与备案：demogo.cn已注册，鄂ICP备2026023999号。npm公开发布：@demogo-cn/cli。代码保护：核心算法和服务端代码私有限制访问。

## Page 12: 商业模式
- **Page Type**: Content
- **Page Title**: 商业模式
- **Page Subtitle**: Freemium + 生态增值
- **Content Structure**: Free套餐：1个项目、3次月发布、7天有效期，免费引流降低门槛。Lite套餐：3个项目、20次月发布、30天有效期、自定义链接后缀。Pro套餐：10个项目、60次月发布、申请二级域名权益。未来增值：企业级私有部署、生态合作分成、开放平台API调用计费。

## Page 13: 财务预测
- **Page Type**: Content
- **Page Title**: 财务预测
- **Page Subtitle**: 三年发展规划
- **Content Structure**: 第一年验证期：获取500+注册用户，50+付费用户，收入3-5万元。第二年增长期：用户规模达3000+，付费转化率8-10%，收入30-50万元。第三年扩展期：开放企业级服务，生态合作收入100-200万元。成本可控：服务器成本约5千/年，随用户增长线性增加。

## Page 14: 融资需求
- **Page Type**: Content
- **Page Title**: 融资需求
- **Page Subtitle**: 加速产品迭代与市场推广
- **Content Structure**: 融资金额：50-100万元天使轮。资金用途：40%产品研发、30%市场推广、20%基础设施、10%运营储备。预期里程碑：12个月内用户3000+，付费用户100+，完成完整应用部署能力覆盖。退出策略：被AI编程工具厂商收购或独立发展至A轮。

## Page 15: 团队成员
- **Page Type**: Content
- **Page Title**: 团队成员
- **Page Subtitle**: 跨界融合的专业力量
- **Content Structure**: 项目负责人：10年IT咨询经验，专注数字化转型与数据资产化，AI重度用户。核心能力：产品判断力 + AI应用经验 + 技术架构理解 + 市场洞察。行业资源：数据交易所行业背景，企业数字化转型咨询网络。开发模式：AI辅助开发快速迭代，一人企业方法论验证。

## Page 16: 资质荣誉
- **Page Type**: Content
- **Page Title**: 资质荣誉
- **Page Subtitle**: 合规运营与行业认可
- **Content Structure**: ICP备案：鄂ICP备2026023999号，合规运营。域名注册：demogo.cn正式域名。npm公开发布：@demogo-cn/cli已发布npm。参赛项目：OPC大赛参赛项目。

## Page 17: 结束页
- **Page Type**: Ending
- **Page Title**: 感谢聆听
- **Page Subtitle**: DemoGo — 让产品先被看见

## Design Style
Tech 科技风格，深蓝 + 青蓝配色为主色调，Montserrat + Noto Sans SC 字体组合，白色/浅灰背景，现代简洁。
