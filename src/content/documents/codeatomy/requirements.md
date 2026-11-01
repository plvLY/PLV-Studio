---
title: "产品需求"
type: "requirements"
version: "v0.1"
updatedAt: "2026-10-29"
summary: "PLV Codeatomy v0.1 产品需求文档，定义目标用户、核心功能与验收标准。"
---

## 1. 产品目标

PLV Codeatomy 是本地 CLI 工具 + 单文件报告 + MCP Server，把 Java 项目的**结构、入口、调用链和隐式耦合**整理成一份可核查的本地索引，供人和 AI 共同回答两个核心问题：

1. **这个接口/任务是怎么跑起来的？**
2. **我改这个方法，还会影响哪些入口、AOP、配置、SQL 和测试？**

## 2. 目标用户

### 2.1 主要用户

1. **新接手 Java 项目的后端开发者**
   - 需要快速理解项目结构和核心流程
   - 时间成本：从拿到仓库到能解释一个核心业务流程，时间显著减少

2. **阅读开源 Java 项目的开发者**
   - 需要理解陌生项目的架构和调用关系
   - 场景：代码审查、学习借鉴、问题排查

3. **使用 AI 工具修改 Java 代码的开发者**
   - 需要 AI 了解完整的上下文和影响面
   - 工具：Claude Code、Cursor 等 AI 编程助手

4. **需要交接文档的小团队维护者**
   - 需要生成可验证的项目文档
   - 场景：项目交接、团队协作

### 2.2 用户能力要求

- 能运行 Maven 3.9+
- 能使用命令行工具
- 了解 Java 基础和 Spring 框架
- v0.1 不为非技术用户做图形化安装器

## 3. 核心功能

### 3.1 用户可见能力

| 能力 | 命令 | 说明 |
|---|---|---|
| 扫描项目 | `codemap scan` | 识别 Maven 模块、源码、classpath，生成索引 |
| 项目概览 | `codemap info` | 模块数、类型数、入口数、未解析数、扫描告警 |
| 模块地图 | `codemap modules` | Maven 模块及内部依赖 |
| 入口清单 | `codemap entrypoints` | HTTP / 定时 / MQ / 事件 / Runner / Feign |
| 流程查看 | `codemap flow` | 从一个入口出发，展示 Controller → Service → Repository/Mapper → 表 |
| 影响分析 | `codemap impact` | 一个方法的上游入口、AOP、配置、SQL、测试、风险标记 |
| 报告 | `codemap report` | Markdown / 单文件 HTML |
| AI 集成 | `codemap mcp` | MCP stdio，供 Claude Code / Cursor 调用 |
| 诊断 | `codemap doctor` | 检查 Java/Maven/索引状态，给出修复建议 |

### 3.2 核心场景

#### 场景1：项目上手
**用户**：新接手项目的开发者  
**目标**：快速理解核心业务流程  
**流程**：
```bash
# 1. 扫描项目
codemap scan /path/to/project

# 2. 查看项目概览
codemap info

# 3. 列出所有 HTTP 入口
codemap entrypoints --kind HTTP

# 4. 查看核心流程
codemap flow "GET /api/orders/{id}"

# 5. 生成报告
codemap report > project-overview.md
```

#### 场景2：代码变更影响分析
**用户**：修改代码的开发者  
**目标**：预判变更的完整影响范围  
**流程**：
```bash
# 1. 定位要修改的方法
codemap impact "com.example.OrderService#cancelOrder"

# 2. 查看影响范围：
#    - 上游入口点
#    - AOP 切面
#    - 配置绑定
#    - 相关 SQL
#    - 关联测试

# 3. 确认修改范围，避免漏改
```

#### 场景3：AI 编程增强
**用户**：使用 AI 工具的开发者  
**目标**：为 AI 提供准确的代码上下文  
**流程**：
```bash
# 启动 MCP 服务器
codemap mcp

# AI 工具通过 MCP 获取上下文：
# - get_flow: 获取入口到数据层的调用链
# - analyze_impact: 分析方法的影响面
# - get_context_pack: 获取裁剪后的上下文包
```

## 4. 功能详述

### 4.1 扫描功能

#### 4.1.1 Maven 模块解析
- 支持多模块 Maven 项目
- 递归读取 POM 树，继承 `groupId` / `version`
- 处理 `<modules>`、`<packaging>`、`<properties>`
- 识别内部模块依赖 vs 外部依赖

#### 4.1.2 Classpath 解析
- 使用 `mvn dependency:build-classpath` 生成真实 classpath
- 多模块 reactor 下汇总所有模块 classpath
- 按 POM 内容 hash 缓存，支持 `--offline` 模式
- 失败时降级 `NOCLASSPATH`，继续扫描

#### 4.1.3 源码发现
- 主源码：`src/main/java`
- 测试源码：`src/test/java`（`--include-tests` 时包含）
- 资源：`src/main/resources`
- 跳过：`target/`、`build/`、`.git/`、`node_modules/`

#### 4.1.4 Spoon 模型构建
- 构建 `CtModel` 带类型信息
- 支持跨模块类型解析
- 处理嵌套类、匿名类、局部类
- 失败时按模块重试，仍失败则标记

### 4.2 分析功能

#### 4.2.1 类型分析
- 识别 `CLASS/INTERFACE/ENUM/ANNOTATION/RECORD`
- 自动分层：`CONTROLLER/SERVICE/REPOSITORY/ENTITY/CONFIG/ASPECT`
- Bean 识别：`@Component/@Service/@Repository/@Controller` 等

#### 4.2.2 调用边分析
- 直接调用：`method1() -> method2()`
- 接口分派：`Interface.method()` -> `Impl.method()`
- 外部调用：JDK、Spring、第三方库
- 反射调用：识别并标记 `UNRESOLVED`

#### 4.2.3 入口识别
- **HTTP**：`@RestController` + `@RequestMapping` 系列
- **定时任务**：`@Scheduled` / `@Schedules`
- **MQ 监听**：`@KafkaListener`、`@RabbitListener` 等
- **事件监听**：`@EventListener`、`ApplicationListener`
- **启动任务**：`CommandLineRunner`、`ApplicationRunner`
- **Feign 客户端**：`@FeignClient` 接口方法
- **主方法**：`public static void main(String[])`

#### 4.2.4 隐式行为分析
- **事务**：`@Transactional` 的传播行为、隔离级别
- **缓存**：`@Cacheable/@CachePut/@CacheEvict` 的配置
- **异步**：`@Async` 的执行器配置
- **安全**：`@PreAuthorize/@PostAuthorize` 的权限表达式
- **校验**：`@Validated/@Valid` 的校验组

### 4.3 查询功能

#### 4.3.1 Flow 查询
**输入**：
- 入口 ID 或选择器（HTTP 路径、方法 FQN）
- 深度参数（默认 6）
- 包含外部调用、测试等选项

**输出**：
- 从入口到数据层的完整调用链
- 每个节点的三态标记和证据位置
- 可视化的路径展示（文本/JSON）

#### 4.3.2 Impact 查询
**输入**：
- 方法 ID 或 FQN
- 最大深度（默认 3）
- 影响类型过滤

**输出**：
- **上游调用者**：直接和间接调用该方法的方法
- **关联入口**：调用该方法的所有入口点
- **AOP 影响**：匹配该方法的切面和通知
- **配置影响**：绑定到该方法/类型的配置
- **SQL 影响**：该方法访问的数据库表
- **测试关联**：关联的测试方法

### 4.4 报告功能

#### 4.4.1 Markdown 报告
- 项目概览和统计信息
- 模块依赖关系图
- 核心流程说明
- 影响分析案例
- 未解析项和警告

#### 4.4.2 HTML 报告
- 单文件，离线可用
- 交互式目录导航
- 代码片段跳转
- 响应式设计，支持移动端

#### 4.4.3 MCP 工具
- `get_flow`: 获取调用链
- `analyze_impact`: 分析影响面
- `get_context_pack`: 获取 AI 上下文包

## 5. 范围边界

### 5.1 做什么

- ✅ Maven 多模块、Java 17/21
- ✅ Spring Boot 2.7 / 3.x 常见注解
- ✅ HTTP / 定时 / MQ / 事件 / Runner / Feign 入口
- ✅ 静态调用图 + 接口→实现分派
- ✅ AOP 常见 pointcut + 注解级隐式行为
- ✅ MyBatis XML/注解、MyBatis-Plus 基础
- ✅ 单仓库、本地分析
- ✅ Markdown / 单文件 HTML
- ✅ MCP stdio

### 5.2 不做什么（v0.1）

- ❌ 多语言、Gradle、Kotlin、Scala
- ❌ 全量 Spring 生态、Spring Cloud 全链路
- ❌ Dubbo、gRPC、跨进程调用解析
- ❌ 运行时 Java Agent、分布式追踪后端
- ❌ 完整 AspectJ 语义、编译期织入
- ❌ JPA/Hibernate 完整语义
- ❌ 多仓库、团队服务、云端
- ❌ Web SPA、账号、协作
- ❌ MCP HTTP/SSE、远程托管

## 6. 验收标准

### 6.1 功能验收

| 编号 | 验收项 | 通过标准 |
|---|---|---|
| F1 | 扫描 | 对 3 个 fixture 和 2 个真实 Maven 仓库生成索引；失败模块有明确告警，不中断其他模块 |
| F2 | 模块 | `modules` 能列出模块路径、坐标、内部依赖；跨模块依赖可追溯 |
| F3 | 入口 | 识别 HTTP、`@Scheduled`、Kafka/Rabbit/RocketMQ 监听、`@EventListener`、`CommandLineRunner`、`@FeignClient` |
| F4 | 流程 | `flow --http` 输出 Controller → Service 接口/实现 → Repository/Mapper → 表；每条边有 `file:line` |
| F5 | 影响 | `impact --method` 输出上游入口、AOP/隐式行为、配置、SQL 表、测试、风险标记 |
| F6 | 三态 | 每个节点/边标记 `RESOLVED` / `INFERRED` / `UNRESOLVED`；未解析项单独列出 |
| F7 | 报告 | `report` 生成可离线打开的单文件 HTML 和不依赖插件的 Markdown |
| F8 | MCP | Claude Code 与 Cursor 均能调用 `get_flow`、`analyze_impact`、`get_context_pack` |
| F9 | 诊断 | `doctor` 能判断 Java/Maven/索引缺失/索引过期，并给出可执行修复命令 |

### 6.2 性能与规模

测试环境基线：8 核 CPU、16 GB 内存、JDK 21、Maven 本地仓库已预热、SSD。

| 指标 | 目标 |
|---|---|
| 5 万–15 万行多模块项目首次扫描 | ≤ 5 分钟 |
| 无变更重扫（缓存命中） | ≤ 5 秒 |
| 索引大小 | ≤ 100 MB / 15 万行 |
| `flow` / `impact` 查询 | p95 ≤ 1 秒 |
| MCP `get_context_pack` | p95 ≤ 2 秒 |
| 扫描峰值内存 | ≤ 4 GB |

### 6.3 精度要求

在人工标注基准上（2 个真实仓库、20 条流程、约 100 条关键边）：

- **展示边的精确率**：≥ 90%（工具声称的边中，至少 90% 能在源码中核实）
- **关键路径覆盖率**：≥ 70%（人工标注的关键边中，至少 70% 被找到）
- **未解析项 100% 可见**：不允许把推断边伪装成已解析边，也不允许静默丢弃
- **源码跳转成功率**：≥ 95%（`file:line` 能打开到正确的方法或调用点）

精度不达标时，先缩小支持范围（例如只做 MyBatis + HTTP），不得通过删除难例来美化指标。

### 6.4 AI 漏改率实验

这是 v0.1 最关键的差异化验证：

- **实验设计**：选 1 个真实多模块项目，设计 5 个改动任务
  - 改方法签名
  - 改配置键
  - 改 SQL 列
  - 改事务传播
  - 加缓存注解
- **对比方法**：同一模型、同一提示词，分别在有/无 MCP 上下文时执行
- **评估指标**：
  - **漏改点下降**：≥ 50%（受影响的入口、AOP、配置、SQL、测试）
  - **时间下降**：≥ 30%（完成任务时间）
- **记录要求**：记录失败案例，不允许只报告成功任务

### 6.5 可用性

- **上手时间**：从下载到跑通第一个 `flow` ≤ 10 分钟
- **理解门槛**：第二个人不看操作过程，能独立读懂报告并复述核心流程
- **错误提示**：所有错误信息包含"发生了什么 + 下一步命令"

## 7. 里程碑计划

### 7.1 E0 工程骨架 ✅
- 父 POM / 模块 / CLI 骨架 / 日志 / CI / 打包脚本
- Maven 多模块项目结构
- 基础命令行接口

### 7.2 M0 Walking Skeleton ⬜
- 扫描 simple-boot/multi-module
- 模块/入口识别
- 基础调用图
- `flow` 文本输出

### 7.3 M1 影响分析闭环 ⬜
- Bean/DI 图构建
- 接口分派实现
- `impact` 命令
- MCP `get_flow` / `analyze_impact`

### 7.4 M2 框架语义与报告 ⬜
- AOP pointcut 解析
- 配置绑定分析
- MyBatis 集成
- Markdown/HTML 报告
- 阅读路线生成

### 7.5 M3 v0.1 RC ⬜
- fixtures/golden 测试集
- 真实仓库基准测试
- AI 漏改率实验
- 发布包制作

## 8. 成功指标

### 8.1 技术指标
- 扫描成功率 ≥ 95%（在真实项目中）
- 查询响应时间 p95 ≤ 1 秒
- 索引大小 ≤ 100 MB（15 万行代码）
- 内存使用 ≤ 4GB（扫描峰值）

### 8.2 用户体验指标
- 项目上手时间 ≤ 10 分钟
- 核心流程理解时间减少 ≥ 50%
- AI 编程漏改点减少 ≥ 50%
- 用户满意度 ≥ 4.5/5

### 8.3 生态指标
- 支持 5+ 个主流 Java 开源项目
- Claude Code/Cursor 插件集成
- 社区贡献者 ≥ 3 人
- 工具引用 ≥ 10 次

## 9. 风险与缓解

### 9.1 技术风险

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| Spoon 解析失败 | 无法构建代码模型 | 降级到 JavaParser，提供详细错误信息 |
| 大项目内存溢出 | 扫描失败 | 支持模块级扫描，提供内存优化建议 |
| 复杂 AOP 匹配 | 误判/漏判 | 限制 pointcut 范围，提供手动验证工具 |
| 多实现接口歧义 | 影响分析不准确 | 明确显示所有候选，不自动选择 |

### 9.2 产品风险

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 用户期望过高 | 功能不达预期 | 明确 v0.1 范围边界，提供详细文档 |
| AI 效果不明显 | 价值验证失败 | 设计严格的实验方案，量化对比指标 |
| 竞品功能重叠 | 差异化不足 | 强调本地化、精确性、证据链的差异化 |

## 10. 后续规划

### 10.1 v0.2 计划
- Gradle 支持
- JPA/Hibernate 完整语义
- 增量扫描
- Web UI 可视化

### 10.2 v0.3 计划
- 运行时 trace 导入
- 多语言支持
- 团队协作功能
- 云端分析服务

### 10.3 长期愿景
- 成为 Java 代码分析的标准工具
- 支持微服务架构分析
- 集成到 CI/CD 流程
- 提供代码质量洞察报告