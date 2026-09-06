# Lake Tahoe 改造执行记录

## 参考图核对

已读取外部参考包 FINAL-CODEX-PROMPT.md 并实际查看 01、02、03 和 04 的图像。04 的可用文件名为 04-night-detail.webp（内容与 03 相同），指定的 .jpg 不存在。05-winter-season-reference.jpg 在参考包及其项目中未找到，因此冬季仅依照文字规范实现，不声称完成与该图的对照。

参考图片只用于观察构图、光线和材质关系，未复制进公开站点。新增松针、树皮、松树轮廓、云、水和地形均为本项目程序生成，无新增第三方图像授权依赖。已有室内模型与书封纹理保持原样。

## 架构现状（改造前的代码证据）

- 原生 HTML/CSS/JavaScript、全局 Three.js、OrbitControls、GLTFLoader、DRACO；无 npm 构建或 TypeScript。
- Nginx 发布静态目录，deploy-room.sh 通过 SSH 上传静态文件。
- 内容源为 content.json 与静态媒体。admin 页面默认禁用；没有数据库、认证、上传或内容 API。
- 电脑、笔记、唱片、旅行、画廊、书架读取 JSON；布局和几何硬编码在 room.js。静态内容只能编辑文件并重新发布，不能通过网页跨设备管理。

## 产品形态比较

| 选项 | 适合当前项目的作用 | 限制 |
|---|---|---|
| 纯静态 Web App | 最轻的公开 3D 展示 | 更新需发布文件，无在线私有资料管理 |
| Web + backend + database | 真实持久化、权限、跨设备更新 | 需要服务进程、备份与 HTTPS |
| Headless CMS | 可直接使用成熟管理界面 | 外部服务配置、费用和模型适配 |
| Owner-only Content Studio | 以现有物件组织资料，单 Owner 操作最直接 | 不是存储系统，必须连接 backend/storage |
| PWA | 桌面图标、有限离线浏览 | 不替代服务端；私有资源不能随意缓存 |
| Electron / Tauri | 本机文件集成、桌面包装 | 多设备同步仍需后端，分发维护成本偏高 |

推荐组合：保留 Web 3D 前端 + 同源 Owner Content Studio + Python API + SQLite + 私有文件目录。现有部署已有 VPS 和 Nginx，可用一个轻量服务完成闭环，不新增前端依赖。内容和媒体经 API 独立加载；未来如果不想维护 VPS，可迁往托管 CMS 或 Supabase，PWA 可按需叠加。
