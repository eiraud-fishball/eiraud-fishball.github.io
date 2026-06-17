---
title: OneDev CI/CD 配置踩坑记：从报错到成功部署
date: 2026-06-17T00:00:00.000Z
categories:
  - 技术笔记
tags:
  - OneDev
  - 部署
  - 教程
  - 编程
excerpt: 这篇文章记录了为博客配置 OneDev CI/CD 的完整过程。从最初的 YAML 语法错误，到各种步骤配置问题，再到最终实现多平台自动部署和仓库备份，踩了不少坑。希望这些经验能帮到同样在折腾 OneDev 的朋友。
---

之前博客的 CI/CD 跑在 GitHub Actions 上，功能单一，只负责构建和部署 GitHub Pages。这次我想把整个流程迁移到自建的 OneDev 上，实现更灵活的多平台部署。目标很明确：一次推送，自动构建，同时部署到 Cloudflare Pages、Netlify、Codeberg Pages、Git.gay Pages，还要把源码仓库备份到 Codeberg 和 Git.gay。

听起来不难，实际操作下来踩了一堆坑。这篇文章就是完整的踩坑记录。

## 第一坑：CommandStep 的 commands 字段位置

最开始写的 CommandStep 长这样：

```yaml
- type: CommandStep
  name: build
  commands: |
    npm run build
```

OneDev 报错：`Unable to find property 'commands' on class: io.onedev.server.buildspec.step.CommandStep`

查了官方文档才知道，commands 字段不在 CommandStep 的顶层，而是在 interpreter 下面。正确的写法是：

```yaml
- type: CommandStep
  name: build
  runInContainer: false
  interpreter:
    type: DefaultInterpreter
    commands: |
      npm run build
  useTTY: false
  condition: SUCCESSFUL
  optional: false
```

这个结构比 GitHub Actions 复杂不少。GitHub Actions 的 `run:` 直接写命令就行，OneDev 却要嵌套一层 interpreter。

## 第二坑：Trigger 的语法问题

OneDev 的 Trigger 配置也有坑。我最初写的 BranchUpdateTrigger 带了 paths 属性：

```yaml
triggers:
- type: BranchUpdateTrigger
  branches: main
  paths:
    - src/**
```

报错：`Cannot create property=paths for JavaBean=io.onedev.server.buildspec.job.trigger.BranchUpdateTrigger`

原来 OneDev 的 BranchUpdateTrigger 根本不支持 paths 字段。只能删掉。

然后是 TagCreateTrigger 的写法。我写成了：

```yaml
- type: TagCreateTrigger {}
```

报错：`Can't construct a java object for !TagCreateTrigger%20%7B%7D`

正确写法是不带大括号：

```yaml
- type: TagCreateTrigger
```

## 第三坑：userMatch 字段不能为空

配置文件终于能被 OneDev 识别了，但验证时报了一堆错：

```
验证构建规范时发生错误（位置：jobs[0].triggers[0].userMatch，错误消息：不得为空）
验证构建规范时发生错误（位置：jobs[1].triggers[0].userMatch，错误消息：不得为空）
...
```

所有 BranchUpdateTrigger 都要加上 `userMatch: anyone`：

```yaml
triggers:
- type: BranchUpdateTrigger
  branches: main
  userMatch: anyone
```

这个字段指定哪些用户触发的更新会执行该 Job。不填就报错，填 `anyone` 表示任何人都可以触发。

## 第四坑：Job Executor 找不到

配置文件验证通过了，运行时报错：

```
No job executor defined, auto-discovering...
No applicable executor discovered for current job
```

OneDev 需要配置 Job Executor 才能运行 Job。我选的是裸机构建模式（不使用 Docker），需要在 OneDev 管理后台添加 Server Shell Executor：

1. 进入 Administration → Build Executors
2. 添加新的 Server Shell Executor
3. 配置服务器地址和工作目录

配置完成后，Job 终于能跑了。

## 第五坑：Node.js 命令找不到

Job 开始执行，第一步就挂了：

```
/opt/onedev/temp/server/onedev-build-6-1-3/command/step-1.sh: line 6: node: command not found
/opt/onedev/temp/server/onedev-build-6-1-3/command/step-1.sh: line 7: npm: command not found
```

服务器上通过 aaPanel 安装的 Node.js 没有加到系统 PATH 里。解决方案是用 apt 重新安装：

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

安装后 `node --version` 和 `npm --version` 都能正常输出了。

## 第六坑：Cloudflare 项目名称错误

部署到 Cloudflare Pages 时报错：

```
Project not found. The specified project name does not match any of your existing projects. [code: 8000007]
```

我用的项目名是 `exyone-blog`，但 Cloudflare 上创建的项目名是 `exyone`。改成正确的名字就好了：

```yaml
npx wrangler pages deploy _site --project-name exyone --branch main --commit-dirty=true
```

## 第七坑：备份作业找不到 Git 仓库

备份到 Codeberg 的 Job 报错：

```
fatal: not a git repository (or any of the parent directories): .git
```

原因是备份 Job 没有 CheckoutStep，工作目录里根本没有代码。加上检出步骤：

```yaml
- name: Backup to Codeberg
  steps:
  - type: CheckoutStep
    name: checkout
    cloneCredential:
      type: DefaultCredential
    condition: SUCCESSFUL
    optional: false
  - type: CommandStep
    name: push to codeberg
    ...
```

## 第八坑：Netlify 命令找不到

最后一个问题是 Netlify 部署：

```
netlify: command not found
```

虽然用 `npm install -g netlify-cli` 安装了，但全局安装的包可能不在 PATH 里。改用 npx 更可靠：

```yaml
npx netlify-cli deploy --prod --dir _site --site @secret:netlify-site-id@ --auth @secret:netlify-auth-token@
```

npx 会自动下载并执行 netlify-cli，不需要预先安装。

## 最终配置结构

踩完所有坑后，最终的 `.onedev-buildspec.yml` 包含以下 Job：

1. **Build Blog** - 检出代码、安装依赖、构建站点
2. **Deploy to Cloudflare Pages** - 部署到 Cloudflare
3. **Deploy to Netlify** - 部署到 Netlify
4. **Deploy to Codeberg Pages** - 部署到 Codeberg Pages
5. **Deploy to Git.gay Pages** - 部署到 Git.gay Pages
6. **Backup to Codeberg** - 备份源码到 Codeberg
7. **Backup to Git.gay** - 备份源码到 Git.gay

每个部署 Job 都会检查 `/tmp/exyone-blog-build/_site` 是否存在，不存在就先构建。这样避免了重复构建，也保证了各平台部署的产物一致。

## OneDev Secrets 配置

敏感信息通过 OneDev 的 Secrets 管理：

- `cloudflare-api-token` - Cloudflare API Token
- `cloudflare-account-id` - Cloudflare Account ID
- `netlify-site-id` - Netlify Site ID
- `netlify-auth-token` - Netlify Personal Access Token
- `codeberg-pages-repo-url` - Codeberg Pages 仓库 URL（带 Token）
- `codeberg-backup-repo-url` - Codeberg 备份仓库 URL（带 Token）
- `gitgay-pages-repo-url` - Git.gay Pages 仓库 URL（带 Token）
- `gitgay-backup-repo-url` - Git.gay 备份仓库 URL（带 Token）

带 Token 的 URL 格式是 `https://username:token@codeberg.org/username/repo.git`。

## GitHub CI 的角色调整

OneDev 成为主要的 CI/CD 平台后，GitHub Actions 的职责简化为：

1. 定时从 OneDev 仓库拉取代码（保持同步）
2. 构建并部署 GitHub Pages

这样 OneDev 是主仓库，GitHub 是从仓库。所有开发工作推送到 OneDev，GitHub 定期同步并维护自己的 Pages 部署。

## 总结

OneDev 的 YAML 配置比 GitHub Actions 复杂不少，主要是 Java 对象映射的那套规则比较严格。踩坑过程中最大的收获是学会了阅读 OneDev 的错误信息——它报的 Java 类名和属性名直接对应 YAML 字段，顺着这个线索查文档能快速定位问题。

裸机构建模式的好处是速度快、资源占用少，但需要自己管理服务器环境。如果不想折腾服务器配置，用 Docker 模式会更省心。

最终实现的效果是：一次 `git push`，OneDev 自动构建并部署到 4 个平台，同时备份源码到 2 个平台。冗余度拉满，再也不用担心某个平台挂掉了。
