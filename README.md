# A room of my own

保留原生 Three.js、GLTF 模型与暖色房间，加入开放空间、3D 庭院、昼夜渐变、常驻交互标签和六类统一镜头体验。

本地启动：`python3 -m http.server 8931 --bind 127.0.0.1 --directory room-preview`。访问 http://127.0.0.1:8931/ 。无需安装前端依赖或执行 build。

- room.js：现有场景、模型与帧循环。
- environment.js：低面数立体植被、远景、统一昼夜灯光。
- camera-controller.js：overview / approach / hold / experience / closing / return 状态机。
- interaction-bubble.js、interactions.js：可读标签、射线交互、键盘与生命周期。
- experiences.js、experience.css：电脑 PDF、手记翻页与展开、音频、地图、画廊和书架。
- content-store.js、content.json：只读发布数据。
- admin/：未配置后端时默认禁用的管理边界。

内容与素材字段、已有数据迁移及安全审计见 docs/CONTENT-AND-SECURITY.md。未来方向见 docs/CREATIVE-DIRECTIONS.md。

验证：`python3 tests/static-check.py`；Node `--check` 检查应用 JS。Playwright 验证脚本为 tests/browser.cjs、tests/media.cjs、tests/visual-final.cjs，需要可用的 Playwright 与 Chrome（可用 CHROME_PATH 指定）。没有 TypeScript、lint 或框架 build 命令。

未自动部署生产环境；Nginx 只读方法配置需要随部署应用。
