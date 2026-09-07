> 历史审计：本文件记录上一版静态网站。当前已实现真实 Owner 后端，请以 [OWNER-SETUP.md](OWNER-SETUP.md) 为准。

# 内容与权限

## 本次审计结论

项目为原生 Three.js + 静态 HTML/JSON，通过 Nginx 发布，无 package.json、框架构建、数据库、API、认证或存储服务。旧 portal.html 的管理、照片、地图、手记、音乐与简历编辑保存在 localStorage；editor.html 同样把布局写入 localStorage。未发现服务端写接口或客户端服务密钥。访客过去能够编辑自己的浏览器副本，不能据此修改服务器，但这些副本不属于可发布的持久化管理架构。

## 已落地的边界

- 公开页面只读取 content.json 与发布的素材，不合并 localStorage。旧浏览器数据没有清除。
- 公开编辑器改为跳转 /admin/；管理页默认禁用，没有登录前编辑表单、上传或保存入口。未配置认证时不会假装已登录。
- 原编辑器源码保留在站点目录之外的 tools/*.html.txt，避免丢失旧工具；deploy-room.sh 只发布 room-preview/。
- Nginx 的 /room/ location 用 limit_except GET HEAD 拒绝写方法；静态服务器没有写入处理器。需要部署这些 Nginx 配置后才在生产生效，本次没有远程部署。
- JSON 文本经转义后渲染，链接和资源只允许 HTTP(S)，阻止 javascript: 等可执行协议。没有前端 secret。
- 当前 persistent source of truth 是版本化 JSON 与静态素材，更新通过受控的仓库/SSH 发布凭据完成。浏览器不能写服务器。

## 尚未启用的 owner 在线管理

当前没有后端，按目标文件允许的静态站点边界方案交付。/admin/ 不提供虚假的密码校验。建议后续接 Supabase Auth + Postgres + Storage：适合单 owner，内容和素材可长期存储，并能在数据库层落实授权。

必须先在服务端创建仅 owner 可写的权限，再开放编辑界面：

1. 通过邀请创建 owner 用户；owner 身份来自受保护表或服务端配置，不能信任用户可编辑的 metadata。
2. Postgres RLS：匿名/普通用户 SELECT 只读已发布内容；INSERT/UPDATE/DELETE 校验 auth.uid() 属于 owner allowlist。
3. Storage：访客只读已发布对象；新增、覆盖、删除均校验 owner。草稿桶私有。
4. /admin/ 以 Supabase 会话认证；每次写请求由 RLS 再验证。前端隐藏入口仅为体验，不是安全边界。
5. service_role key 只放可信服务端。生产测试匿名/非 owner 的 REST 与 Storage 写入全部被拒绝后再上线。

## 编辑发布内容

编辑 room-preview/content.json，素材放 room-preview/assets/。现有 resume 与示例书原数据保留；明显示例书不会作为真实书单呈现。

- 简历：assets/resume/resume.pdf；放入 PDF 后将 resume.available 改为 true。
- 手记：notebookPages 数组，字段 id、title、body（兼容 text）、image（可选）。每两条为一组左右页。
- 音乐：tracks 数组，字段 id、title、artist、src（如 assets/audio/track-01.mp3）、cover（如 assets/covers/track-01.jpg）。提供有权发布的音频。
- 照片：photos 数组，字段 id（p0–p11 可匹配原房间相框）、src、alt、title、caption、date；超过十二张仍在画廊展示。
- 旅行：travelPins 数组，字段 id、city、country、x、y、note、date、photos（图片路径数组）。x、y 为图片归一化坐标，左上角 0,0、右下角 1,1；默认等距圆柱地图中 x=(经度+180)/360，y=(90-纬度)/180。换投影后重新标注坐标。
- 地图：map.image 可指向 textures/world-map.jpg。仓库没有真实地图图片，当前复用既有程序绘制的大陆地图，不使用原来错误的树景图片。
- 书籍：books 数组，字段 title、author、link、cover、note。

不把旧 localStorage 自动发布，避免把示例或个人草稿暴露给访客。若真实内容只在原浏览器，先由 owner 导出并核对，再迁移到上述字段。

## 本地验证

在仓库根运行 `python3 -m http.server 8931 --bind 127.0.0.1 --directory room-preview`，打开 http://127.0.0.1:8931 。这是静态项目，没有 TypeScript/build/lint 命令。使用 Node `--check` 检查 JS；`tests/browser.cjs` 使用 Playwright 和本机 Chrome 验证镜头流程、页面、移动布局和静态写入拒绝，测试内容通过网络拦截注入，不修改发布 JSON。
