# CREATIVE_CARD: 工牌交换

- slug: `gongpai-jiaohuan`
- creative_line: 工牌交换
- target_runtime: web
- target_minutes: 20
- core_emotion: 身份一致性谜题 + 危险岗位规避
- core_loop: 查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
- failure_condition: 关键状态崩溃，或在本轮主循环中被系统淘汰
- success_condition: 在限定时长内完成主循环，并稳定进入至少一个可结算结局

## Intent

- 做一个 Babel 相关的单创意线微游戏
- 只保留一个主循环，不扩成大项目
- 让 Claude worker 能按固定 packet 稳定并行
