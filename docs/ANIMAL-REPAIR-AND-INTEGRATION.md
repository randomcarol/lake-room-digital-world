# 动物修复、独立建筑 demo 与接口预研验收

日期：2026-09-14。当前运行时为 **1 只兔子、2 只狐狸、5 只天鹅，以及一个偶发鱼跃特效**；原有 9 只远景飞鸟保留。鱼不常驻、不巡游、不参与拾取。学校与音乐厅是独立页面，未接入房间。

本轮完整交付索引：

1. 动物修改与测试：本文；数据在 `tests/artifacts/animal-repair/`。
2. 三项目对比、复用/适配判断、构建和风险：[技术评审](THREE-PROJECT-REVIEW.md)。
3. 学校：[独立入口](http://127.0.0.1:8942/school.html)、`standalone-demos/school.js`。
4. 音乐厅：[独立入口](http://127.0.0.1:8942/concert.html)、`standalone-demos/concert.js`。
5. 接口：[contracts.ts](../integration/contracts.ts)、[协议](../integration/PROTOCOL.md)、[后续活动映射](../integration/ACTIVITY-PREVIEW.md)。
6. 尺寸、材质、许可与后续资产：[demo 说明](../standalone-demos/README.md)；两个 `*.manifest.json` 含真实文件哈希和依赖。
7. 推荐先独立应用传送、共享身份和结果；依据、缺口和下一轮最小任务见技术评审。
8. 房间预览：[本地房间](http://127.0.0.1:8940/)。这些是本机预览链接，没有部署。
9. 本轮未修改文件的哈希证据见本文末尾。

## 根因与实际修复

兔子模型原来含 Rabbit 主体和 Fur 外壳两个 SkinnedMesh。Fur 使用独立的 `*_1` 骨骼，但三个检查到的动作没有任何轨道驱动这组骨骼。主身体运动时，静止毛壳与身体发生重叠/穿插，容易在转向时出现闪动。旧状态逻辑还在落脚相位和转向之间反复切动作：强制转向 60 秒记录 **1403 次 action 变化**。

修复保留原 GLB 的有纹理主体，在运行时实例中移除失配毛壳；转向先选定稳定观察动作，再决定行走/跳跃，不逐帧重启动作。原始 Rabbit.glb 未改写。当前同条件转向只有 **1 次动作切换**，mesh UUID 恒定，visibility 变化 0。

| 诊断项 | 实际证据与结论 |
|---|---|
| 重复实例 / 重叠 mesh | 原来 3 个独立兔子 actor，每只含 2 个蒙皮 mesh；失配 Fur 外壳是确定问题。当前 1 actor、1 body mesh |
| z-fighting | 发现外壳与身体空间重叠；证据支持穿插/深度竞争。未单独证明所有闪动都属于共面 z-fighting，不把该词当作唯一根因 |
| 透明深度排序 | 原材质 transparent=false、alphaTest=.45、depthWrite=true；不是透明混合排序的典型情况 |
| visibility | 原基线仅启动时变化一次；修复后的强制转向 0 次，不是持续每帧隐藏/显示 |
| NaN / transform | 原诊断 nonFinite=0；新测试逐步验证位置和 yaw 均有限 |
| 地面穿透 | 修复中检测到蒙皮最低点约 -0.01784 m；改为按去重蒙皮顶点对真实地形采样做最低必要抬升。最终最低间隙约 .003 m，保留动画腾空高度 |
| 相机 near/far | 基线 .05 / 420，未改；无证据表明相机裁切是本次根因 |
| 旋转时创建/替换模型 | 修复测试连续检查同一 mesh UUID，60 秒不变；没有每帧创建模型 |

源数据：`diagnosis-before.json`、`contracts.json`。基线属于修复前抓取，没有用修复后的状态覆盖。

## 动物空间与行为验收

| 要求 | 结果 | 证据 |
|---|---|---|
| 鱼平时隐藏、只偶发跳水 | PASS | 只创建 FishJumpEffect，不进入 actors/pickables；前 60 秒 3600 个模拟步中隐藏 3195 步（88.75%） |
| 跳前、腾空、落水、水花连续 | PASS | 起点小涟漪 → 波面上的抛物线 → 落点水花及扩散环；真实截图有四阶段，录像记录完整过程 |
| 鱼频率、随机起落点、质量降级 | PASS | FishJumpConfig：初次 3 s，间隔 7–13 s，跃起 1.35 s，高 1.05 m，区域/扰动/距离可调；low 关闭。低质量断言通过 |
| 合法水域 | PASS | 起落点 validateWater；整段投影路径 motionPath；10 次实跑事件均 invalid=0。事件完成释放水域登记 |
| 仅 1 兔、重复初始化仍为 1 | PASS | Population 排除 rabbit-west/east；3 次完整初始化/释放检查数量和资源登记。旧 habitat 只保留花卉的历史避让范围，不创建 mesh、动画或交互记录 |
| 合并三片兔子活动区 | PASS | 连通路线 x=-12…18、z=-7.6…17，包含原左/中/右区域；通过原地形/花核/道路/建筑禁区规则，节点及段间隔不超过 .1 m 验证 |
| 兔子五种状态 | PASS | 120 秒模拟覆盖 idle、graze、lookAround、walk、hop；静止滑移 0；按 clip 周期、步幅与跳跃相位推进位移 |
| 脚底与转向画面 | PASS | 蒙皮顶点最低间隙 .003 m；60 秒实际渲染转向，检查 0/15/30/45/60 s 画面，主体稳定且未见原外壳穿插 |
| 狐狸左右/树林边缘/中景 | PASS | 120 秒固定机位实跑 x=-24→27；模拟覆盖 z=-5…20，经前侧陆地绕开房间和道路 |
| 路径无水/障碍/瞬移/抖动 | PASS | 每步验证动物半径与表面；最大水平单步 .04391 m，静止滑移 0，surface audit invalid=[] |
| 狐狸低频偶遇 | PASS | 路线端点休息 12–20 s，完成往返后离场 35–60 s；不是围房闭环持续追逐。对岸狐狸保留独立合法短路 |
| debug 展示合并路线 | PASS | `wildlife-merged-routes` 随已有 debug 开关显示；粉色兔子、橙色狐狸连通线路截图 |
| 资源释放与既有花卉 | PASS | 引用/路径清理；32 次四季与质量切换前后几何 232、纹理 87 不增长；春 288 / 夏 198 花及房屋四侧覆盖通过联合回归 |
| 控制台 | PASS | 行为实跑和契约无 pageerror；这只说明运行稳定，视觉通过另由图像/录像检查 |

行走和吃草为本轮在授权骨架上烘焙的 `Room|Walk` / `Room|Graze`：固定躯干的四足错相小步、支撑脚朝向、前伸/抬脚阶段，以及躯干/颈/头低伏和轻微咀嚼。它们不是原模型自带 clip，也不再把放慢 Run 当作 Walk。烘焙在创建时完成，逐帧播放标准 AnimationMixer；地形修正仍为轻量的最低点抬升，下一轮可做坡地逐足 IK 和更自然的耳朵/呼吸。姿态截图 `rabbit-state-*.png` 已单独检查。

## 可直接检查的画面与录像

所有路径均相对项目根目录：

| 内容 | 文件 |
|---|---|
| 固定桌面，鱼隐藏 / 跳前 / 空中 / 水花 | `tests/artifacts/animal-repair/desktop-fish-hidden.png`、`desktop-fish-prelude.png`、`desktop-fish-airborne.png`、`desktop-fish-splash.png` |
| 固定桌面 30 / 60 / 90 / 120 s | 同目录 `desktop-live-30.png` 至 `desktop-live-120.png` |
| 兔子转向 0 / 15 / 30 / 45 / 60 s | 同目录 `rabbit-turn-0.png` 至 `rabbit-turn-60.png` |
| 合并路线 debug | 同目录 `merged-routes-debug.png` |
| 连续实际渲染录像 | 同目录 `wildlife-and-turn.webm`：约 180 s，前 120 s 固定桌面，后 60 s 兔子近距原地转向；Canvas 原生 MediaRecorder、15 fps 捕获 |
| 学校外观、教室/实验室、庭院、手机 | `tests/artifacts/standalone-demos/school-exterior.png`、`school-classroom.png`、`school-courtyard.png`、`school-mobile.png` |
| 音乐厅外观、舞台观众席、排练区、手机 | 同目录 `concert-exterior.png`、`concert-hall.png`、`concert-rehearsal.png`、`concert-mobile.png` |

视觉判断：默认房间首屏仍为原构图；鱼跃很小，符合远景偶发特效，水花没有变成抢眼大型喷泉。近距兔子身体轮廓稳定。学校前窗能读到两种不同家具布局，门厅/校名与庭院关系清楚。音乐厅可读出木拱顶、暖色舞台、合唱台阶和分区座席；排练区有钢琴与谱架。两个 demo 为平色建筑研究，未完成材质细节、角色、碰撞和正式灯光烘焙。

## 性能和测试边界

真实 Chrome + Metal，同一桌面 1280 × 900 固定机位运行 120.207 秒：7195 渲染帧，平均 **59.86 FPS**，最大 **442 draw calls / 884,098 triangles**（来自 `visual-live.json`）。实跑纹理峰值为 89；本地页面及模型 ready/network-idle 检查点约 1.71 s（包含 network-idle 等待，不等同于 LCP）。录像捕获本身有额外开销；本轮没有重新构造完全相同的旧版本做成对性能实验，因此不把历史 60 FPS 数字当作严格提升比例。联合回归暖机后纹理为 87，32 次切换不增长。

独立 demo 在 1440 × 1000 的外观机位：学校 **55 calls / 3,756 triangles / 7 textures**；音乐厅 **93 calls / 15,735 triangles / 8 textures**。这是 renderer 主渲染统计，阴影计算还有成本；不宣称两个 demo 接入房间后的总性能已经验证。手机已生成 390 × 844 实际页面截图，但本轮未做实体低端手机 FPS 测试。

测试脚本：`animal-repair-diagnose.cjs`（历史基线）、`animal-repair-contract.cjs`、`animal-repair-visual.cjs`、`flora-fauna-contract.cjs`（更新为 actor 与 effect 分离，并把新结果保存到 animal-repair，保留旧结果）、`standalone-demos.cjs`。新增契约文件通过 TypeScript strict/noEmit。

## 修改文件与未修改边界

| 修改文件 | 职责 |
|---|---|
| `room-preview/animal-manifest.js` | 当前动物数量、连通路线、状态映射、魚跃参数；不改变历史花卉避让定义 |
| `animal-animation.js` | 稳定动作映射、状态速率/步幅与烘焙四足行走/吃草动画 |
| `animal-movement.js` | 路线中间点验证、必要时合法格点连接、稳定目标方向 |
| `animal-actor.js` | 移除失配毛壳、稳定转向、五状态、脚底采样、休息离场 |
| `animal-system.js` | 鱼跃独立生命周期、无鱼拾取、唯一初始化、连通路线 debug |
| `standalone-demos/` | 两个完全独立外观页面、共享预览工具、vendor MIT、资产 manifest 与说明 |
| `integration/` | 纯接口设计、入口/出口/身份/结果/迁移/错误协议、咖啡及湖雪山评估 |
| `tests/` 与 `docs/`、README | 自动验证、真实图像/录像、技术评审和当前状态说明 |

以下 **12 个文件 SHA-256 与本轮修改前完全一致**：

`room-preview/environment.js`、`world-state.js`、`world-surface.js`、`flower-system.js`、`landscape-assets.js`、`sun-rig.js`、`village.js`、`room.js`、`camera-controller.js`、`interactions.js`、`experiences.js`、`index.html`。

证据：`tests/artifacts/animal-repair/protected-before.json` 和 `contracts.json → protectedFiles`。后端、数据库、学校/合唱团原项目、GLB 源资产、房间布局及交互入口均未改写；两个外观 demo 不在房间脚本依赖中。没有实现第一/第三人称、实时合唱、完整课程、咖啡小游戏、湖雪山物理或部署。

当前可完成的修复、评审、独立 demo 与预研已交付。下一步等待用户确认两个建筑视觉方向和独立应用传送方案，再实施技术评审末尾的最小验证链路。
