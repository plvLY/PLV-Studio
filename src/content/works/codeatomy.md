---
title: "PLV Codeatomy"
summary: "Code + Anatomy：给代码库做一次解剖。看清结构，追踪流程，预判影响。"
type: "developer-tool"
status: "in-progress"
cover: "/images/works/codeatomy/cover.svg"
icon: "/images/works/codeatomy/icon.svg"
startedAt: "2026-10-27"
updatedAt: "2026-10-30"
techStack: ["Java 21", "Maven 3.9+", "Spoon 11.5.0", "SQLite", "Picocli 4.7.7", "Jackson 2.18.0", "Spring Boot 3.4.0", "MCP SDK 2.1.0", "AspectJ 1.9.26", "JSqlParser 5.4", "SnakeYAML 2.7"]
published: true
featured: true
demoUrl: ""
sourceUrl: "https://github.com/plvLY/PLV-Codeatomy"
videoUrl: ""
story:
  pain: "多模块 Java 项目动辄几十个模块，接手时要靠全局搜索和断点才能拼出调用链；AI 编程也只拿到零散文件，改动的真实影响面说不清。"
  solution: "用 Spoon 做静态分析，扫描一次生成 SQLite 索引：模块、入口、调用边、Bean 注入、AOP、配置与 SQL 关联起来，CLI、报告与 MCP Server 共用同一份索引。"
  value: "把「读代码猜流程」变成可核查的索引：每条边都能回到 file:line，无法解析的项 100% 可见，人和 AI 都能据此判断改动的上下游。"
---

## 1. 项目概述

**PLV Codeatomy** 是本地 CLI 工具 + 单文件报告 + MCP Server。它把 Java（Spring Boot / Maven 多模块）项目的**结构、入口、调用链和隐式耦合**整理成一份可核查的本地索引，供人和 AI 共同回答两个核心问题：

1. 这个接口/任务是怎么跑起来的？
2. 我改这个方法，还会影响哪些入口、AOP、配置、SQL 和测试？

## 2. 核心目标

- **索引一次，查询多次**：扫描阶段完成所有昂贵解析；查询只读索引
- **证据优先于推断**：每条边/隐式行为都能回到 `file:line`；三态 `RESOLVED / INFERRED / UNRESOLVED`，绝不静默丢弃
- **本地优先，零基础设施**：不要求 Docker、数据库服务、账号或网络
- **CLI 优先，UI 是视图**：先保证查询结果正确，再做可视化

## 3. 已实现功能

### E0 工程骨架 ✅
- 父 POM / 7个核心模块 / CLI 骨架 / 日志 / CI / 打包脚本
- Maven 多模块项目结构，完整的依赖管理
- 基础命令行接口：`java -jar codeatomy-cli.jar --help` 和 `version`
- **新增模块**：`codeatomy-ui` - Spring Boot Web UI 后端

### 完整技术架构
- **领域模型**：完整的 Java 项目实体关系模型（codeatomy-core）
- **Maven 解析**：模块依赖、classpath、源码发现（codeatomy-java）
- **Spoon 模型**：带类型信息的代码解析（Spoon 11.5.0）
- **查询引擎**：Flow / Impact / 阅读路线 / Context Pack（codeatomy-query）
- **报告渲染**：Markdown / 单文件 HTML 渲染（codeatomy-report）
- **MCP Server**：stdio 传输，供 Claude Code / Cursor 调用（codeatomy-mcp）
- **Web UI**：Spring Boot 后端 + Vue 3 前端（codeatomy-ui）
- **CLI 入口**：Picocli 命令行，thin jar 打包（codeatomy-cli）

## 4. 待开发里程碑

### M0 Walking Skeleton ⬜
- 扫描 simple-boot/multi-module；模块/入口；基础调用图；`flow` 文本输出

### M1 影响分析闭环 ⬜
- Bean/DI、接口分派、`impact`、MCP `get_flow` / `analyze_impact`

### M2 框架语义与报告 ⬜
- AOP、配置、MyBatis、Markdown/HTML 报告、阅读路线

### M3 v0.1 RC ⬜
- fixtures/golden、真实仓库基准、AI 实验、发布包

## 5. 核心命令设计

### CLI 命令（当前可用）
```bash
# 基础命令
java -jar codeatomy-cli.jar --help          # 显示帮助
java -jar codeatomy-cli.jar version         # 显示版本

# 计划中的命令（v0.1 实现）
codemap scan <repo>                        # 扫描项目，生成索引
codemap flow <entry>                       # 查看入口到数据层的静态路径
codemap impact <method>                   # 查看方法的反向影响面
codemap report                            # 生成 Markdown / HTML 上手报告
codemap mcp                               # 以 MCP stdio 方式供 Claude Code / Cursor 调用
codemap doctor                            # 诊断工具状态
```

### Web UI 访问（开发中）
```bash
# 启动 Web UI（Spring Boot 后端）
java -jar codeatomy-ui/target/codeatomy-ui.jar

# 访问地址：http://localhost:8080
```

## 6. 技术特色

### 精度保证
- **三态标记**：`RESOLVED`（解析器确认）、`INFERRED`（规则推断）、`UNRESOLVED`（已知但无法解析）
- **证据溯源**：每条边都能回到源码的 `file:line`
- **不静默丢弃**：无法解析的调用进入 `warning` / `unresolved`，报告必须展示

### 框架深度支持
- **Spring 语义**：Bean 图、依赖注入、接口实现分派
- **AOP 解析**：AspectJ 1.9.26，Pointcut 匹配、代理失效检测、隐式行为识别
- **MyBatis 集成**：JSqlParser 5.4，XML/注解映射、SQL 语句解析、表级影响分析
- **配置绑定**：`@Value`、`@ConfigurationProperties`、环境变量

### AI 编程场景
- **MCP Server**：MCP SDK 2.1.0，stdio 传输，直接服务 Claude Code / Cursor
- **上下文包**：按 token 预算裁剪的 Markdown 证据集合
- **影响预测**：帮助 AI 了解代码变更的完整影响面

### 多端支持
- **CLI 工具**：Picocli 4.7.7，轻量级命令行体验
- **Web UI**：Spring Boot 3.4.0 + Vue 3，可视化交互界面
- **单文件报告**：Markdown / HTML，离线可用

## 7. 验收标准

### 功能验收
- ✅ 扫描：对 6 个 fixture 项目生成索引
- ⬜ 模块：`modules` 能列出模块路径、坐标、内部依赖
- ⬜ 入口：识别 HTTP、`@Scheduled`、Kafka/Rabbit/RocketMQ 监听等
- ⬜ 流程：`flow --http` 输出 Controller → Service → Repository/Mapper → 表
- ⬜ 影响：`impact --method` 输出上游入口、AOP/隐式行为、配置、SQL 表

### 精度要求
- **展示边的精确率**：≥ 90%（工具声称的边中，至少 90% 能在源码中核实）
- **关键路径覆盖率**：≥ 70%（人工标注的关键边中，至少 70% 被找到）
- **未解析项 100% 可见**：不允许把推断边伪装成已解析边
- **源码跳转成功率**：≥ 95%（`file:line` 能打开到正确的方法或调用点）

## 8. 项目进展与测试环境

### 当前状态
- **E0 工程骨架**：✅ 完成（2026-10-30）
- **测试环境**：提供 6 个 fixture 项目：
  - `simple-boot`：Spring Boot 单模块项目
  - `multi-module`：4 模块 Maven 项目
  - `spring-magic`：Spring 高级特性示例
  - `mybatis`：MyBatis 集成测试
  - `broken`：错误处理测试
  - `empty`：空项目测试

### 构建与运行
```bash
# 构建所有模块
mvn -B -ntp verify

# 运行 CLI
java -jar codeatomy-cli/target/codeatomy-cli.jar --help
java -jar codeatomy-cli/target/codeatomy-cli.jar version

# 启动 Web UI（开发中）
cd codeatomy-ui
mvn spring-boot:run
```

### 版本信息
- **当前版本**：0.1.0-SNAPSHOT
- **JDK 要求**：21
- **Maven 要求**：3.9+
- **构建工具**：Maven 3.16.0 编译插件

## 9. 与 PLV Studio 的关系

PLV Codeatomy 是 PLV Studio 技术生态的重要组成部分，专注于代码分析领域。它为开发者提供：

- **项目上手加速**：快速理解陌生 Java 项目的结构和流程
- **变更风险评估**：预判代码修改的完整影响范围
- **AI 编程增强**：为 AI 工具提供准确的代码上下文
- **技术债务识别**：通过静态分析发现潜在的架构问题

PLV Studio 将作为 PLV Codeatomy 的展示平台，提供项目文档、技术说明和使用案例。