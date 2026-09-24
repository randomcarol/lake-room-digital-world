# 资产库与经营建造模式

## 结论

需要先建立资产库，但资产库不是“放模型的文件夹”。经营玩法的最小闭环是：

```text
AssetDefinition → Inventory → PlacementValidator → WorldObject → Save/Undo → Renderer
```

Three.js 只负责显示。玩家拥有多少棵树、对象放在哪里、能否移动、成长到哪一阶段，必须由独立数据状态决定。

## 第一阶段范围

第一版只开放三类对象：

- 花：种植、移动、旋转、删除；按季节显示；占地半径较小。
- 树：种植、移动、旋转、删除；禁止堵路、进水或覆盖房屋；预留成长阶段。
- 远处房屋：建造、移动、旋转、删除；仅允许在中景/村庄建设区；使用更严格的地基与间距验证。

主房间暂不允许移动。它是相机、交互物件、室内模型和岸线构图的共同锚点，直接开放移动会同时破坏大量坐标依赖。先让新建房屋使用数据化实例；等所有依赖改成相对坐标后，再迁移主房间。

## 资产定义

每个可建造资产至少包含：

```text
id / version / category / displayName
source / license / attribution
renderer / modelUri / thumbnailUri
bounds / footprintRadius / height / anchor
allowedZones / allowedSurface / shoreClearance
rotationStep / scaleRange / snap
collision / blocksNavigation / clearance
seasonVariants / growthStages / lod
cost / sellValue / unlockRule
maxInstances / triangleBudget / textureBudget
```

程序化花、树和房屋也要进入同一份 manifest。`renderer: procedural` 只表示生成方式不同，不代表可以绕开放置、保存和性能规则。

## 世界对象

资产是模板，世界对象是玩家创建的实例：

```text
WorldObject
- id
- assetId
- assetVersion
- position
- rotationY
- scale
- state
- createdAt
- updatedAt
- revision
```

保存时只记录资产 ID 和变换，不复制模型数据。资产升级必须保留版本迁移，避免更新模型后旧存档全部错位。

## 放置规则

复用现有 `WorldSurface`，但把只会 `throw` 的初始化接口扩展成编辑器可用的预览接口：

- `previewPlacement(assetId, transform)` 返回合法性和具体原因。
- `commitPlacement(command)` 只有验证通过才写入世界状态。
- 花和树必须在 land，完整 footprint 不得进入 water/shore。
- 房屋必须检查地形坡度、四角地基高度、道路、码头、房屋间距和相机保留走廊。
- 移动对象也必须重新验证，不能只验证第一次创建。
- 所有操作通过命令记录，支持 undo/redo 和事件回放。

## 数据与后台

Owner 内容后台和经营存档必须分离：

- Owner Content：简历、书、照片、旅行故事、音乐等发布内容。
- World Save：玩家建造对象、库存、资源、成长时间和世界事件。

第一版单人世界可以继续用 SQLite，但新增独立表：

```text
asset_catalog
world_saves
world_objects
inventory_items
world_commands
```

每次写操作携带 `saveRevision`，服务器使用乐观并发控制，避免两个页面互相覆盖。批量移动和建造使用事务。

## 推荐实施顺序

1. 建立资产 manifest、校验器和缩略图目录。
2. 将现有一组花、一种树、一种远景房屋登记为首批资产。
3. 建立 `WorldObjectStore` 和版本化本地存档，先实现刷新后恢复。
4. 建立建造模式 UI：资产栏、预览幽灵、合法/非法颜色、旋转、确认、取消。
5. 实现选择、移动、删除、undo/redo。
6. 接入 SQLite 世界存档和跨设备保存。
7. 再加入库存、资源消耗、成长、解锁和任务。
8. 最后改造主房间为可移动资产；在此之前不得用硬编码平移所有场景对象冒充实现。

## 第一版验收

- 玩家能从资产栏选择花、树和远景房屋。
- 预览对象跟随地面，非法位置明确变红并说明原因。
- 对象不能进入湖泊、岸线、道路、码头、现有房屋和动物核心路线。
- 可以旋转、确认、选择、移动、删除、撤销和重做。
- 刷新页面后布局保持一致。
- 旧存档可迁移；未知资产显示占位符而不是导致页面崩溃。
- 200 个花、80 棵树和20栋远景房屋仍满足既定性能预算。
