# SCENE_INTERACTION_SPEC: 工牌交换

## Scene Objects

- 工牌
- 岗位表
- 脸部特征卡
- 证词链
- 审查印章

## Player Input

- primary_input: 拖换工牌并同步调整岗位记录/证词卡
- minimum_interaction: 玩家必须交换至少一张工牌并修正一处记录，使身份一致性检查通过或暴露疑点

## Feedback Channels

- 一致性勾叉
- suspicion 增量
- danger 降低
- audit_round 结果

## Forbidden UI

- 不允许做长篇身份推理
- 不允许只用“交换/不交换”按钮

## Acceptance Rule

- 首屏必须让玩家看到至少一个可直接操作的场景对象
- 玩家操作必须产生即时可见反馈，且反馈能追溯到 Required State
- 不得只靠随机事件文本或普通选择按钮完成主循环
