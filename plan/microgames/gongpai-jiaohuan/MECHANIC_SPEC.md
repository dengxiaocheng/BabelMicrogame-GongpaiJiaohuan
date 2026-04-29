# MECHANIC_SPEC: 工牌交换

## Primary Mechanic

- mechanic: 身份一致性谜题 + 危险岗位规避
- primary_input: 拖换工牌并同步调整岗位记录/证词卡
- minimum_interaction: 玩家必须交换至少一张工牌并修正一处记录，使身份一致性检查通过或暴露疑点

## Mechanic Steps

1. 查看危险岗位
2. 拖换工牌
3. 调整记录或证词
4. 运行 badge_match/witness_consistency 审查

## State Coupling

每次有效操作必须同时推动两类后果：

- 生存/资源/进度压力：从 Required State 中选择至少一个直接变化
- 关系/风险/秩序压力：从 Required State 中选择至少一个直接变化

## Not A Choice List

- 不能只展示 2-4 个文字按钮让玩家选择
- UI worker 必须把 primary input 映射到场景对象操作
- integration worker 必须让这个操作进入状态结算，而不是只写叙事反馈
