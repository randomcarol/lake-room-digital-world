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

## 本轮落地与验收对应

| 要求 | 当前证据 |
|---|---|
| 房间→近松树→湖岸→湖→对岸森林→远山→天空 | environment.js 的分层世界坐标几何，桌面白天、夜晚、冬季及手机截图已实际检查 |
| 有细节的树木、克制动态、性能 | landscape-assets.js 原创树皮／松针／松树轮廓；实例化近树与分枝、1500 个远景树实例；共享几何、贴图，无逐叶 DOM/React 更新 |
| 湖水反射、月光位置与视角一致 | 水面 shader 使用 world、cameraPosition 与 moon 世界坐标计算高光；夜景截图可见月亮下方湖面反射带；水波和破碎亮度随 time 更新 |
| 天空、云、星光与时间 | world-state.js 本地时间自动模式与 day/dusk/night 预览；sky shader 慢速云、星点独立 phase，月亮遮罩与云函数一致 |
| 鸟类 | 四只轻量鸟，flying / perched / singing / resting；分枝位置停靠；夜间 resting；默认静音，可调合成鸟鸣，不伪称真实录音 |
| 四季扩展基础 | Spring / Summer / Autumn / Winter 配置独立于时钟；颜色、光线、雪线、积雪、粒子集中管理；夏冬已做界面对照；春秋为基础色调与粒子预览，不代表四套完整美术 |
| 接近 360° | 实际完整水平一周；禁用平移，概览最小距离 10，保留俯仰范围；外侧隐藏遮挡立面及背面墙饰；四个方向截图、拖拽防误触测试通过 |
| 小型半透明面板 | experience.css 共用尺寸、透明度、blur 与滚动规则；桌面／390px 手机六类面板逐一打开、截图和退出验证 |
| 可持续内容模型 | schema.sql 的 collections → items → media；现有六个物件作为 collection，通用种类覆盖文字、链接、图片、PDF、音频、视频 |
| Owner 真正写权限 | 服务端会话、PBKDF2、CSRF、首次改密；匿名只读公开条目；媒体在私有目录，每次下载与 Range 请求都执行授权 |
| 上传保存更新闭环 | tests/admin-browser.cjs 真实网页操作上传、保存、排序、编辑、访客刷新；测试数据库隔离；无伪上传和 localStorage 内容存储 |
| 失败反馈 | 后端拒绝非法文件／未授权写入，管理页面显示上传失败和网络保存失败，编辑内容保持可重试 |
| 运行检查 | tests/test_backend.py、tests/admin-browser.cjs、tests/tahoe-browser.cjs 与 tests/tahoe-final-visual.cjs 通过；应用 JS 语法检查与静态引用检查通过 |

没有项目 build/lint/TypeScript 命令。浏览器验证使用本机 Chrome 的软件 WebGL，能验证运行与布局，但不能作为实际硬件 GPU 帧率基准。节能档会降低 DPR、远景树与星点数量；没有添加实时镜面反射渲染通道或重型依赖。

## 尚未发生的外部操作与限制

- 未远程部署新服务或配置域名 TLS。当前 backend/database/auth/storage 已在本机接通；跨设备使用需要按 OWNER-SETUP.md 将同一服务部署到 HTTPS 域名。
- 冬季第 5 张指定参考图缺失，不能宣称已对照；当前冬季依据文字要求完成可见预览。
- 没有伪造个人素材。真实 Owner 数据库初始化后仍为空，所有测试条目都在临时数据库中清理。
- 无完整四季专业美术、真实鸟鸣录音、视频转码、CMS 版本历史；前两项按任务允许提供基础／合成接口，后两项不属于最小闭环。
