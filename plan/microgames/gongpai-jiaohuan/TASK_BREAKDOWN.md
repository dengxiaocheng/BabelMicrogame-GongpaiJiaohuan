# TASK_BREAKDOWN: 工牌交换

## Dependency Graph

```
foundation → state → content → ui → integration → qa
```

Each worker must read the plan files in `plan/microgames/gongpai-jiaohuan/` for direction. Do NOT rely on chat context.

---

## Worker 1: `gongpai-jiaohuan-foundation`

- Lane: foundation
- Level: M
- Reads: DIRECTION_LOCK.md, MINI_GDD.md, SCENE_INTERACTION_SPEC.md

### Goal
建立可运行的 HTML/CSS/JS 骨架，只服务「查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点」。

### Deliverables
- `index.html`: 单页结构，包含岗位表区域、证词卡区域、状态栏、审查按钮
- 基础 CSS: 按 SCENE_INTERACTION_SPEC.md 的布局实现岗位槽位和工牌卡片样式
- 基础 JS 框架: 游戏初始化、渲染循环骨架（可先用 mock 数据）

### Acceptance
- 浏览器打开 index.html 能看到完整的场景布局（岗位表 + 证词卡区域 + 状态栏）
- 布局与 SCENE_INTERACTION_SPEC.md 一致
- 不需要实际交互逻辑，但 DOM 结构必须能承载后续拖拽和点击

### Prohibitions
- 不实现拖拽逻辑（交给 ui worker）
- 不实现状态计算逻辑（交给 state worker）
- 不实现内容数据（交给 content worker）
- 不加路由、多页面或导航菜单

### How It Serves Core Loop
提供承载 primary input（拖换工牌 + 点击证词）的 DOM 骨架。

---

## Worker 2: `gongpai-jiaohuan-state`

- Lane: logic
- Level: M
- Reads: DIRECTION_LOCK.md, MECHANIC_SPEC.md

### Goal
实现 Direction Lock 中 5 个 Required State 的初始化、操作和结算逻辑。

### Deliverables
- 状态模块：initGameState(), swapBadge(), updateTestimony(), runAudit(), calculateDanger()
- swapBadge(badgeId, targetPositionId): 交换两张工牌的 positionId，重新计算 danger
- updateTestimony(badgeId, lineIndex, newValue): 更新证词，返回是否匹配新岗位
- runAudit(): 执行一致性检查，返回 { passed, mismatches, suspicionDelta }
- calculateDanger(): 根据 badge_match 和岗位危险等级求和

### Acceptance
- 单元测试覆盖：swapBadge 正确交换映射、danger 重新计算、runAudit 检测 mismatch
- 状态操作是纯函数或明确的数据变更，不依赖 DOM
- 所有数值规则与 MECHANIC_SPEC.md 一致

### Prohibitions
- 不依赖 DOM 或 UI 框架
- 不实现拖拽交互
- 不实现内容数据（岗位池、工牌池等）
- 不添加 MECHANIC_SPEC.md 中未定义的状态变量

### How It Serves Core Loop
提供「交换工牌 -> 调整证词 -> 接受审查 -> 结算」所有状态变更逻辑。

---

## Worker 3: `gongpai-jiaohuan-content`

- Lane: content
- Level: M
- Reads: MINI_GDD.md, MECHANIC_SPEC.md

### Goal
用事件池和岗位/工牌数据强化「身份一致性谜题 + 危险岗位规避」。

### Deliverables
- 岗位数据：6–8 个岗位，每个带 { id, name, dangerLevel, requiredTestimony[] }
- 工牌数据：4–6 张工牌，每张带 { id, name, faceTrait, defaultPositionId }
- 证词模板：每个岗位 2–3 条固定证词条目
- 强制事件池：每 audit_round 1–2 个强制事件
- 阶段配置：audit_round 1–4 的工牌数和事件映射

### Acceptance
- 数据结构与 state worker 的接口匹配（badge_match, witness_consistency 等）
- 每个岗位都有 dangerLevel 和 requiredTestimony
- 强制事件能被 state worker 解析并执行
- 内容量足够支撑 20 分钟游戏流程

### Prohibitions
- 不实现状态逻辑
- 不实现 UI 渲染
- 不添加 MINI_GDD.md 未描述的内容（如对话树、NPC、成就系统）
- 不修改 plan 文件

### How It Serves Core Loop
提供核心循环的素材：岗位危险等级驱动 danger，证词模板驱动 consistency check。

---

## Worker 4: `gongpai-jiaohuan-ui`

- Lane: ui
- Level: M
- Reads: SCENE_INTERACTION_SPEC.md, MECHANIC_SPEC.md

### Goal
实现拖换工牌 + 点击证词的交互，让玩家看见核心压力、可选操作和后果反馈。

### Deliverables
- 工牌拖拽：mousedown/mousemove/mouseup + touch 等价，支持 swap
- 证词编辑：点击条目展开选项，选择后即时反馈 ✓/✗
- 审查按钮：点击触发审查流程
- 状态栏：danger/suspicion/round 实时显示，>= 80 时红色闪烁
- 反馈动画：换位飞行动画、数值变化闪烁

### Acceptance
- 拖拽工牌到另一个岗位槽位能完成 swap（数据由 state 模块处理）
- 点击证词条目能选择新值并显示匹配结果
- 审查按钮能触发一致性检查并显示每个 badge 的 match/mismatch
- 所有交互与 SCENE_INTERACTION_SPEC.md 一致

### Prohibitions
- 不自己计算状态，必须调用 state worker 提供的接口
- 不实现纯文字按钮列表作为核心交互
- 不添加 SCENE_INTERACTION_SPEC.md 未描述的 UI 元素
- 不修改 plan 文件

### How It Serves Core Loop
实现 primary input 的可视化交互：拖换工牌（核心操作）+ 点击证词（同步调整）。

---

## Worker 5: `gongpai-jiaohuan-integration`

- Lane: integration
- Level: M
- Reads: All plan files

### Goal
把已有 state/content/ui 接成单一主循环，使 ACCEPTANCE_PLAYTHROUGH 可试玩。

### Deliverables
- 游戏初始化：加载 content 数据 → 初始化 state → 渲染 UI
- 核心循环连接：UI 操作 → state 变更 → UI 更新
- 阶段推进：audit_round 结束后自动进入下一轮或触发结局
- 结局判断：按 MINI_GDD.md 的结束条件结算
- 计时器：20 分钟倒计时

### Acceptance
- 能从开头玩到结尾：开场 → audit_round 1 → 2 → 3 → 4 → 结局
- ACCEPTANCE_PLAYTHROUGH.md 的脚本流程可完整执行
- danger >= 100 或 suspicion >= 100 时正确触发淘汰结局
- 20 分钟超时时正确结算

### Prohibitions
- 不新增未在 plan 文件中定义的功能
- 不修改 plan 文件
- 不跳过或简化核心循环的任何步骤

### How It Serves Core Loop
把所有组件接成完整的「查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算」循环。

---

## Worker 6: `gongpai-jiaohuan-qa`

- Lane: qa
- Level: S
- Reads: All plan files, ACCEPTANCE_PLAYTHROUGH.md

### Goal
用测试和 scripted playthrough 确认方向没跑偏。

### Deliverables
- 自动化测试：覆盖核心循环的 happy path 和 failure path
- 手动试玩记录：按 ACCEPTANCE_PLAYTHROUGH.md 执行并记录结果

### Acceptance
- 所有 ACCEPTANCE_PLAYTHROUGH.md 中的步骤可执行
- 发现的问题记录在 report 中，附带修复建议
- 不得自行修复问题，只能记录

### Prohibitions
- 不修改游戏代码（只能记录问题）
- 不修改 plan 文件
- 不添加新功能或新测试需求

### How It Serves Core Loop
验证核心循环可完整走通，primary input 能产生预期状态变化。
