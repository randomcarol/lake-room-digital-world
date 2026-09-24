# LakeFish — 项目原创

按用户允许自行建模远景淡水鱼的要求制作。作者：3D Room 项目内原创代码生成，无第三方模型、图像或动画数据；未替用户额外声明 CC0 等再分发许可。

原始可复现源码：[build-water-wildlife.cjs](../../../../tools/animal-import/build-water-wildlife.cjs)。使用 Three.js r128 MIT GLTFExporter 离线导出。

`LakeFish.glb`：23,260 字节、110 三角形、一个 skin、无贴图，顶点颜色，未使用 Draco。Idle / Swim 尾部骨骼动画。三个实例共享几何和材质，各自独立骨架。

水下效果是低透明度、蓝绿色混合的风格化轮廓；位置位于采样水位下，未实现物理折射或水下体积散射。

SHA-256：`ea9c6557bbd1f297a1a2534377dd81e010a6f7304dc7b9a8718f83df319116cd`。
