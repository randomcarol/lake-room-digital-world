# Swan — 项目原创

按用户允许自行建模远景天鹅的要求制作。作者：3D Room 项目内原创代码生成，无第三方模型、图像或动画数据；未替用户额外声明 CC0 等再分发许可。

原始可复现源码：[build-water-wildlife.cjs](../../../../tools/animal-import/build-water-wildlife.cjs)。使用 Three.js r128 MIT GLTFExporter 离线导出；辅助工具的 MIT 文本见 `tools/animal-import/vendor/THREE-LICENSE`。

`Swan.glb`：56,636 字节、282 三角形、一个 skin、无贴图，顶点颜色，未使用 Draco。独立 Idle / Swim / Preen 骨骼 clip；当前场景使用 Idle、Swim。Neck / Head / Wing 骨骼有独立关节位置。运行时复用一份几何和材质、五份独立骨架。

SHA-256：`0ca1219a0ca9c17754e196f43968810d2a49dba909655b0d98eb435e7a8cd9cf`。
