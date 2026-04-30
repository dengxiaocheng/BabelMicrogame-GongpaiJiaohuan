# Direction Lock: 工牌交换

## One Sentence
玩家交换工牌躲避危险岗位，但身份、脸、记录和证词必须保持一致。

## Core Loop
1. 执行核心循环：查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
2. 按 20 分钟节奏推进：单人换牌 -> 双人互证 -> 记录表冲突 -> 突发抽查

## Must Keep
- 核心机制必须保持：身份一致性谜题 + 危险岗位规避
- 核心循环必须保持：查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
- 20 分钟结构只作为节奏，不扩成大项目

## Must Not Add
- 不做身份大解谜；核心是换牌后的逻辑一致
- 不新增第二套主循环
- 不把小游戏扩成长期经营或开放世界

## Required State

| Variable | Type | Range | Meaning |
|---|---|---|---|
| badge_match | Record<badgeId, positionId> | 每张工牌当前映射到的岗位 | 核心映射表，交换操作直接改写此表 |
| danger | number | 0–100 | 当前累计危险值；岗位本身的危险等级求和 |
| suspicion | number | 0–100 | 审查员疑点；badge_match 与 witness_consistency 不一致时上升 |
| witness_consistency | Record<badgeId, testimonyLine[]> | 每张工牌关联的证词条目 | 玩家需手动同步证词，使其与新 badge_match 一致 |
| audit_round | number | 1–4 | 当前审查轮次；对应 20 分钟节奏的 4 个阶段 |

## Success
在限定时长内完成主循环，并稳定进入至少一个可结算结局

## Failure
关键状态崩溃，或在本轮主循环中被系统淘汰
