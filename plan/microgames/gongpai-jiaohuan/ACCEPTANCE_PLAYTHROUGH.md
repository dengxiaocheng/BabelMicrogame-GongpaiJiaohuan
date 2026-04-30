# ACCEPTANCE_PLAYTHROUGH: 工牌交换

## Scripted Playthrough
1. 开局显示 badge_match / danger / suspicion / witness_consistency / audit_round
2. 玩家执行一次核心操作：查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
3. 系统必须反馈一个资源或身体压力变化
4. 系统必须反馈一个关系或风险变化

## Direction Gate
- integration worker 必须让这个流程可试玩
- qa worker 必须用测试或手工记录验证这个流程
- 如试玩要求需要偏离 Direction Lock，停止并回交 manager
