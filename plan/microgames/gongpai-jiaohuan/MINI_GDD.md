# MINI_GDD: 工牌交换

## Scope

- runtime: web
- duration: 20min
- project_line: 工牌交换
- single_core_loop: 查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点

## Core Loop
1. 执行核心循环：查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
2. 按 20 分钟节奏推进：单人换牌 -> 双人互证 -> 记录表冲突 -> 突发抽查

## State

- badge_match
- danger
- suspicion
- witness_consistency
- audit_round

## UI

- 只保留主界面、结果反馈、结算入口
- 不加多余菜单和后台页

## Content

- 用小型事件池支撑主循环
- 一次只验证一条 Babel 创意线

## Constraints

- 总体规模目标控制在 5000 行以内
- 单个 worker 任务必须服从 packet budget
- 如需扩线，交回 manager 重新拆
