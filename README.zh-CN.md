# Multica

Multica 是一个本地优先的个人 AI Agent 任务管理工具。

它提供 issues、projects、comments、agent profiles、本地 runtime 监控和可复用 skills。当前版本面向单人本地使用：不需要云账号、登录、邮箱验证码、OAuth、JWT、个人访问令牌、邀请或遥测。

## 特性

- **本地仓库**：workspace 绑定本机文件系统路径，服务端会拒绝远程 Git URL。
- **单人本地用户**：应用启动时自动创建本地用户，不需要认证流程。
- **Agent 执行**：把 issue 分配给 agent，daemon 会领取任务、执行、流式回传进度。
- **本地 Runtime**：自动检测 PATH 中的 `claude`、`codex`、`opencode`、`openclaw`、`hermes`、`gemini`、`pi`、`cursor-agent`。
- **可复用 Skills**：沉淀部署、迁移、代码审查等重复流程。

## 快速开始

```bash
make dev
```

本地 self-host：

```bash
make selfhost
multica setup self-host
```

默认使用 `podman compose`。如果需要 Docker Compose：

```bash
COMPOSE="docker compose" make selfhost
```

打开：

- Web: http://localhost:3000
- API: http://localhost:8080

## CLI

```bash
multica setup self-host
multica daemon status
multica workspace list
multica issue list
multica issue create --title "Fix flaky test"
```

完整说明见 [CLI_AND_DAEMON.md](CLI_AND_DAEMON.md)。

## 开发

依赖：

- Node.js 22
- pnpm 10.28+
- Go 1.26.1
- Podman 或 Docker Compose

常用命令：

```bash
pnpm typecheck
pnpm test
make test
make check
```

贡献和架构规则见 [CLAUDE.md](CLAUDE.md)。
