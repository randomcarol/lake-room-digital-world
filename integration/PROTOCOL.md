# 共享协议预研 v1（只设计，未接入）

类型入口为 `contracts.ts`。三个项目保持独立；本目录没有服务端路由、实际积分发放、跳转或对房间运行时的 import。`standalone-demos` 也是纯外观预览，没有实现 SceneModule 挂载。

## 入口、出口与版本

所有 3D 模块采用米、右手系、+Y 向上、+Z 模型正前方，入口另附 yaw、净空和地表类别。坐标是各场景局部坐标，不直接沿用房间世界坐标；任何 future spawn 必须先由目标场景验证碰撞及脚下地表，学校/音乐厅当前标记还不是可行走碰撞承诺。

未来同页 SceneModule 的两阶段流程：宿主发出 TransitionRequest → 检查目标 allowlist、协议主版本、模块主版本、引擎 revision → 预加载必需资源并核对 hash/许可 → 校验 spawn → 目标返回 scene.ready → 用户进入后 commit → 原场景 unmount。提交前失败保持原场景可用。取消必须传递 AbortSignal，晚到的下载不得重新挂载已离开的场景。重复 mount 返回 LIFECYCLE_CONFLICT 或先完整 unmount，不能添加第二棵相同场景树。

SceneModule 是未来 3D 适配器契约，ActivityModule 是学习/音乐等领域契约，二者不要求同一个渲染引擎。第一阶段推荐独立应用传送：目标页面启动自己的应用，返回使用已登记 returnToId；不把任意 return URL 当作可执行导航。不在同一 window 同时加载多个 Three.js，3D 宿主未来只提供一个 renderer 和明确版本的 engine adapter。

独立应用的整页导航采用另一条实际可执行的时序：源应用先保存恢复点，服务端预检目标版本/可用性并创建 ticket，成功后导航到目标登记入口；目标兑换身份、启动自己的应用、成功后确认 transition。此时旧页面已经卸载，不能承诺像同页模块那样保留旧 renderer。目标加载失败展示重试/已登记返回入口；连目标错误页也无法加载时，浏览器返回依靠源应用恢复点恢复。不要等待已卸载页面接收 scene.ready，也不要把全页跳转描述成同页无缝切场景。

## 身份和跨应用结果

当前三个项目没有可共用的玩家身份服务：房间 owner 登录服务只管理内容；学校的 ChatGPT header 辅助函数是框架脚手架，学习页未调用；合唱团没有账号。因此 PlayerContext 暂为接口，不能把本地 localStorage 用户或 owner 当成统一玩家。

后续身份服务应支持标准身份提供方；采用授权码流程、PKCE 与精确登记的回调地址，不在 URL 传 access token 或完整用户资料。安全依据：[OAuth 2.0 Security BCP，RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)。具体身份提供方和部署拓扑仍需选择。

产品应用间传送使用服务端生成的短期、单次、绑定 targetOrigin / transitionId / player 的不透明 code（建议 TTL 60 秒）。目标后端 POST 兑换，校验 state 和原目标，并使用自身 HttpOnly 会话。页面收到的 playerId/points/奖励都不能直接成为权威数据。`points.granted` 和 `reward.granted` 只允许积分服务发出，不能信任 browser 伪造的事件。

活动结束先 POST ActivityResult 到服务端，服务端按 attemptId、playerId、activityId 和评分策略版本校验、去重，再返回 ResultReceipt；返回页面只传 receiptId。服务端拒绝相同 attempt 的矛盾终态，重发同一结果返回同一 receipt，避免刷新/重试重复积分。离线时保存 pending result，不发正式奖励；联网后核验，失败保持原学习记录。

如果未来选择 iframe，发送者指定精确 targetOrigin，接收者检查 event.origin、event.source、协议 schema、相关 transitionId，并限制消息类型。postMessage 本身不构成身份认证。依据：[MDN postMessage 安全约束](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns)。本轮未建立 iframe 连接。

## 学习证据、评分和奖励

学校 LearningEvent 适配为 learning.evidence-recorded，保留阅读、听力、表达等维度及证据 ID；完成课程才产生 activity.completed。不能把多个语言维度直接相加伪装为能力等级。合唱团录音、练习、音高检测属于自己的领域证据；有录音不等于唱准，无足够数据时 Score.normalized 为 null。

ActivityResult 的评分是候选结果，积分服务依据版本化 policy 重新校验。Reward 默认 proposed，只有服务端 receipt/ledger 确认后变为 granted。每个积分事件具有 eventId、attemptId 和 ledgerId；消费者去重并检查 balance revision。上传证据只发送用户授权的最小字段，原始麦克风 Blob、课程全文和用户文本不进入导航 URL 或通用消息。

## 存档与迁移

统一 SaveEnvelope 与各领域 payload 分开，版本不等于 App 版本。旧学校键 `ai-international-school:learning:v1` 和合唱团 `heshengli-project-v1` 不覆盖、不合并删除。未来首次导入先保留原始备份，再校验、迁移到新命名空间并提交。

v1 → v2 草案：将单一 progress 拆为 `domains.school` / `domains.choir`，把无权威来源的旧 points 标为 legacyDisplayPoints，而不是充值积分；school schemaVersion=1 保留 evidence；choir 只导入已校验的曲目/练习元数据，`recordedParts` 无对应音频时降级为“需重新录制”。

迁移必须纯函数、单版本连续前进、验证输出、失败原子回滚；只在成功后提升 saveVersion。未知更高版本返回 SAVE_TOO_NEW 并只读，不默默生成新存档覆盖它。多端并发使用 revision/ETag，冲突时合并 append-only 事件并按 eventId 去重，录音 Blob 另存 IndexedDB/对象存储并通过引用管理；本轮不实现这些存储。

## 资源与错误

AssetManifest 明确作者、原始链接、证据文件、许可审核状态、许可用途、署名、hash、字节数、格式、压缩、动画和依赖。pending/restricted 资产不能因“能加载”而通过发布门；项目原创不自动等于 MIT/CC0。glTF、PBR 贴图可复用，但模型尺寸、贴图色彩空间、骨骼 clip 和 decoder 版本均需适配验证。

所有错误结构见 IntegrationError：可重试、关联 ID、期望/实际版本及回退方式独立于给用户看的消息。必需模型缺失/校验失败回退 stay；非必需装饰可用 placeholder；身份缺失不清理本地学习记录；协议/引擎不兼容不能尝试强制执行；日志不记录 code、token、用户音频或完整学习回答。

## 下一轮最小接口验证（需用户确认后）

先用两个独立测试页传递一次带 state 的演示 transition 和一条去重 ActivityResult；结果只进入测试账本。证明卸载/返回、版本错误、取消、重复完成和离线回收后，再决定是否接入真实身份服务。不得先把三个源码树合并来验证产品方向。
