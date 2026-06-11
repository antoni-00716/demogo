## DemoGo 技术架构评估（基于阿里云 2C2G / 40GB 约束）

### 一、资源预算分析

在 2 核 2GB 的服务器上，DemoGo 实际运行着以下常驻进程：

| 进程 | 内存估算 | CPU 特征 |
|---|---|---|
| 操作系统（Linux） | 200-300 MB | 基本空闲 |
| Node.js 主进程（server.js） | 100-200 MB | API 请求时短暂峰值 |
| BullMQ 内进程 Worker | 包含在主进程中 | 部署时 CPU 密集 |
| MySQL | 200-400 MB | 写入时短暂峰值 |
| Redis | 30-80 MB | 极低 |
| Nginx | 10-20 MB | 极低 |
| **基础服务合计** | **约 550 MB - 1 GB** | — |

剩余可用内存约 1 - 1.45 GB，这部分需要分配给 Docker 容器（用户的 Node.js 运行时 demo）。

**关键矛盾：** 当前配置中 `runtimeMemory` 默认 512MB、`runtimeMaxInstances` 默认 2，这意味着两个运行时容器就可能消耗 1 GB。加上容器自身的 npm install / npm run build 过程（峰值内存可能超过 512MB 限制），在 2GB 总内存下非常容易导致 OOM kill。

**磁盘方面，** 40GB 大致分配如下：

| 用途 | 预估占用 |
|---|---|
| 操作系统 + 基础工具 | 3-5 GB |
| Docker 引擎 + node:20-alpine 镜像 | 1-2 GB |
| MySQL 数据文件 | 1-3 GB |
| Node.js server 的 node_modules | 300-500 MB |
| 用户项目（uploads + published demos） | 视用户量而定 |
| **基础占用合计** | **约 6-10 GB** |

留给用户项目和 Docker 构建缓存的空间大约 30 GB，短期内充裕，但需要主动管理过期数据。

---

### 二、架构方案的重新评估

#### 2.1 当前架构在 2C2G 上的合理性

**单实例单体架构在当前规格下是正确的选择。** 之前分析中提到的「内存态限流不支持多实例」、「运行时进程 Map 是全局状态」等问题，在单服务器单实例的场景下根本不是问题。2C2G 跑一个 Node.js 进程 + 一个 MySQL + 一个 Redis 已经比较紧凑，再去做分布式状态管理反而是在制造不必要的复杂度。

**MySQL + Redis + Node.js 三件套的资源开销在 2C2G 上刚好够用，** 但前提是 Docker 容器的数量和资源限制必须严格控制。当前的默认配置（runtimeMaxInstances=2, runtimeMemory=512m）需要下调。

**BullMQ 内进程 Worker 的设计是合理的。** server.js 在启动时内嵌了一个 BullMQ Worker（concurrency=1），而不是单独启动一个 worker 进程。这在 2C2G 上是明智的——节省了一个 Node.js 进程的内存开销。work/ 目录里虽然有独立的 demogo-worker.service 文件，但生产环境实际跑的是内进程模式。

#### 2.2 资源消耗热点分析

整个系统的资源消耗集中在三个环节：

**第一，前端项目构建（npm install + npm run build）。** 这是 CPU 和内存双重密集的操作。build-service.js 中 Docker 构建模式默认分配 512MB 内存和 1 个 CPU 核（`dockerMemory="512m"`, `dockerCpus="1"`），在 2C2G 上这意味着构建期间会占用服务器一半的 CPU 和相当一部分内存。如果构建过程中恰好有用户访问其他 demo，会明显卡顿。

**第二，Node.js 运行时容器。** runtime-service.js 的 Docker 容器同样默认 512MB 内存。更关键的是，容器启动时需要在内部执行 npm install + npm start，这个过程的内存峰值往往高于稳态运行。一个 Next.js 项目在 npm install 阶段轻松用到 400-500MB。

**第三，MySQL 全量替换写入。** 每次写入 demos 表时做 DELETE ALL + INSERT ALL。在 demo 数量较少（< 100）时对 2C2G 的影响可以忽略，但当 demo 数量增长后，频繁的表级锁和全量写入会对 MySQL 造成不必要的压力。

#### 2.3 架构方案的适配性判断

| 架构决策 | 2C2G 适配性 | 说明 |
|---|---|---|
| 单体 Express 应用 | 适合 | 单实例足够，省内存 |
| 内进程 BullMQ Worker | 适合 | 不需要额外进程 |
| MySQL 作为主存储 | 可接受 | 当前数据量下全量替换影响不大 |
| JSON 文件作为备用存储 | 可接受 | 开发模式方便，生产已切 MySQL |
| Docker 运行时隔离 | 需要调优 | 默认参数过高 |
| Docker 构建隔离 | 需要调优 | 默认参数过高，且无并发控制 |
| Nginx 反向代理 + 静态托管 | 适合 | 静态文件直接 Nginx 返回，极轻 |
| 内存态限流和状态 | 适合 | 单实例场景下完全够用 |
| systemd 管理主进程 | 适合 | 轻量、可靠 |

---

### 三、当前应该改什么（按优先级排列）

#### 优先级 1：资源参数调优（改配置，不动架构，1-2 小时）

这是投入产出比最高的改动，直接降低 OOM 风险。

**运行时容器参数下调：**

```
# 当前默认值（config.js）
DEMOGO_RUNTIME_MEMORY=512m      → 建议改为 256m
DEMOGO_RUNTIME_CPUS=1           → 建议改为 0.5
DEMOGO_RUNTIME_MAX_INSTANCES=2  → 保持 2 不变（已经合理）
DEMOGO_RUNTIME_TTL_MINUTES=120  → 建议改为 60（加快资源回收）
```

256MB 对大多数 Express/Koa/Hono 应用足够，Next.js/Nuxt 的 SSR 项目可能需要调高到 384MB，但 512MB 在 2G 内存的服务器上实在太奢侈。TTL 从 120 分钟缩到 60 分钟可以更快释放不再被访问的容器。

**构建容器参数下调：**

```
# 当前默认值（config.js）
DEMOGO_BUILD_DOCKER_MEMORY=512m → 建议改为 384m
DEMOGO_BUILD_DOCKER_CPUS=1      → 建议改为 0.75
DEMOGO_BUILD_TIMEOUT_SECONDS=180 → 保持 180 不变
```

构建时 384MB 对大多数前端项目足够。降低 CPU 份额可以让构建过程和其他请求共享 CPU，不至于构建期间完全阻塞。

**MySQL 内存优化（在 MySQL 配置中）：**

```ini
# 建议的 MySQL 配置（在 2G 服务器上）
innodb_buffer_pool_size = 256M   # 默认通常是 128M 或 1G，256M 对当前够用
innodb_log_file_size = 48M
max_connections = 30              # 不需要默认的 151
table_open_cache = 200
```

**增加 swap 空间：**

```bash
# 如果还没有 swap，建议创建 1-2GB
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Swap 是 2GB 内存的安全网，当突发内存峰值时可以避免 OOM killer 直接杀掉 MySQL 或 Node.js。

#### 优先级 2：构建和运行时的并发控制（改代码，半天到一天）

当前代码有一个隐患：构建和运行时启动没有全局并发控制。如果两个用户同时提交部署，两个 Docker 构建容器会同时跑，各自消耗 384-512MB 内存 + 1 个 CPU 核。在 2C2G 上这几乎必定触发 OOM。

**需要加一个全局信号量：**

在 build-service.js 和 runtime-service.js 中引入一个简单的并发控制，确保同一时刻最多只有一个 Docker 构建或运行时启动操作在执行。第二个请求进入队列等待，而不是立即启动第二个容器。

```javascript
// 一个简单的并发锁示例（可以直接放在 config.js 或一个独立工具中）
let activeDockerOperations = 0;
const MAX_CONCURRENT_DOCKER = 1; // 在 2C2G 上同一时刻只跑一个 Docker 操作

export async function withDockerSlot(fn) {
  while (activeDockerOperations >= MAX_CONCURRENT_DOCKER) {
    await new Promise(r => setTimeout(r, 500));
  }
  activeDockerOperations++;
  try {
    return await fn();
  } finally {
    activeDockerOperations--;
  }
}
```

然后在 `buildNodeProjectInDocker` 和 `startDockerRuntime` 中用 `withDockerSlot()` 包裹 Docker 操作。这个改动很小但能避免最危险的 OOM 场景。

#### 优先级 3：修复已知 bug（半天）

**shared 模块的 getProjectDetails 函数截断。** 在 `shared/lib/core.js` 第 292 行，函数声明不完整，运行时会报语法错误。CLI 的 `printDeployResult` 依赖这个函数来展示部署后的运行时信息。要么补完这个函数，要么在 CLI 中移除对它的调用。

**server.js 中文乱码。** 第 672 行等处中文字符串显示为乱码（如 `"请上传 .zip、.tar.gz 或 .tgz 项目包"` 变成了不可读字符）。这些是用户可见的错误提示，乱码会直接影响用户体验。需要统一文件编码为 UTF-8 并修复受影响的字符串。

#### 优先级 4：过期数据清理优化（改代码，半天）

当前的 cleanup-service.js 每 6 小时清理一次超过 24 小时的临时文件。在 40GB 硬盘上，这不够积极。建议增加以下清理策略：

**已下线 demo 的文件清理：** 当一个 demo 被删除或过期下线时，应该同步清理其对应的发布目录（`/var/www/demogo-preview/d/{slug}`）和上传压缩包。当前 `expireDemos()` 函数只是更新状态，不删除文件。

**Docker 镜像和容器清理：** 在服务器上定期运行 `docker system prune -f`，清理已停止的容器和悬空镜像。可以作为 cleanup-service.js 的一个步骤，或者在服务器的 crontab 中每天执行一次。

**过期 demo 数据库清理：** 当 demo 过期或被删除时，对应的 MySQL demo 数据库（`demogo_demo_xxx`）也应该被 DROP 掉。当前 `deleteDemoDatabase` 函数有这个能力，但需要确保在 demo 过期时也被调用。

#### 优先级 5：MySQL 写入模式优化（改代码，1-2 天）

虽然全量替换在当前数据量下影响不大，但考虑到 2C2G 的 MySQL 资源有限，建议做一次针对性优化，重点改写入频率最高的两张表：

**demos 表：** 这是写入最频繁的表（每次部署、每次状态变更都会触发全量替换）。改为 `INSERT ... ON DUPLICATE KEY UPDATE`，每次只更新变更的那一行。这一个改动就能消除绝大部分的 MySQL 写入压力。

**sessions 表：** 每次用户登录创建 session 都会触发全量替换。改为增量插入，过期 session 通过定时任务清理。

其他表（users、forms、feedback 等）在当前数据量下可以保持现状。

#### 优先级 6：提取 server.js 中的部署核心逻辑（改代码，2-3 天）

`performCreateDeployment` 和 `performUpdateDeployment` 合计约 770 行代码仍在 server.js 中，这是可维护性最大的瓶颈。建议提取为 `deployment-pipeline-service.js`，使 server.js 回到纯粹的「路由注册 + 中间件组装 + 启动初始化」职责。

这个改动不涉及功能变化，纯粹是代码组织优化，但对后续的维护和测试覆盖提升至关重要。

#### 优先级 7：CI 补全（改配置，1-2 小时）

在 GitHub Actions 中加入 `test:integration` 和 `test:smoke` 步骤。v0.9.4 事故的教训是跳过集成测试导致缺 start 脚本和导出错误，这个问题应该在 CI 层面彻底解决。

---

### 四、不建议现在做的事

基于 2C2G 的现实约束，以下改动在当前阶段投入产出比不高，建议暂缓：

**MySQL 全量替换 → 增量操作的全面改造。** 只对 demos 和 sessions 两张高频表做优化即可，其他表保持现状。全面改造需要改 mysql-store.js 的大量代码，在数据量小的情况下收益有限。

**后端 TypeScript 迁移。** 有价值但不紧急。可以先在前端已有的 TypeScript 基础上，给 shared 模块和核心数据结构加 JSDoc 类型注释作为过渡。

**多实例/分布式状态迁移。** 在 2C2G 单机上跑单实例是完全正确的，不需要为此引入 Redis 分布式锁或把内存状态外移。

**大文件拆分（runtime-service.js、project-classifier-service.js 等）。** 这些文件虽然偏大（30-37KB），但内部逻辑内聚性还不错，拆分不会带来直接的功能或性能提升，可以放到后续版本中逐步进行。

**引入 CDN 或对象存储。** 在用户量和 demo 数量还没上来之前，Nginx 直接服务静态文件在 2C2G 上完全够用。阿里云 OSS + CDN 可以等到有性能瓶颈时再引入。

---

### 五、总结

DemoGo 的技术架构在 2C2G 约束下整体是合理的——单体应用 + 内进程 Worker + Nginx 静态托管的组合足够轻量。最紧迫的问题不是架构层面的，而是运行参数层面的：Docker 容器资源限制过高、缺少构建并发控制、缺少 swap 保护。这几个配置级别的改动可以在几个小时内完成，直接消除 OOM 风险。

接下来的改进路线建议是：资源调优（小时级）→ 并发控制（天级）→ bug 修复（天级）→ 过期清理（天级）→ MySQL 热点表优化（天级）→ 代码提取重构（周级）→ CI 补全（小时级，可并行）。
