# 三项目技术评审 · 2026-09-14

结论：三个项目适合朝同一个产品发展，但当前证据支持**独立应用传送 + 共享身份/结果协议**，不支持把源码直接拼入同一个 Three.js 场景。本轮未合并、未部署，也未改写学校和合唱团原项目。两个新建筑 demo 仅作独立外观评审。

## 检查范围与项目对比

实际读取的目录均存在：

- 房间：`/Users/dengzhilei/Documents/ChatGPT/3d房间`
- 学校：`/Users/dengzhilei/Documents/ChatGPT/ai国际学校`，主要应用位于 `school-app/`；`campus-demo/` 是另一个二维校园原型。
- 合唱团：`/Users/dengzhilei/Documents/ChatGPT/一人合唱团`

以下版本来自当前 package/锁文件/已安装包以及房间本地 vendor，不由目录名推断。源码路径均相对上述各自根目录。

| 检查项 | 3D 房间 | AI 国际学校 | 一人合唱团 |
|---|---|---|---|
| 语言/框架 | 原生 HTML/JS，全局 Three.js **r128** | React/ReactDOM **19.2.6**、Next **16.2.6**、Vinext **1.0.0-beta.5**、Vite **8.0.13**、TS **5.9.3** | React **19.3.0**、Vite **8.3.0**、TS **7.0.2**；pitchy **4.1.0**、@tonejs/midi **2.0.28** |
| 渲染引擎 | WebGLRenderer、GLTFLoader、原生 shader | DOM/React；二维校园图片热点；未发现 Three/R3F/Unity/Unreal 引擎依赖 | DOM/React、SVG 音高界面、Web Audio；未发现 Three/R3F/Unity/Unreal 引擎依赖 |
| 入口 | `room-preview/index.html` → `room.js` | `school-app/app/page.tsx` → `components/learning-app.tsx`；校园原型独立 HTML | `src/main.tsx` → `App.tsx`，按 page 状态选择练习/录音/结果页面 |
| 启动/构建 | 静态 `python3 -m http.server ... --directory room-preview`；完整内容服务 `python3 backend/server.py`；无 npm 编译 | `pnpm dev/build` → `node scripts/run-framework.mjs dev/build`；`pnpm start` 用 Wrangler 本地 worker | `npm run dev`；`npm run build` = `tsc -b && vite build` |
| 模型/纹理/动画 | GLB、glTF、PNG/JPEG；部分室内资产 Draco；动物骨骼 GLB；大量程序材质/Canvas | public 中 8 WAV、3 PNG、4 SVG；校园原型生成图片；未发现角色/校园 3D 骨骼模型 | public 中 SVG；音频由 Web Audio 合成或用户录音；本地导入 MIDI/未压缩 score-partwise MusicXML，无现成 3D 音乐厅 |
| 玩家/相机 | 概览环绕与物件聚焦；没有可行走玩家控制器 | 学习流程与校园图片缩放；无 3D 玩家相机 | 业务页面切换；无 3D 玩家相机 |
| 碰撞 | WorldSurface 地面/水域、占地、路径中间点规则；不是完整动态物理引擎 | 无校园三维碰撞 | 无三维碰撞 |
| 交互 | 射线拾取、物件气泡、六类内容体验；动物拾取独立列表 | 课程步骤、听读写与词汇反馈；口语准备/自我确认不等于语音评分 | 选曲、练习、麦克风、录音、多轨播放和本地导入 |
| 保存 | SQLite 是 Owner 内容库；浏览器偏好/体验状态不是统一玩家存档 | `LocalLearningRepository`，localStorage `ai-international-school:learning:v1`；schemaVersion 1、事件 ID 去重、内存后备 | localStorage `heshengli-project-v1`；保存步骤/已录声部等元数据，实际录音 Blob/轨道在会话状态中 |
| API/身份 | Python ThreadingHTTPServer + SQLite；公开 `/api/content`；Owner 密码、session、CSRF | Vinext/Cloudflare worker 脚手架、D1/R2 配置；`db/schema.ts` 为空；学习仓库仍本地。`app/chatgpt-auth.ts` 有托管身份助手，但学习应用未调用 | 当前源码未见服务端用户认证或结果 API；Web Audio/Microphone 是浏览器本地能力 |
| 积分/奖励 | 无统一玩家积分账本；Owner 登录不是玩家身份 | 有学习维度评分/证据，尚非跨应用积分货币 | 有练习与录音结果状态；没有可信的共享奖励账本 |
| 动态加载/切换 | 模型异步加载；无应用级 mount/unmount 场景协议 | 应用路由/课程步骤可切换，不等于 3D SceneModule | React 页面/音频模块生命周期；不是房间场景模块 |
| 重复 Three runtime | 房间页面单份 r128；新的 demo 每页单份 r128，页面之间隔离 | 当前依赖未见 Three；不能把新 demo 的 window.THREE 嵌回房间再加载一次 | 同左；库对象不能跨版本/iframe 直接共享 |
| 部署 | 静态预览或 Python + Nginx/systemd 内容服务 | Vinext 的 client/RSC/SSR 及 Cloudflare worker 产物，非仅复制静态 HTML | Vite 静态 dist，可独立托管；麦克风需浏览器认可的安全上下文与权限 |

版本注意：合唱团 package.json 大量使用 `latest`，表中是本次安装/锁定结果，不保证重新无锁安装相同。学校有框架包装脚本与托管环境适配，不能用“都是 JavaScript”推导部署兼容。

## 实际构建与验证

为保持另外两个原项目只读，排除 `.git`、私有环境文件及输出目录，复制源码到 `/tmp/room-integration-review/school` 和 `/tmp/room-integration-review/choir`；依赖复用当前安装包，构建缓存和输出留在临时副本。没有运行发布命令。

| 对象 | 本次执行 | 结果与范围 |
|---|---|---|
| 学校 | `node scripts/run-framework.mjs build` | 退出 0；完成 Vinext client/RSC/SSR 构建。`/` 路由静态分类显示 unknown，是构建分析提示，不能据此声称纯静态兼容 |
| 学校 | `node scripts/run-tests.mjs` | 7 项通过，覆盖现有学习流程/存储/评分逻辑；不是校园三维或正式登录测试 |
| 合唱团 | `node node_modules/typescript/bin/tsc -b --pretty false` | 退出 0 |
| 合唱团 | `node node_modules/vite/bin/vite.js build --configLoader runner` | 退出 0，55 modules；HTML 0.63 KB、CSS 26.52 KB、JS 307.05 KB（gzip 96.91 KB） |
| 合唱团 | `node node_modules/vitest/vitest.mjs run` | 8 个测试文件、18 项通过；不能替代不同设备麦克风延迟实测 |
| 本轮接口 | `tsc --strict --noEmit --lib ES2022,DOM integration/contracts.ts` | 类型检查通过，未导入任何生产入口 |
| 房间动物 | 120 秒固定机位 + 60 秒兔子转向录像；7200 步契约 | 详见 [本轮验收](ANIMAL-REPAIR-AND-INTEGRATION.md)；没有新增应用构建流程 |

构建产物及命令摘要登记于 `tests/artifacts/integration/project-evidence.json`。成功本地构建不证明线上身份、跨域返回、部署密钥、数据迁移或实时音频成立。

## 可复用、需适配、暂不接入

| 内容 | 建议 | 具体边界 |
|---|---|---|
| 学校 `lib/learning/{types,flow,scoring}.ts` | 复用纯类型和规则，经 ActivityModule 包装 | 保留原学习维度/证据，不把课程完成数直接当作掌握程度；仓库存储通过接口替换 |
| 学校 React 课程页面 | 先保留独立应用 | 依赖框架、CSS、路由/托管上下文，不能直接变成 Three Object3D |
| 合唱团 `src/audio/`、`src/types/music.ts` | 复用解析/音频逻辑，增加生命周期适配 | AudioContext、MediaStream、定时器、object URL 必须由模块管理和释放；浏览器授权仍由用户触发 |
| 合唱团记录/评分 | 通过 ActivityResult 传递已核实证据 | 录过音不等于音准合格；必须区分未评分、完成和有效音频文件 |
| 房间 WorldSurface 与动物路径 | 保留房间局部使用 | 学校/音乐厅需要自己的地面与碰撞数据；不能复用湖岸坐标和禁区作为其空间规则 |
| 室内及动物 GLB | 授权逐项确认后可复用 | 统一单位、轴向、动画命名与纹理色彩；Fox 保留署名；未核实室内模型先不跨项目再分发 |
| 两个建筑 demo | 用作视觉与尺度候选 | 尚无行走碰撞、门控动画、正式模型包或接入代码 |
| 登录、积分、奖励、存档 | 必须共享协议与服务适配 | 不能拼接 Owner session、托管身份 header 与无登录客户端；积分由可信账本裁决 |

推荐分阶段：第一阶段独立应用传送，分别保留当前工具链，中心服务提供玩家身份、尝试 ID、结果回执和存档命名空间；ActivityModule 作为各应用内部适配。第二阶段在明确空间产品方向后制作独立 SceneModule，统一资源租约和进出协议。是否最终统一 Three 运行时，应由真实整合样例、移动性能及资产授权决定，本轮不升级或替换 r128。

统一运行时现在成本较高：需要把房间全局变量、独立 renderer、React 根与 Vinext worker 生命周期拆开，并处理版本、CSS 和音频权限。先独立应用能验证产品链路，同时保留回退和发布隔离；用户仍可在未来获得一个产品身份与连续进度。

接口和身份/结果时序详见 [integration/PROTOCOL.md](../integration/PROTOCOL.md)，纯类型见 [contracts.ts](../integration/contracts.ts)。方案包含单次短期交接凭据、精确目标 origin、可信结果回执、幂等积分与迁移失败回退；本轮没有实现这些服务。

## 许可证、保存与性能风险

1. **资产许可**：Rabbit 本地登记 CC0；Fox 模型 CC0、动画/转换 CC BY 4.0，署名见 `room-preview/animal-manifest.js` 和 `models/animals/fox/SOURCE.md`。Swan/Fish 和本轮建筑为项目原创，无新增第三方动物/建筑下载。原室内模型未找到完整逐项许可证证明，跨项目发布前需补齐。学校生成图的生成记录与课程适配来源、WAV 声音来源/使用范围需归档；不能因为文件在 public 就视为可任意分发。
2. **音乐内容**：`src/data/songLibrary.ts` 的公版旋律/原创改编与 `public/licensed-audio/README.md` 是现有证据。《彩虹》仍为待授权条目，没有因此获得歌词、旋律或商业录音授权。用户录音也需独立隐私/保存规则。本轮未导入新歌曲或录音。
3. **保存可靠性**：学校 `validSession` 只检查部分顶层字段；合唱团 `JSON.parse(...) as SavedProject` 缺少完整结构校验，版本隐含在 key。合唱团存档中 recordedParts 不能证明刷新后仍有录音 Blob。迁移应保留原档，标记缺失录音为待重录，禁止伪造轨道或评分。
4. **服务与版本**：没有跨应用共享身份/积分后端证据。学校 Cloudflare runtime 与房间 Python 服务不共用部署环境；合唱团 latest 依赖需冻结。构建通过仅证明本次环境能生成产物。
5. **性能**：房间本轮 120 秒录像实跑约 59.86 FPS，最大 442 calls / 884,098 triangles。学校/音乐厅独立外观仅 55 / 93 calls；这些是独立 renderer 数据，不能相加后宣称统一运行时也能 60 FPS。兔子地面校正逐帧采样蒙皮顶点，低端设备还需专项 profiling。

尚缺证据：室内及学校部分媒体逐项授权、目标部署域名与身份所有者、真实身份交接与结果防重放测试、录音持久化/恢复、不同浏览器设备权限与延迟、正式建筑碰撞和 LOD、统一样例的内存释放与手机帧率。这些影响下一轮上线与整合决策，未阻止本轮独立 demo/协议预研完成。

## 下一轮最小任务（待确认后实施）

先确认学校的暖白青绿/音乐厅木拱顶视觉方向，以及“独立应用传送”方案。之后只做两个隔离页面间的一次演示交接：固定测试玩家、一次学校 ActivityResult、返回回执、重复提交去重、过期/取消回退；不改正式积分或房间入口。通过后再接真实身份服务和一个学习活动适配器。咖啡与湖雪山活动只保留 [后续评估](../integration/ACTIVITY-PREVIEW.md)。
