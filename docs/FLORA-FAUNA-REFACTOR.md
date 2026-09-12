# 春夏花卉、动画动物与缓慢湖浪：实际交付

2026-09-12。承接上一轮湖泊、远山、小镇、Sun Rig 和四季，按后续要求扩大花卉分布、动物数量与活动范围，并加入缓慢湖浪。预览：[本机 3D Room](http://127.0.0.1:8940/)。[截图对比与特写](../tests/artifacts/flora-fauna/gallery.html)。

## 1. 诊断与修改文件

原来花丛集中在近岸，兔子与狐狸各一条较短路线，动画与位移速度偏慢；天鹅与鱼仍因外部资产条件停用；水面只有法线波纹、没有网格起伏。本轮新增资产和数量后，还在实际截图中发现窗玻璃与水面排序冲突，在真实销毁测试中发现 r128 不支持的 removeFromParent 调用，两者均已修复。

| 文件 | 本轮职责 |
|---|---|
| room-preview/world-state.js | 独立春夏花卉配置 |
| room-preview/flower-system.js | 四种花型、房屋四周种植、实例化、颜色与风动 |
| room-preview/world-surface.js | 干地/水域、障碍物、完整路线与花丛 footprint 审计；水波采样 |
| room-preview/animal-manifest.js | 四类资产出处/许可/校验和；13 个实例、统一栖息地、速度和质量配置 |
| room-preview/animal-loader.js | GLTFLoader 缓存、几何材质共享、独立骨架、引用计数与释放 |
| room-preview/animal-animation.js | AnimationMixer、clip 映射、crossfade、动画与水平速度同步 |
| room-preview/animal-movement.js | 分段路线、安全采样、先转向后移动、随机折返与注销 |
| room-preview/animal-actor.js | 步态、停留、夜间隐藏、独立随机种子、随波高度、r128 生命周期 |
| room-preview/animal-system.js | 13 只动物加载/更新/拾取/质量与销毁 facade |
| room-preview/bird-system.js | 9 只原创远景翼形剪影，共用动态缓冲区、1 次绘制 |
| room-preview/environment.js、index.html | 湖面网格、统一波场与法线、透明排序、飞鸟/动物接入、debug |
| room-preview/models/animals/ | Rabbit、Fox、原创 Swan、LakeFish GLB 及各自来源记录 |
| tools/animal-import/ | Rabbit FBX 转换；原创水生动物生成器；r128 MIT 导出辅助代码 |
| tests/flora-fauna-*.cjs、animal-assets.cjs | 空间、动画、生命周期、性能预算、固定机位与特写验证 |
| tests/environment-contract.cjs、world-surface.cjs、static-check.py | 原有地表、季节、光照与交互回归 |
| docs/ENVIRONMENT-ASSETS.md | 将历史资产 blocker 更新为当前状态 |

## 2. 春季花卉

288 株、12 丛，花丛半径 1.48 m；低画质 144 株。乳白、奶黄、浅粉、淡紫、少量浅蓝，缩放 0.78–1.13，bloom 0.86，风幅 0.016。房间四边均有种植：左 5、右 4、前 3、后 6 个花丛中心（角部同时属于两边）。既有湖旁花丛，也有侧墙旁和房间前方花丛。

## 3. 夏季花卉

198 株、9 丛，半径 1.38 m；低画质 99 株。乳白、暖黄、橙粉、蓝紫，缩放 0.88–1.25，bloom 1.06，风幅 0.013。左 5、右 2、前 3、后 4 个中心。春夏不同种子、数量、中心、配色、尺寸与花冠饱满度；秋冬不保留盛开的春夏花。

## 4. 花型、材质与分布

近景 daisy / buttercup / campanula / lavender 均有实体花茎、叶片和花冠；四种几何分成 4 个 InstancedMesh，中景完整花形图集使用第 5 批交叉面。花丛内部非整齐网格，每株有尺度、方向、颜色和轻微倾角差异。保持道路和码头通畅，四周留有草地间隔，避免花铺满地面抢走房间。花冠颜色与茎色分开，接受真实场景光，不添加悬空发光球。

季节切换只更新实例缓冲和 uniform；低画质实例数减半，不在切换时反复创建材质或贴图。

## 5. WorldSurface 验证

登记 486 株春夏花、21 个完整花丛 footprint，随季节选择显示；它们不是同时全部渲染。所有花/花丛使用 17 点 footprint 检查，避开水域、岸线禁种带、房间、房屋、石头、道路、码头及预留动物走廊。

花根对实际渲染三角地形的最大误差 2.878e-8 m。最终审计 878 个陆地登记物件、8 只水生动物、所有道路/动物路线与预留走廊，invalid 为 0。动物路线每段采样间隔不超过 0.1 m；不以“有一个山对象”或“无页面错误”替代空间验证。

## 6. 模型、贴图来源与许可

| 资产 | 作者、原始来源、许可 | 文件与压缩 |
|---|---|---|
| Rabbit | Čestmír Dammer / CDmir；TinyWorlds 为页面 collaborator；idea by Rick Hoppmann & Keppu。[原始页](https://opengameart.org/content/rabbit-0)、[原包](https://opengameart.org/sites/default/files/rabbit-FBX.7z)。CC0 1.0 | Rabbit.glb，2,361,252 B，2,640 三角形；FBX 转 GLB，3 张 PNG 降至 512，保留 4 个 clip，无 Draco |
| Fox | PixelMannen 模型 CC0；tomkranis 绑定动画 CC BY 4.0；@AsoboStudio / @scurest 转换 CC BY 4.0。[原始页](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox)、[GLB](https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb) | Fox.glb，162,852 B，576 三角形；保留原 GLB、1 张 1024 PNG，无 Draco。SOURCE.md 保留署名 |
| Swan | 按用户后续允许自行建模的要求，本项目原创；无第三方模型或动画数据。[原始生成源码](../tools/animal-import/build-water-wildlife.cjs) | Swan.glb，56,636 B，282 三角形，1 skin、0 贴图；GLB、顶点颜色、无 Draco；5 个实例共享资产 |
| LakeFish | 本项目原创，无第三方模型或动画数据；同一生成源码 | LakeFish.glb，23,260 B，110 三角形，1 skin、0 贴图；GLB、顶点颜色、无 Draco；3 个实例共享资产 |
| 花卉、花形图集、飞鸟和波场 | 项目原创代码；flower-system.js / bird-system.js / environment.js | 花图集 128×256 Canvas；飞鸟无贴图；水波无外部 normal map，使用解析波场法线 |
| 离线工具 | Three.js r128 GLTFExporter / FBXLoader 及配套辅助代码，保留 vendor/THREE-LICENSE 和源码许可头 | 不升级运行时，不加载最新 module 示例 |

原创资产未代替用户额外声明 CC0 等对外再许可。完整 SHA-256、文件长度和 clip 校验结果见 [assets.json](../tests/artifacts/flora-fauna/assets.json)；元数据在 animal-manifest.js，原始署名和处理说明在各模型 SOURCE.md。

## 7. 实际动画

Rabbit：Sitting.000 待机、Guarding 观察、Jump 跳跃（均带 Armature| 前缀）；Running 保留但不使用。狐狸：Survey 待机/观察、Walk 行走/离开；Run 保留。天鹅：Idle 与 Swim，Preen 在文件中保留但暂不用于状态机。鱼：Idle、Swim 尾部摆动。四类均为实际 GLB skin + AnimationMixer，13 个实例各有独立骨架；未恢复旧的运行时 primitive 拼装动物。

## 8. 数量、速度与随机活动

3 只兔子，分别沿窗后、房间西侧、东侧活动；主要兔子的路线由约 8.3 m 扩至约 13.8 m，另外两条约 11–12 m。Jump 动画速率 1.6，步幅 0.65 m，移动周期平均 1.04 m/s，仅在原生起跳区间推进水平位置。狐狸动画速率 1.35、步幅 0.60 m；近岸路线长约 24 m，增加对岸小镇边缘狐狸。

5 只天鹅分散在近湖和对岸水域；3 条鱼沿近岸安全深水路线活动；天空有 9 只远景飞鸟。天鹅水域范围与路线明显扩大，每只使用独立随机种子和停留时长，内部节点有概率折返，不同步整齐往返。地面动物夜间隐藏；天鹅、鱼保留。低画质保留核心兔子、狐狸、天鹅、鱼，隐藏额外实例，飞鸟从 9 减至 4。

随机活动限制在已验证的折线路线上，不是 navmesh 任意漫游。转向时停止水平位移；兔子落地后再开始停留。隐藏动物立即移出拾取数组。

## 9. 湖浪与完成状态

水面从单一平面细分至 6,413 顶点、12,480 三角形；两组高度波的振幅为 0.075 / 0.04 m，时间周期约 35 / 48 秒，岸边逐渐归零。water shader 和水生动物使用同一 waveHeight 公式；保留 Fresnel、天空反射、日夜统一方向和暖色碎光。60 秒采样振幅范围 -0.115 至 0.107 m。水波随时间连续变化，不通过整体平移水面伪造。

本轮请求的四类动物均启用，无资产 blocker。水下鱼采用蓝绿色透明轮廓，是风格化可见度处理，不是物理折射。没有添加高精度水生模型或 4K 贴图。

## 10. 测试与验收

| 项目 | 结果 | 可核验证据 |
|---|---|---|
| 所有陆地物件和树在干地，花丛/路线无冲突 | PASS | contracts.json 的 audit.invalid=[]；debug-surface.png |
| 四周花卉颜色和疏密 | PASS | flowers-spring-all-sides.png、flowers-summer-all-sides.png；四边覆盖断言 |
| 兔狐更快、更大范围、不同步随机停走 | PASS | manifest 参数、120 秒位移/状态、rabbit-motion-0…3.png |
| 5 天鹅、3 鱼、对岸动物、9 飞鸟 | PASS（远景 MVP） | 13 ready，四类实际骨骼姿态；swan-detail、fish-detail、opposite-bank-wildlife、flying-birds.png |
| 缓慢几何湖浪、暖色波光 | PASS | 波场范围/6,413 顶点断言；lake-waves-0/8/16.png 同机位序列 |
| 房间仍为主体、湖—小镇—山关系 | PASS | desktop-summer-day.png；mobile-summer-day.png；固定 camera 不变 |
| 山体纹理与体积、干净岸线 | PASS（上一轮保留） | 默认夏日截图及 lake-waves-8.png 可见山脊/谷线、层纹、稀疏森林 |
| 暖阳与真实近景阴影 | PASS | 房间地板窗框影、近树/石/兔狐影；environment-contract 日夜方向与即时更新断言 |
| 秋天覆盖近远树、草坡、小镇；冬雪 | PASS | desktop-autumn-day / desktop-winter-day.png；季节参数实际值 |
| 生命周期、资源和资产失败 | PASS | 32 次季节/日夜/画质切换无增长；独立骨架/共享缓存；三次真实创建销毁；缺失 GLB 不生成动物 |
| 原有交互不回归 | PASS | environment-contract 桌面/手机各 6 个交互入口全部通过 |
| 性能预算 | PASS | performance-budget.json；同设备、同机位、同等待时间 |

连续模拟 120 秒 / 7,200 步，最大水平单帧位移 0.043908 m；阈值由 clip 时长、步幅与步态峰值推导，没有简单放宽成固定大阈值。未出现 NaN、违法路径、待机滑动或隐藏拾取。兔子原生腿部姿态 161–168 种；狐狸 303–460 种；天鹅颈翼、鱼尾同样验证实际骨骼变化。32 次切换前后均 201 geometries / 96 textures（该测试场景与性能拍摄时可见物件不同，绝对数不用于跨场景比较）。

已运行：animal-assets.cjs、world-surface.cjs、flora-fauna-contract.cjs、flora-fauna-qa.cjs、flora-fauna-detail.cjs、flora-fauna-budget.cjs、environment-contract.cjs、static-check.py。

## 11. Before / after 证据

本轮原始基线保留在 [before/](../tests/artifacts/flora-fauna/before/)，最终画面在 [after/](../tests/artifacts/flora-fauna/after/)。七组相同机位对比为 desktop summer/spring day、spring dusk、autumn/winter day、mobile summer/spring day。本轮额外增加 summer dusk/night 最终画面；其上一轮历史图在 tests/artifacts/environment/after/，未伪装为本轮新拍的 before。

固定桌面相机 position [10.7,3.9,11.7] / target [4,1.75,2.8] / FOV 45；手机 [13,6.5,24] / 同 target / FOV 53。特写使用独立相机，不拿来替代默认构图验收。图集列出本轮实际使用的特写和动作帧，不使用目录中遗留旧特写冒充当前版本。

## 12. 性能前后

Apple M2、Chrome / ANGLE Metal，1280×900、DPR 1；同相机，资源完成后等 3.2 秒、采样 4 秒。FPS 是本机单次测量，不保证所有设备。

| summer/day | Before | After | 变化 |
|---|---:|---:|---:|
| draw calls | 426 | 448 | +5.16% |
| triangles | 844048 | 890408 | +5.49% |
| textures（含骨骼数据纹理） | 76 | 97 | +21 |
| geometries | 222 | 233 | +11 |
| 平均 FPS | 60.11 | 60.17 | 保持约 60 |
| app ready | 950.8 ms | 1256.0 ms | +305.2 ms |
| 资源/动物 ready | 1085.0 ms | 1843.4 ms | +758.4 ms |

Spring：428 → 449 calls（+4.91%），844,080 → 903,484 triangles（+7.04%），60.05 → 60.10 FPS。两季均通过 +12% calls、+20% triangles、≥55 FPS 预算。新增资源增加了初始加载时间，主要成本来自 Rabbit 的本地模型与独立骨架；同种动物不会重复下载模型。4 份模型缓存由 13 个动物引用。

## 13. MVP 边界与下一轮

天鹅和鱼是用户允许的低面数远景自建 GLB，近看仍明显风格化；鱼用透明色层显示水下轮廓，没有折射、焦散或浑浊体积。天鹅随采样波高升降，没有复杂浮力或尾流。飞鸟为原创翼形剪影，没有复杂鸟类行为。动物沿已验证路径随机停走与折返，没有自由 navmesh。

下一轮若要近距离观察水生动物，优先细化天鹅羽翼、梳羽状态与鱼尾/眼部、加入局部尾流和更自然的水下衰减；兔子可考虑统一低模风格的重拓扑。当前任务不依赖这些后续内容，且没有升级 Three.js、改后台/内容/地图/手账/照片墙/音乐或部署。
