# SCENE_INTERACTION_SPEC: 工牌交换

## Scene Layout (Single Screen)

```
┌─────────────────────────────────────────────────────┐
│  [状态栏] danger: ██░░  suspicion: ███░  round: 1/4 │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│   岗位表 (左侧)       │   证词卡区域 (右侧)            │
│   ┌─────┐ ┌─────┐   │   ┌──────────────────────┐   │
│   │岗位A│ │岗位B│   │   │ 证词卡 #1            │   │
│   │ 危:2│ │ 危:4│   │   │  □ 条目1: "在岗"     │   │
│   │[工牌]│ │[工牌]│   │   │  □ 条目2: "无事故"   │   │
│   └─────┘ └─────┘   │   └──────────────────────┘   │
│   ┌─────┐ ┌─────┐   │   ┌──────────────────────┐   │
│   │岗位C│ │岗位D│   │   │ 证词卡 #2            │   │
│   │ 危:1│ │ 危:5│   │   │  □ 条目1: "值班中"   │   │
│   │[工牌]│ │[工牌]│   │   │  □ 条目2: "已检查"   │   │
│   └─────┘ └─────┘   │   └──────────────────────┘   │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│  [审查按钮] [事件提示区]                               │
└─────────────────────────────────────────────────────┘
```

## Scene Objects

| Object | Visual | Interactive | Data Binding |
|---|---|---|---|
| 工牌 | 带姓名和头像的小卡片，嵌在岗位槽位内 | 可拖拽到其他岗位槽位 | badge_match |
| 岗位槽位 | 固定位置方框，显示岗位名+危险等级 | 接受工牌拖放 | positions[].dangerLevel |
| 证词卡 | 右侧面板中的卡片，每张对应一张工牌 | 点击条目进入编辑/选择模式 | witness_consistency |
| 状态栏 | 顶部横条，显示 danger/suspicion/round | 不可交互，纯展示 | danger, suspicion, audit_round |
| 审查按钮 | 底部按钮 | 点击触发 audit | 触发 runAudit() |
| 事件提示区 | 底部文本区 | 不可交互 | 显示当前强制事件描述 |

## Interaction Flow: Drag-Swap

1. **mousedown/touchstart on badge card**: 标记该工牌为"正在拖拽"，视觉上浮起
2. **mousemove/touchmove**: 工牌跟随指针移动
3. **mouseup/touchend over different position slot**: 执行 swap
   - 源槽位和目标槽位的工牌互换
   - badge_match 更新
   - danger 重新计算并显示变化动画
   - 对应证词卡标记为"待修正"（高亮显示不匹配条目）
4. **mouseup/touchend outside slot**: 工牌回到原位，无状态变化

## Interaction Flow: Testimony Edit

1. **click on testimony line item**: 展开可选证词条目列表
2. **select a testimony option**: 更新 witness_consistency
3. **immediate feedback**:
   - 若与新岗位匹配：条目显示 ✓，suspicion -5
   - 若不匹配：条目显示 ✗，suspicion +10

## Interaction Flow: Audit Trigger

1. **click audit button**: 触发 runAudit()
2. **display result**: 显示每个 badge 的 match/mismatch 状态
3. **update suspicion**: 按 mismatches 数量增加 suspicion
4. **advance round**: audit_round++ 或触发结局

## Feedback Channels

| Event | Visual | Audio (optional) | State Change |
|---|---|---|---|
| 工牌换位成功 | 工牌飞到新位置，danger 数字闪烁 | click | badge_match, danger |
| 证词修正正确 | 条目变绿 ✓ | - | witness_consistency, suspicion |
| 证词修正错误 | 条目变红 ✗ | - | witness_consistency, suspicion |
| 审查通过 | 全绿，suspicion 降低 | - | suspicion |
| 审查发现 mismatch | 对应条目高亮红，suspicion 上升 | - | suspicion |
| danger >= 80 | 状态栏 danger 变红闪烁 | 警告音 | danger |
| suspicion >= 80 | 状态栏 suspicion 变红闪烁 | 警告音 | suspicion |
| 强制事件触发 | 事件提示区显示描述 | - | 取决于事件 |

## Forbidden UI

- 不允许做长篇身份推理对话框
- 不允许只用"交换/不交换"文字按钮
- 不允许用纯文字选项列表模拟核心互动

## Acceptance Rule

- 首屏必须让玩家看到岗位表（含工牌）和证词卡区域
- 玩家拖换工牌必须产生 danger 即时变化
- 玩家修正证词必须产生 suspicion 即时变化
- 审查按钮必须触发一致性检查并显示结果
- 不得只靠随机事件文本或普通选择按钮完成主循环
