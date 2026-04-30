# MINI_GDD: 工牌交换

## Scope

- runtime: web
- duration: 20min
- project_line: 工牌交换
- single_core_loop: 查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点

## Core Loop

1. 执行核心循环：查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
2. 按 20 分钟节奏推进：单人换牌 -> 双人互证 -> 记录表冲突 -> 突发抽查

## 20-Minute Rhythm

| Phase | audit_round | Duration | Mechanic Focus | Danger Source |
|---|---|---|---|---|
| 单人换牌 | 1 | 0–5 min | 学习拖换 1 张工牌 + 修正 1 条记录 | 岗位本身危险等级 |
| 双人互证 | 2 | 5–10 min | 交换涉及 2 人，证词必须交叉吻合 | 对方证词与你不一致时 +suspicion |
| 记录表冲突 | 3 | 10–15 min | 审查员比对记录表，冲突处暴露疑点 | 之前未修正的记录累积触发 |
| 突发抽查 | 4 | 15–20 min | 限时内必须完成全部一致性修正 | 审查员随机抽查任意工牌 |

## State

| Variable | Type | Range | Meaning |
|---|---|---|---|
| badge_match | Record<badgeId, positionId> | 每张工牌当前映射到的岗位 | 核心映射表 |
| danger | number | 0–100 | 累计危险值 |
| suspicion | number | 0–100 | 审查员疑点 |
| witness_consistency | Record<badgeId, testimonyLine[]> | 每张工牌关联证词条目 | 需手动同步 |
| audit_round | number | 1–4 | 当前审查轮次 |

## Ending Conditions

- **Survive**: 完成 audit_round 4 且 danger < 80 且 suspicion < 80
- **Eliminated (danger)**: danger >= 100 → 被分配到极端危险岗位
- **Eliminated (suspicion)**: suspicion >= 100 → 审查员判定身份造假
- **Timeout**: 20 分钟结束时未完成 audit_round 4 → 按当前 danger/suspicion 取较差结局

## UI

- 主界面：工牌板 + 岗位表 + 证词卡区域，同一屏内可见
- 结果反馈：每次操作后显示 danger/suspicion 数值变化
- 结算入口：audit_round 结束时弹出审查结果，进入下一轮或结局
- 不加多余菜单和后台页

## Content

- 岗位池：6–8 个岗位，每个带危险等级(1–5)和描述
- 工牌池：4–6 张工牌，每张带姓名、脸部特征、默认岗位
- 证词模板：每个岗位对应 2–3 条固定证词条目
- 事件池：每个 audit_round 提供 1–2 个强制事件（强制换牌、审查员提前抽查等）

## Constraints

- 总体规模目标控制在 5000 行以内
- 单个 worker 任务必须服从 packet budget
- 如需扩线，交回 manager 重新拆
