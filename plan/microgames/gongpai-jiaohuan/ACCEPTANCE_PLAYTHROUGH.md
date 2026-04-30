# ACCEPTANCE_PLAYTHROUGH: 工牌交换

## Prerequisites
- 所有 plan 文件已收束
- integration worker 已完成组装

## Scripted Playthrough: Happy Path (Survive)

### Setup
- 游戏开始，显示 2 张工牌、2 个岗位、状态栏
- 初始状态: danger = 岗位A(2) + 岗位B(4) = 6, suspicion = 0, audit_round = 1

### Round 1: 单人换牌 (audit_round = 1)

**Step 1: 查看岗位**
- 操作：观察岗位表
- 预期：看到岗位A(危:2)和岗位B(危:4)，工牌#1在岗位A，工牌#2在岗位B
- 验证：danger = 6, suspicion = 0

**Step 2: 拖换工牌**
- 操作：拖拽工牌#1到岗位B槽位
- 预期：工牌#1和工牌#2互换，工牌#1现在在岗位B(危:4)，工牌#2在岗位A(危:2)
- 验证：badge_match 更新，danger 仍 = 6（总值未变），但分布变了

**Step 3: 调整证词**
- 操作：点击工牌#1的证词卡，修正条目使其匹配岗位B
- 预期：条目显示 ✓
- 验证：suspicion 变化（-5 或 +0）

**Step 4: 点击审查按钮**
- 操作：点击审查按钮
- 预期：审查通过（所有证词匹配），显示全绿
- 验证：suspicion 保持低位，audit_round 推进到 2

### Round 2: 双人互证 (audit_round = 2)

**Step 5: 强制事件**
- 预期：新增第 3 张工牌，或强制交换 1 张
- 验证：工牌数量或位置发生变化

**Step 6: 交换并修正**
- 操作：交换工牌，修正所有相关证词
- 验证：witness_consistency 与 badge_match 一致

**Step 7: 审查**
- 操作：点击审查按钮
- 预期：审查通过
- 验证：audit_round 推进到 3

### Round 3: 记录表冲突 (audit_round = 3)

**Step 8: 审查员提前抽查**
- 预期：审查员随机抽查 1 张工牌，必须当场匹配
- 验证：若匹配则 suspicion 不变，否则 +15

**Step 9: 交换并修正**
- 操作：处理所有 mismatch，修正证词
- 验证：suspicion 在可控范围

**Step 10: 审查**
- 操作：点击审查按钮
- 预期：通过
- 验证：audit_round 推进到 4

### Round 4: 突发抽查 (audit_round = 4)

**Step 11: 限时修正**
- 预期：60 秒倒计时开始
- 操作：在 60 秒内修正所有 mismatch
- 验证：suspicion 保持 < 80

**Step 12: 最终审查**
- 操作：点击审查按钮
- 预期：审查通过
- 验证：danger < 80, suspicion < 80

### Ending: Survive
- 预期：显示"存活"结局
- 验证：danger 和 suspicion 均未达到淘汰阈值

---

## Scripted Playthrough: Failure Path (Suspicion Elimination)

### Setup (same as happy path)

### Round 1: 故意不修正证词

**Step F1: 拖换工牌**
- 操作：交换工牌#1和#2

**Step F2: 不调整证词**
- 操作：不修改任何证词，直接点击审查

**Step F3: 审查失败**
- 预期：mismatch 被检测，suspicion +15（或更多）

### Round 2: 继续不修正

**Step F4: 重复不修正操作**
- 预期：suspicion 持续累积

### Multiple rounds of failure
- 预期：suspicion 达到 100
- 验证：触发"审查员判定身份造假"淘汰结局

---

## Direction Gate
- integration worker 必须让 Happy Path 流程可试玩
- qa worker 必须用测试或手工记录验证 Happy Path 和 Failure Path
- 如试玩要求需要偏离 Direction Lock，停止并回交 manager
