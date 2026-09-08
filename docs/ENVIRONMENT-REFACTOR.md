# 湖边房间 + 对岸彩色小镇：实测交付

2026-09-08。本轮直接修改原生 HTML / 全局 Three.js r128 项目。已查看桌面参考文件夹全部 6 张图片、改动前页面与最终实际渲染。环境构图沿用原房间尺寸，没有升级 Three.js、后端、内容 schema、地图、手账、照片墙、书架、音乐或部署。

可直接打开 [对照图库](../tests/artifacts/environment/gallery.html)，逐张查看固定机位 before / after。以下“视觉通过”基于实际图片检查；程序数量、无 console error 和截图生成均不单独构成视觉通过。

## 诊断与根因

1. 原地形在侧岸 `x ≈ ±82…112` 仍低于水位，旧森林分布却将它当成干地；没有统一 surface 合同。测试使用原 seed=2048 复现 **300 棵侧岸树中 298 棵浸水**。精确重算：256 棵的 baseY < -1.5；以水位 -0.47 为基准，“低于水位 1.5”实际是 221 棵。两种阈值已分开记录。
2. 原远林为 1,500 棵十字平面树，山体的三个单色坡面被连续树墙挡住。现为 9 棵近树、126 棵中景树、66 棵稀疏远景单片 impostor；远树有树线高度限制，山脊保持留白。
3. 原太阳、天空、水的方向与更新分别处理；`shadowMap.autoUpdate=false` 又配合 8 秒计时刷新，切换时间有延迟。现由 SunRig 同步方向，切换立即标记阴影更新，并按近岸包围盒在光源相机空间拟合 shadow camera。
4. 原地表/植被在 r128 中存在过亮的颜色输入，配合偏强环境光，冷暖和季节层次被压平。现集中光照配置，明确材质 sRGB 到线性转换，继续使用 ACES 与 sRGB 输出。
5. 初轮重构的小镇被窗框横梁遮挡；通过降低默认俯视角、调整山高和近树修正。房间没有整体放大。原浮空花球和发光球已移除，春花改为有茎叶的地面植物。

## 修改文件与职责

| 文件 | 本轮职责 |
|---|---|
| `room-preview/world-surface.js`（新增） | 湖界、水位、岸线安全带、spawn zones、地形与山体采样、占地断言、路径与跨岸规则；采样匹配渲染网格三角形 |
| `room-preview/sun-rig.js`（新增） | 集中 exposure / light / fog / shadow 配置；同一太阳方向；拟合近岸阴影范围并立即刷新 |
| `room-preview/village.js`（新增） | 8 栋共享材质木屋、3 种轮廓、门窗阳台、道路、栅栏、码头、2 艘敞口划艇、3 名行人及接地 AO |
| `room-preview/environment.js` | 重建地形、折叠山脊、程序岩层和法线、三档森林、水与岸线、雪和粒子、debug overlay、资源释放 |
| `room-preview/landscape-assets.js` | 原创体积松树和树冠、木挂板贴图、4 帧行人图集；避免共享顶点扰动不一致造成树冠裂缝 |
| `room-preview/world-state.js` | conifer / deciduous / grass / shrub / mountain / water / sky / sun / particles / villageRoof / windowLight 分类四季 |
| `room-preview/animal-system.js` | 新增默认停用接口，旧 primitive 动物不实例化、不加入拾取列表 |
| `room-preview/room.js` | 删除旧伪树影覆盖层；交由 SunRig 配置阴影；放开新概览俯仰角，横竖屏切换使用固定机位 |
| `room-preview/camera-controller.js` | desktop / mobile QA preset，交互过程中换屏后的返回机位匹配 |
| `room-preview/index.html` | 按依赖顺序加载新模块，默认首屏使用 QA preset |
| `tests/world-surface.cjs` | 原浸水 bug 复现；错误占地、浮空、错误 zone、穿水路径及无效码头的拒绝测试 |
| `tests/environment-contract.cjs` | 全部放置点与实际 mesh / 地形 raycast 核对；行人时间采样、四季即刻应用、阴影同步、桌面/手机六类交互 |
| `tests/environment-qa.cjs` | 同设备、同机位、同等待时间的 18 对截图与性能记录；dev 总览 |
| `tests/environment-budget.cjs` | 比较设备、机位及测量条件，断言 draw calls +15% / triangles +25% 预算 |
| `tests/environment-detail.cjs` | 春季与小镇细节补充截图 |
| `tests/personal-world-visual.cjs`、`tests/tahoe-browser.cjs`、`tests/static-check.py` | 更新旧“3 个山对象 / 5 个 primitive 动物即通过”的失效假设 |
| `tests/fixtures/environment-before/` | 保存实际改动前环境、季节、房间源文件，允许重放基线，不依赖 Git 历史 |
| `README.md`、本报告、`ENVIRONMENT-ASSETS.md`、`TAHOE-IMPLEMENTATION.md` | 当前运行说明、验收、资产来源；给旧干地结论加历史失效标记 |

## P0 验收表

| 项目 | 结果 | 代码与实渲染证据 |
|---|---|---|
| P0-1 统一地表 / 放置 / debug | **PASS** | 382 个陆地放置记录、201 棵树、0 个非法点；与实际渲染三角面最大误差 **0.00000123**。17 点占地检查与 2,911 个路径样本；2 个码头独立跨岸合同。[结构化结果](../tests/artifacts/environment/contracts.json)、[debug 图](../tests/artifacts/environment/after/debug-surface.png) |
| P0-2 山体与分档森林 | **PASS** | 连续树墙移除；近树有体积，中树 cluster，远树单片稀疏 impostor；山峰、谷线、岩层纹理与法线可见。采用程序顶点色/世界坐标岩层，未使用未授权岩石贴图。[夏日图](../tests/artifacts/environment/after/desktop-summer-day.png) |
| P0-3 湖水与岸线 | **PASS** | 同一 lake shape GLSL，边界 discard + 深浅过渡 + 岸边消隐；重复波场导数法线、Fresnel、天空查询和共享光向。窗内右侧可见碎开的浅金反射，夜间转为弱冷色反射。[日](../tests/artifacts/environment/after/desktop-summer-day.png) / [夜](../tests/artifacts/environment/after/desktop-summer-night.png) |
| P0-4 太阳 / 阴影 / 色彩 | **PASS** | 室内窗格、家具与近树在地面形成有方向的阴影；旧贴图伪树影已删除。近树、岸石、码头投射/接收阴影。远镇采用共享材质、接地 AO 和雾，不给 8 栋远屋都开实时阴影。day/dusk/night 的 light 与水方向数值一致，切换立即更新 shadow map；保留 ACES/sRGB。 |
| P0-5 湖对岸小镇 | **PASS** | 默认窗内能辨认彩色房屋、尖/缓坡屋顶和高屋阳台；房间仍占主要画面。8 栋房屋 / 3 种轮廓 / 5 类墙色；4 栋夜间亮窗；路、码头、2 船、3 位原创图集行人。[小镇细节](../tests/artifacts/environment/after/village-summer-detail.png)、[默认图](../tests/artifacts/environment/after/desktop-summer-day.png) |
| P0-6 四季 | **PASS** | 秋季近窗树、远岸落叶树、地面、山坡、小镇屋顶/灌木都变化，松树仍深绿；冬季地面、向上树冠、屋顶与高山积雪；春天新绿且花有茎叶。参数同步应用 0–0.3 ms，无慢速渐变等待；Metal 下一帧约 16.7 ms。[秋](../tests/artifacts/environment/after/desktop-autumn-day.png) / [冬](../tests/artifacts/environment/after/desktop-winter-day.png) / [春](../tests/artifacts/environment/after/desktop-spring-day.png) |
| P0-7 默认构图 / 固定 QA 相机 | **PASS** | 未缩放房间，桌面湖—镇—山可同时读到；手机固定机位保留房间与对岸。桌面和手机全部 6 类交互按钮均能进入与返回。[手机图](../tests/artifacts/environment/after/mobile-summer-day.png)、`RoomQACameras` 与交互回归 |
| 近景 primitive 动物处理 | **PASS（隐藏分支）** | 没有把新几何体动物当成资产交付。旧动物和 primitive 鸟类默认不显示；真实近景 GLB 仍是资产 blocker。 |

视觉逐项复核：树根均接地、无浸水树墙；两组山体可见明暗坡面和纹理，而非单色平面；小镇位于窗内远岸，不遮住山脊；地面窗影和家具投影方向统一；湖面右侧存在暖金碎光；秋色同时影响近景、远景、山坡和小镇。风格仍为程序化低多边形环境，不宣称达到参考摄影图的写实程度。

## 性能前后

同一台 **Apple M2 / Chrome / ANGLE Metal**，桌面 1280 × 900、DPR 1、high，固定相机 `[10.7,3.9,11.7]` → `[4,1.75,2.8]`、FOV 45。资源加载结束后设置 summer/day，等待 3,200 ms，再采样 4,000 ms。before 使用保存的旧源码重放；after 使用交付源码。环境时间固定为 30 秒，使画面可比较。

| 指标 | before | after | 变化 |
|---|---:|---:|---:|
| renderer.info.render.calls | 431 | 426 | -1.16% |
| triangles | 741,289 | 844,048 | +13.86% |
| textures | 74 | 76 | +2 |
| geometries | 223 | 222 | -1 |
| 平均 FPS | 60.05 | 60.06 | 基本相同，受 60 Hz 刷新限制 |
| 页面场景可用 readyMs | 2,245.5 ms | 967.8 ms | 本地单次实测 |
| 资源就绪 resourcesReadyMs | 2,368.9 ms | 1,066.4 ms | 本地单次实测 |

新增山体网格和中景树冠是三角形增长主因；房屋按材质合批、远景行人共用图集，移除旧动物和部分旧树几何，draw calls 未增长。两个预算断言均通过，无需申请突破。

加载时间受本地文件/驱动缓存与着色器编译影响，不能由一次记录推断线上冷启动提速比例。最初软件 SwiftShader 的不足 1 FPS 记录保留于 `before-original/metrics.json`，不作为真实 GPU 性能结论。正式数据：[before](../tests/artifacts/environment/before/metrics.json)、[after](../tests/artifacts/environment/after/metrics.json)、[比较与预算](../tests/artifacts/environment/comparison.json)。

## 截图路径与复现

项目根目录下：

- `tests/artifacts/environment/before-original/`：任何环境改动前的原始机位，desktop/mobile × summer/autumn/winter × day/dusk/night，18 张。
- `tests/artifacts/environment/before/` 与 `after/`：最终固定机位的同条件 18 对截图。
- 六张核心图：`desktop-summer-day.png`、`desktop-autumn-day.png`、`desktop-winter-day.png`、`desktop-summer-dusk.png`、`desktop-summer-night.png`、`mobile-summer-day.png`。
- `after/debug-surface.png`：湖界、岸线安全带、所有放置点、小镇 zone、行人路径与阴影 frustum。近景动物当前停用，图中没有伪造活动动物路径。
- `after/desktop-spring-day.png`、`after/village-{summer,autumn,winter}-detail.png`：额外季节和小镇细节。

```sh
python3 -m http.server 8940 --bind 127.0.0.1 --directory room-preview
# 在有 Playwright 的 Node 环境（本机使用捆绑运行时与 NODE_PATH）执行：
node tests/world-surface.cjs
ROOM_PHASE=before node tests/environment-qa.cjs
ROOM_PHASE=after node tests/environment-qa.cjs
node tests/environment-budget.cjs
node tests/environment-contract.cjs
node tests/environment-detail.cjs
python3 tests/static-check.py
```

开发时打开 `http://127.0.0.1:8940/?debug=surface`，或调用 `__ROOM_APP__.environment.setDebug(true)`。仅 localhost / 127.0.0.1 生效，线上普通访客不能开启。

## 资产与 MVP 边界

全部新增模型、程序纹理、图集的来源、作者、许可状态、原始位置及压缩策略见 [资产登记](ENVIRONMENT-ASSETS.md)。本轮无新增外部模型或照片纹理，参考图片没有发布进项目。

仍属 MVP：山体是可控程序岩层与低多边形地形；远镇房屋合批，不能进入探索；水面反射天空而非完整场景镜面；人物是小尺寸四帧图集，适用于远景；薄雪使用材质与坡向遮罩，不模拟体积雪堆；远景住宅不使用昂贵实时阴影。

近景动物下一轮先取得可核实许可的低面数 GLB 和 idle/walk 动画，登记作者/来源/署名要求后，再以现有 r128 GLTFLoader、AnimationMixer、LOD 接入同一 WorldSurface。当前 blocker 是近景资产与许可材料缺失，而不是用 primitive 动物补齐验收。
