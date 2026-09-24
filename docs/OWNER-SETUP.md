# Owner Content Studio：本地使用与生产部署

## 当前可用闭环

运行 `python3 backend/server.py`，打开 http://127.0.0.1:8932/admin/ 。也可以双击 room-preview/打开房间预览.command。

首次运行会在 `.room-data/owner-bootstrap.txt` 写入随机初始密码，目录权限 700，文件权限 600。只有本机 Owner 能读取；不会出现在网页或日志中。使用该密码登录，设置至少 12 个字符的新密码后重新登录。初始密码文件会被删除，旧会话全部失效。

物件列表直接对应现有六个物件：Computer、Notebook、Record Player、World Map、Photo Wall、Bookshelf。

1. 选择物件，后台会切换为该物件自己的字段；不会再用同一组 `title + image + text` 表单覆盖所有内容。
2. 可上传 JPG/PNG/WebP/GIF、PDF、MP3/WAV/OGG/FLAC、MP4/WebM，单文件最大 64 MB，显示上传进度与失败原因；大视频可关联外部链接。
3. 书架支持作者、封面、豆瓣链接、短评、标签和评分；唱机支持歌手、网易云链接、个人记忆、心情标签和可选自有音频；照片墙支持日期、地点与长故事；手账支持日期、图片和装饰标签。
4. 世界地图可单独新增“自定义地图图片”或“旅行图钉”。图钉可在预览地图上直接拖动，后台自动保存归一化 x/y 坐标；故事支持地点、日期、短句、长文、标签、主图及补充图片 URL。
5. 默认保存为私有；勾选“公开发布”后访客可读取。文件本身只有被公开条目引用时才可被访客访问。
6. 使用 ↑/↓ 排序，编辑更新，或删除条目。删除／取消公开后，未被其他公开条目引用的文件立即恢复私有。浏览器和用户已下载的副本无法远程收回。
7. 房间每 20 秒检查发布版本，切回窗口或退出物件时也检查；无需重新部署。文字、照片相框、地图与图钉、手账和体验内容都会更新。

原生体验优先呈现对应内容；同一物件中的额外视频、文档、链接等显示在“更多资料”折叠区，避免为了文件类型新增虚构物件。

## 存储与权限

- SQLite：`.room-data/content.sqlite`，Owner 密码只存加盐 PBKDF2-SHA256 哈希；会话 token 只存哈希，Cookie 为 HttpOnly / SameSite=Strict。
- 媒体：`.room-data/media/`，不位于静态站点目录。GET /api/media/:id 每次检查 Owner 会话或公开引用；私有文件和范围请求执行同一检查。媒体响应 no-store。
- 写 API 每次验证 Owner session 与 CSRF token；初始密码未修改前不能写内容。登录有失败频率限制；不支持公开注册。
- 未发布条目不会进入公开 API；不是前端过滤后假装私有。
- 脱离后端的静态站点仍能读取旧 content.json，但管理页会明确提示服务未启动，不模拟上传或保存。

## 生产接入（尚未执行）

本地闭环已实现；现有远程站点尚未连接新服务。不要只运行旧 deploy-room.sh 并期待后台生效，它只部署静态目录。

1. 将整个项目的 backend/ 与 room-preview/ 放到 VPS 的 `/opt/personal-room/`，**不要**把本机 `.room-data` 或密码文件公开上传到 Web 根目录。
2. 创建独立系统用户 `room-content`，并创建由该用户所有的 `/var/lib/personal-room`（700）；该目录持久保存数据库及媒体。
3. 复制 `backend/production.env.example` 到 `/etc/personal-room.env`（600），将 `ROOM_PUBLIC_ORIGIN` 设置为真实 HTTPS origin，例如 `https://portfolio.example.com`，不带 `/room`。
4. 安装 `backend/room-content.service` 到 systemd，启动服务。默认只监听 127.0.0.1:8932，Cookie 使用 Secure。
5. 在域名的 HTTPS Nginx server block 使用 `backend/nginx-room.conf`，替换同路径的旧静态 location；执行 `nginx -t` 后 reload。确认有效 TLS，再通过 `/room/admin/` 使用服务器生成的初始密码登录并更换。
6. 从未登录浏览器验证私有文件 404、写 API 401；Owner 保存公开内容后访客刷新可见。

首次上线仍需要你决定实际 HTTPS 域名并配置服务器服务；本次没有远程写入或切换线上流量。

## 备份与运维

SQLite 与媒体目录必须一起备份。运行时可用 SQLite backup API 生成数据库快照，不要只复制可能尚有 WAL 写入的主文件。备份应同样受访问控制并定期验证恢复。孤立上传文件保持私有，不自动删除以免误删资料；有需要可通过鉴权 DELETE /api/media/:id 删除无引用文件。

当前实现适用于单 Owner、中小规模资料。没有完整 CMS 的文件转码、全文搜索、版本历史和多用户权限；这些不影响当前上传、编辑、排序、公开／私有和跨设备读取闭环。跨设备访问依赖生产 HTTPS 服务部署，本机 127.0.0.1 本身只供本机使用。
