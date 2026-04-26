# TASKS: 工牌交换

本文件保留给旧入口兼容；任务真源见 `TASK_BREAKDOWN.md`。

# TASK_BREAKDOWN: 工牌交换

## Standard Worker Bundle

1. `gongpai-jiaohuan-foundation`
   - lane: foundation
   - level: M
   - goal: 建立只服务「查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点」的可运行骨架

2. `gongpai-jiaohuan-state`
   - lane: logic
   - level: M
   - goal: 实现 Direction Lock 状态的一次分配/操作结算

3. `gongpai-jiaohuan-content`
   - lane: content
   - level: M
   - goal: 用事件池强化「身份一致性谜题 + 危险岗位规避」

4. `gongpai-jiaohuan-ui`
   - lane: ui
   - level: M
   - goal: 让玩家看见核心压力、可选操作和后果反馈

5. `gongpai-jiaohuan-integration`
   - lane: integration
   - level: M
   - goal: 把已有 state/content/ui 接成单一主循环

6. `gongpai-jiaohuan-qa`
   - lane: qa
   - level: S
   - goal: 用测试和 scripted playthrough 确认方向没跑偏
