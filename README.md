# GitHub 关系图谱 (GitHub Relation Graph)

用来看 Github 关注和被关注的关系图的，感觉挺有意思，就无聊 Vibe 的一个桌面应用。
![](asset\example.png)
## 快速开始

无环境可以直接去 release 里面下，有环境也可以自行构建

### 前置需求

```bash
# 安装 Go 1.26.1+
# 安装 Node.js 及 npm

# 安装 Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 开发模式

```bash
cd gh-relation-graph
wails dev
```

特性：
- 热重新加载
- 开发者工具
- 窗口大小: 1280x800

### 生产构建

```bash
wails build
```

输出:
- Windows: `build/bin/gh-relation-graph.exe`
- macOS: `build/bin/gh-relation-graph.app`

### 前端单独开发

```bash
cd frontend
npm install
npm run dev      # Vite 开发服务器 (http://localhost:5173)
npm run build    # 生产构建
npm run preview  # 预览
```

## 功能特性

### 核心功能
- **关系网络可视化** - 力导向布局算法实时渲染 GitHub 用户关注关系图
- **多深度探索** - 从指定用户出发，探索最多 3 层关注关系网络
- **灵活的用户选择** - 手动选择每层中感兴趣的用户，精确构建图谱
- **统计分析** - 实时计算图谱统计数据（节点数、边数、互粉关系等）
- **互粉检测** - 发现两个用户之间的共同关注者
- **速率限制感知** - 自动检测 GitHub API 速率限制并智能等待

### 可视化
- **图谱视图** - Cytoscape.js 力导向布局，支持拖拽、缩放、节点点击高亮
- **统计视图** - Recharts 展示深度分布、互粉对比、热门用户排行
- **用户详情卡片** - 点击节点弹出用户头像、简介、粉丝数等信息

### 认证方式
- **OAuth 设备流** - 无需浏览器跳转，桌面应用内完成认证
- **个人令牌 (PAT)** - 支持直接输入 GitHub Personal Access Token
- **本地持久化** - 令牌安全存储在系统配置目录，下次启动免登录

## 使用指南

1. **认证** - 点击 "Sign in with GitHub" 使用 OAuth，或输入 PAT
2. **搜索用户** - 输入 GitHub 用户名，点击 "Fetch Users" 获取关注列表
3. **选择用户** - 在列表中勾选感兴趣的用户，支持过滤和批量操作
4. **扩展深度** - 点击 "Expand Depth N" 获取下一层关注关系（最多 3 层）
5. **构建图谱** - 点击 "Build Graph" 生成可视化关系图
6. **查看分析** - 切换到 Chart View 查看统计数据

### 图谱交互
- 点击节点 → 查看用户详情，高亮相关连接
- 拖拽节点 → 调整布局
- 滚轮缩放 → 放大/缩小
- 点击空白 → 取消高亮

## 技术架构

### 技术栈
- **桌面框架**: Wails v2 (Go + 嵌入式 Web 前端)
- **后端**: Go 1.26.1, google/go-github v68
- **前端**: React 18 + TypeScript + Vite
- **图可视化**: Cytoscape.js + COSE-Bilkent 布局算法
- **图表**: Recharts
- **认证**: GitHub OAuth Device Flow / PAT

### 项目结构

```
gh-relation-graph/
├── main.go                 # Wails 应用入口，窗口配置
├── app.go                  # 主应用逻辑，前端绑定方法
├── go.mod / go.sum         # Go 依赖
├── wails.json              # Wails 构建配置
├── internal/
│   ├── cache/cache.go      # TTL 内存缓存 (30min, 1000项)
│   ├── config/storage.go   # 令牌本地持久化
│   ├── github/
│   │   ├── client.go       # GitHub API 封装，速率限制追踪
│   │   └── oauth.go        # OAuth 设备流实现
│   └── graph/
│       ├── models.go       # 数据结构定义
│       ├── bfs.go          # BFS 图遍历算法
│       ├── convert.go      # GitHub API → 内部模型转换
│       └── mutual.go       # 互粉关系分析
├── frontend/
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   │   ├── Layout.tsx          # 整体布局
│   │   │   ├── AuthPanel.tsx       # 认证面板
│   │   │   ├── SearchBar.tsx       # 用户搜索
│   │   │   ├── UserSelector.tsx    # 用户多选列表
│   │   │   ├── GraphView.tsx       # 图谱可视化
│   │   │   ├── ChartView.tsx       # 统计图表
│   │   │   ├── UserCard.tsx        # 用户详情卡片
│   │   │   ├── MutualFollows.tsx   # 互粉查询
│   │   │   ├── StatusBar.tsx       # API 速率限制状态
│   │   │   └── LoadingOverlay.tsx  # 加载状态
│   │   ├── context/        # React Context 状态管理
│   │   ├── types/          # TypeScript 类型定义
│   │   └── assets/         # 静态资源
│   └── package.json
└── build/                  # 构建产物和图标资源
```

### 后端设计

**缓存机制**: 内存缓存，30 分钟 TTL，最大 1000 项，LRU 淘汰策略，减少重复 API 调用

**速率限制**: 自动追踪 GitHub API 剩余额度，低于 10 次时暂停等待重置

**BFS 遍历**: 从中心用户出发，广度优先遍历关注关系，支持最多 3 层深度，支持取消操作

**令牌存储路径**:
- Windows: `%APPDATA%/gh-relation-graph/token.json`
- macOS: `~/Library/Application Support/gh-relation-graph/token.json`
- Linux: `~/.config/gh-relation-graph/token.json`

### API 绑定

| 方法 | 功能 |
|------|------|
| `GetAuthStatus()` | 获取认证状态 |
| `SetToken(token)` | 设置 PAT |
| `StartDeviceFlow()` | 启动 OAuth 设备流 |
| `PollOAuthOnce()` | 轮询 OAuth 令牌 |
| `Logout()` | 登出 |
| `FetchFollowList(username)` | 获取关注者/关注列表 |
| `FetchFollowListForUsers(logins, exclude, depth)` | 批量获取关注列表 |
| `BuildGraphFromSelected(center, selectedByDepth)` | 从选中用户构建图谱 |
| `CancelBuild()` | 取消构建 |
| `GetGraphStats(graph)` | 计算图谱统计 |
| `FindMutualFollows(graph)` | 查找互粉关系 |
| `FindMutualFollowsBetween(userA, userB)` | 查找两人共同关注 |
| `GetRateLimitInfo()` | 获取 API 速率限制 |
| `ClearCache()` | 清除缓存 |

## 依赖

### 后端
| 依赖 | 版本 | 用途 |
|------|------|------|
| Go | 1.26.1+ | 语言 |
| github.com/wailsapp/wails/v2 | v2.12.0 | 桌面应用框架 |
| github.com/google/go-github/v68 | v68.0.0 | GitHub API 客户端 |
| golang.org/x/oauth2 | v0.25.0 | OAuth2 认证 |

### 前端
| 依赖 | 版本 | 用途 |
|------|------|------|
| react | 18.2.0 | UI 框架 |
| typescript | 4.6.4 | 类型系统 |
| vite | 3.0.7 | 构建工具 |
| cytoscape | 3.33.1 | 图可视化 |
| cytoscape-cose-bilkent | 4.1.0 | 力导向布局算法 |
| recharts | 3.8.1 | 统计图表 |
| lucide-react | 0.263.1 | 图标库 |
