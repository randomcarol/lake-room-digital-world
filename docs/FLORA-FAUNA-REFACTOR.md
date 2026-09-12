# 春夏花卉与动画动物：实测交付

2026-09-12 完成。保留上一轮湖泊、远山、小镇、Sun Rig、四季主体和 desktop/mobile QA 相机。本报告中的数量、动画和性能来自真实页面、模型文件解析、固定机位截图与 120 秒浏览器模拟。

## 1. 实际修改文件

| 文件 | 职责 |
|---|---|
| `room-preview/world-state.js` | 四季独立 flower preset：开关、数量、调色板、物种、缩放、花丛、风和 bloom |
| `room-preview/world-surface.js` | 房间、道路、石板、码头、岩石、房屋、花丛核心的避障；陆地/水域动物完整路径采样 |
| `room-preview/flower-system.js` | 4 种近景立体花、交叉面中景花、确定性花丛、实例化、风动和质量档 |
| `room-preview/animal-manifest.js` | 资产来源、作者、许可、文件、原生 clip、比例、贴图、校验和与 blocker |
| `animal-loader.js` / `animal-animation.js` | GLTFLoader Promise 缓存、独立骨架克隆、失败回收、AnimationMixer 与 crossfade |
| `animal-movement.js` / `animal-actor.js` / `animal-system.js` | 路径控制、状态机、原生步态同步、隐藏拾取、交互故事、生命周期 facade |
| `environment.js` / `index.html` | 花与动物接入、debug 图层、质量和阴影更新、脚本依赖顺序 |
| `room-preview/models/animals/` | 本地 Rabbit.glb、Fox.glb、许可与转换记录 |
| `tools/animal-import/` | 可复现的 Rabbit FBX → GLB 离线转换工具及 Three.js r128 MIT 辅助文件 |
| `tests/flora-fauna-*.cjs`、`animal-assets.cjs` | 固定相机、性能、空间、120 秒状态、资源、加载失败、截图与资产文件验证 |
| `tests/personal-world-visual.cjs`、`tahoe-browser.cjs`、`environment-contract.cjs`、`static-check.py` | 将旧的“动物必须为 0”合同更新为 GLTF-only 合同 |

## 2. 春季花卉

高质量模式为 **216 株、8 个花丛**；低质量模式 108 株。四个近景花型为 `daisy`、`buttercup`、`campanula`、`lavender`，中景使用无矩形底色的交叉双平面。颜色为乳白、奶黄、浅粉、淡紫和少量浅蓝；缩放 0.78–1.13，bloom 0.86，轻风强度 0.016。

## 3. 夏季花卉

高质量模式为 **132 株、6 个花丛**；低质量模式 66 株。保留四个花型但以白、暖黄、橙粉和少量蓝紫重新配色；花冠更饱满、茎色更深。缩放 0.88–1.25，bloom 1.06，风强度 0.013。它与春季使用不同确定性种子、中心和实例，而非仅切换颜色。

## 4. Geometry、材质、实例化与风

近景每株有五边柱花茎、低面数叶片和独立花冠。四类花按几何批为 4 个 InstancedMesh；中景全部进入第 5 个 InstancedMesh。花材质接受 Standard 场景光，不发光、不投实时阴影；每实例使用颜色、旋转、缩放和小倾角。顶点着色器复用环境 `time` uniform，以世界位置错相轻摆。季节切换只调整 count、矩阵、颜色和 uniform，不创建新 geometry/material/texture。

## 5. WorldSurface 花卉验证

登记了 348 个春夏实例和 14 个花丛中心。所有 footprint 使用 17 点圆周/中心检查；花根相对实际渲染地形三角面的最大误差为 **0.000000014 m**。最终 audit 为 730 个陆地放置，invalid 0；水中、岸线安全带、房间、房屋地基、道路、码头、石板、岸石与动物预留走廊冲突均为 0。

## 6. 动物资产、许可与本地文件

| 动物 | 来源、作者、许可 | 本地文件与处理 |
|---|---|---|
| Rabbit | [OpenGameArt 原始页](https://opengameart.org/content/rabbit-0)；Čestmír Dammer（CDmir），页面列 TinyWorlds 为 collaborator，原包写 idea by Rick Hoppmann & Keppu；CC0 1.0 | `models/animals/rabbit/Rabbit.glb`，2,361,252 B，SHA-256 `aa7abb...90d1c`；作者 FBX 离线转换，3 张 PNG 从 1024 压至 512，移除无用 clip，无 Draco |
| Fox | [Khronos glTF Sample Assets 原始页](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox)；模型 PixelMannen（CC0），绑定动画 tomkranis（CC BY 4.0），glTF 转换 @AsoboStudio / @scurest（CC BY 4.0） | `models/animals/fox/Fox.glb`，162,852 B，SHA-256 `d97044...471f7`；原始 GLB、内嵌 1024 PNG、无 Draco |
| Swan | **停用**：未找到同时有明确许可、可下载文件和原生 idle/swim 的合格天鹅 | 不加载、不产生 mesh 或 pickable |
| Fish | **停用**：没有通过淡水风格、动画和水下可读性复核的模型 | 不加载、不以旧 primitive 或海鱼替代 |

Fox 的 CC BY 署名原文与本地副本在 `models/animals/fox/SOURCE.md`；Rabbit 原包许可在 `models/animals/rabbit/LICENSE.txt`。完整、机器可检验的数据在 `animal-manifest.js`。

## 7. 实际 AnimationClip

- Rabbit：`Armature|Jump`、`Armature|Running`、`Armature|Guarding`、`Armature|Sitting.000`。MVP 使用 Sitting 待机、Guarding 观察、Jump 跳跃；Running 保留在资产中但不用于假装跳跃。
- Fox：`Survey`、`Walk`、`Run`。MVP 使用 Survey 待机/观察、Walk 行走/离场；Run 当前不用。

`animal-assets.cjs` 直接解析 GLB JSON chunk 验证这些名称，并断言文件长度、SHA-256、skin、贴图尺寸和无 Draco 要求。

## 8. 状态机与路径

Rabbit 在四点近岸草地走廊中按 `idle → hop → idle/lookAround` 活动。水平速度由 Jump clip duration 和 0.55 m stride 得出，只有原生起跳区间推进位置，落地阶段停住，因此不会贴地匀速滑行。Fox 沿树林边缘四点短路径 `lookAround → walk → leave`，回到入口后隐藏 22–38 秒再出现，形成偶遇感。

每段路线按不大于 0.1 m 的间隔验证完整 footprint。转向超过 0.12 rad 时先原地转身再前进。夜间或狐狸离场时同步移出 pickables。`describe()` 保留名称、当前中文状态和故事。

## 9. 已完成与停用项

Rabbit 和 Fox 已完成本地 GLB、原生骨骼动画、AnimationMixer、路径、状态、交互、隐藏和资源回收。Swan 与 Fish 按资产规则停用；loader、water path、深度、岸线和码头避让合同已实现并通过正反例测试。没有恢复任何 Sphere/Cylinder/Cone primitive 动物。

## 10. 测试与结果

```sh
node tests/animal-assets.cjs
node tests/world-surface.cjs
node tests/flora-fauna-contract.cjs
node tests/flora-fauna-qa.cjs
node tests/flora-fauna-detail.cjs
node tests/environment-contract.cjs
python3 tests/static-check.py
```

核心合同结果：`fail: []`，页面错误 0；Rabbit 65 种腿部骨骼姿态，Fox 197 种；模拟 120 秒 / 7,200 步，最大单帧位移 0.023213 m；没有 NaN、越界、瞬移、idle 滑动或重复 actor。32 次季节/日夜/质量切换前后 GPU memory 均为 185 geometries / 79 textures；缺失 GLB 测试进入 `failed`，动物数与 pickables 均为 0。

## 11. 固定相机截图

`tests/artifacts/flora-fauna/before/` 与 `after/` 保存 desktop summer/spring day、spring dusk、autumn/winter day、mobile summer/spring day。`after/flowers-{spring,summer}-detail.png` 是花型特写；`rabbit-idle.png` 与 `rabbit-hop-{215,240,262,292}.png` 是实际状态连续证据；`fox-encounter.png` 是实际路径上的 Walk；`debug-near-surface-paths.png` 和 `debug-surface.png` 显示花丛、道路、动物走廊、岸线与阴影 frustum。Swan 截图因资产 blocker 明确缺失，没有伪造。

## 12. 性能对比

同一 Apple M2 / Chrome / ANGLE Metal、1280 × 900 DPR1、固定 desktop camera、等待 3.2 秒、采样 4 秒：

| summer/day | before | after | 变化 |
|---|---:|---:|---:|
| draw calls | 426 | 434 | +1.88% |
| triangles | 844,048 | 863,638 | +2.32% |
| textures | 76 | 84 | +8 |
| geometries | 222 | 229 | +7 |
| FPS | 60.11 | 60.22 | 维持 60 Hz |

Spring/day after 为 435 calls、871,438 triangles、84 textures、60.17 FPS。均明显低于 +12% calls / +20% triangles 预算，FPS 高于 55。低质量花量减半，动物 mixer 以 30 Hz 更新，但 Rabbit 和 Fox 仍保留。

## 13. 已知限制与下一轮

当前花型是风格化低多边形，近距离仍可看出有限瓣数；这符合房间默认视角和性能边界。Rabbit 的源模型比场景低模树更写实，已通过尺寸、贴图和阴影融入，但下一轮可制作经许可的低模重拓扑版本。动物没有 navmesh，使用经逐段验证的短路线，符合本轮 MVP。下一轮优先取得有真实 swim/preen 的低面数 Swan GLB，再加入水面高度、航向和点击验收；Fish 仅在水体透明度与模型可读性一并解决后接入。
