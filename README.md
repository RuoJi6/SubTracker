# SubTracker - 软件订阅管理系统

一个全功能的软件订阅管理工具，支持多币种汇率转换、日历可视化、多渠道消息提醒，通过 Docker 容器部署。

## ✨ 功能特性

### 订阅管理
- 新增 / 编辑 / 删除软件订阅
- 支持多种订阅周期（周 / 月 / 季 / 年 / 自定义天数）
- 支持 18 种国际货币（CNY、USD、EUR、GBP、JPY 等）
- 订阅分类管理（开发工具、设计、娱乐等）

### 仪表盘
- 统一货币显示（自动按订阅时汇率转换）
- 月度 / 年度费用统计
- 即将到期提醒
- 活跃订阅数量概览

### 日历视图
- 基于 Ant Design Calendar 的可视化日历
- 日历上标注订阅续费日期
- 月视图 / 年视图切换
- 点击日期查看当日订阅详情

### 消息通知
- 🤖 **钉钉机器人**：Webhook + HMAC 签名推送
- 📧 **邮件推送**：通过 SMTP（nodemailer）发送 HTML 邮件
- 📅 **Apple 日历订阅**：生成 `.ics` 文件，可直接添加到 Apple 日历
- ⏰ 可配置提前 0/1/2 天提醒，自定义提醒时间

### 其他
- 中英文国际化
- JWT 认证保护
- 汇率自动获取与缓存（frankfurter.app）

## 🛠 技术栈

| 项目 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) + TypeScript |
| UI | Ant Design 5 + Tailwind CSS |
| 数据库 | SQLite + Prisma ORM |
| 汇率 | frankfurter.app（免费，无需 API Key） |
| 定时任务 | node-cron |
| 邮件 | nodemailer（SMTP） |
| 日历 | ical-generator |
| 认证 | JWT（jsonwebtoken + jose） |
| 国际化 | 自定义 i18n（中/英文） |
| 包管理 | pnpm |

## 🚀 快速开始

### 环境要求
- Node.js >= 20
- pnpm >= 8

### 本地开发

```bash
# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env
# 编辑 .env 设置你的配置

# 初始化数据库
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000，使用 `.env` 中配置的用户名密码登录（默认 `admin` / `admin123`）。

### Docker 部署

#### 方式一：直接拉取镜像（推荐）

```bash
docker pull ghcr.io/ruoji6/subtracker:latest

docker run -d -p 3000:3000 \
  -e AUTH_USERNAME=admin \
  -e AUTH_PASSWORD=your_password \
  -e JWT_SECRET=your_secret \
  -v subtracker-data:/app/prisma/data \
  ghcr.io/ruoji6/subtracker:latest
```

> 🚀 **国内加速拉取**：使用 [Xget](https://github.com/xixu-me/xget) 镜像加速
> ```bash
> # 配置 Xget 作为 registry mirror（将 xget.xi-xu.me 替换为你的自部署地址）
> # /etc/docker/daemon.json
> {
>   "registry-mirrors": ["https://xget.xi-xu.me/cr/ghcr"]
> }
> # 然后正常拉取即可：docker pull ghcr.io/ruoji6/subtracker:latest
> ```

#### 方式二：本地构建

```bash
# 使用 docker-compose 一键启动
docker-compose up -d

# 或手动构建
docker build -t subtracker .
docker run -d -p 3000:3000 \
  -e AUTH_USERNAME=admin \
  -e AUTH_PASSWORD=your_password \
  -e JWT_SECRET=your_secret \
  -v subtracker-data:/app/prisma/data \
  subtracker
```

> 💡 每次推送到 `main` 分支或创建版本 tag（如 `v1.0.0`）时，GitHub Actions 会自动构建并推送镜像到 ghcr.io。

## ⚙️ 环境变量

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `AUTH_USERNAME` | ✅ | 登录用户名 | `admin` |
| `AUTH_PASSWORD` | ✅ | 登录密码 | `admin123` |
| `JWT_SECRET` | ✅ | JWT 签名密钥 | `default-secret` |
| `DATABASE_URL` | ✅ | 数据库连接地址 | `file:./data/subtracker.db` |
| `DINGTALK_WEBHOOK` | ❌ | 钉钉机器人 Webhook URL | - |
| `DINGTALK_SECRET` | ❌ | 钉钉机器人签名密钥 | - |
| `SMTP_HOST` | ❌ | SMTP 服务器地址 | - |
| `SMTP_PORT` | ❌ | SMTP 端口 | `465` |
| `SMTP_USER` | ❌ | SMTP 用户名 | - |
| `SMTP_PASS` | ❌ | SMTP 密码 | - |
| `EMAIL_FROM` | ❌ | 发件人邮箱 | - |
| `EMAIL_TO` | ❌ | 收件人邮箱 | - |
| `TZ` | ❌ | 时区 | `Asia/Shanghai` |

> 钉钉和邮件配置也可以在应用内「设置」页面配置，界面配置优先于环境变量。

## 📅 Apple 日历订阅

1. 部署后，获取日历订阅 URL：`https://your-domain/api/calendar`
2. 打开 Apple 日历 → 文件 → 新建日历订阅
3. 粘贴 URL，设置自动刷新频率
4. 日历会自动同步所有活跃订阅的续费日期

## 📁 项目结构

```
├── prisma/              # 数据库 schema 和迁移
├── src/
│   ├── app/             # Next.js App Router 页面和 API
│   │   ├── api/         # RESTful API 路由
│   │   ├── login/       # 登录页
│   │   ├── subscriptions/ # 订阅管理页
│   │   ├── calendar/    # 日历视图页
│   │   └── settings/    # 设置页
│   ├── components/      # React 组件
│   ├── hooks/           # 自定义 Hooks
│   ├── lib/             # 工具库（认证、汇率、通知等）
│   ├── i18n/            # 国际化语言包
│   └── types/           # TypeScript 类型定义
├── Dockerfile           # Docker 构建文件
└── docker-compose.yml   # Docker Compose 配置
```

## 📜 常用命令

```bash
pnpm dev           # 启动开发服务器
pnpm build         # 生产构建
pnpm start         # 启动生产服务器
pnpm db:migrate    # 运行数据库迁移
pnpm db:push       # 推送 schema 到数据库（无迁移）
pnpm db:generate   # 生成 Prisma Client
```

## License

MIT
