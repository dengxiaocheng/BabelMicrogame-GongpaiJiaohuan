# MECHANIC_SPEC: 工牌交换

## Primary Mechanic

- mechanic: 身份一致性谜题 + 危险岗位规避
- primary_input: 拖换工牌并同步调整岗位记录/证词卡
- minimum_interaction: 玩家必须交换至少一张工牌并修正一处记录，使身份一致性检查通过或暴露疑点

## Mechanic Steps (Per Core Loop Iteration)

### Step 1: 查看岗位
- 显示所有岗位及其危险等级
- 显示当前 badge_match 映射（哪张工牌在哪个岗位）
- 玩家识别高危险岗位，决定是否换牌

### Step 2: 拖换工牌
- 玩家拖拽一张工牌到另一个岗位槽位
- 系统执行 swap：
  1. 目标槽位原有工牌移至源槽位
  2. badge_match 更新两张工牌的 positionId
- 即时反馈：danger 重新计算（新岗位危险等级求和）

### Step 3: 调整证词/记录
- 交换后，相关工牌的 witness_consistency 不再匹配新岗位
- 玩家点击证词卡上的条目，修改为与新岗位一致的证词
- 每次修改证词：
  - 若修正正确：suspicion 不变或 -5
  - 若修正错误或遗漏：suspicion +10
  - 若不修正（保持旧证词）：审查时暴露

### Step 4: 接受审查
- 审查员执行一致性检查（见下方算法）
- 生成审查结果：通过/警告/淘汰

### Step 5: 结算
- 根据 audit_round 结果更新 danger 和 suspicion
- 进入下一轮或触发结局

## Consistency Check Algorithm

```
function runAudit(badge_match, witness_consistency, positions):
  mismatches = []
  for each (badgeId, positionId) in badge_match:
    expected_testimony = positions[positionId].requiredTestimony
    actual_testimony = witness_consistency[badgeId]
    if actual_testimony != expected_testimony:
      mismatches.append({ badgeId, expected: expected_testimony, actual: actual_testimony })

  suspicion_delta = len(mismatches) * 15
  return { passed: mismatches.length == 0, mismatches, suspicion_delta }
```

## State Coupling Rules

每次有效操作必须同时推动两类后果：

1. **生存压力（danger）**: 换牌后立即重新计算 danger = sum(岗位危险等级 for each occupied position)
2. **秩序压力（suspicion）**: 审查时根据 consistency check 结果增减 suspicion

### 具体数值规则
- 岗位危险等级：1–5
- 换牌后 danger 变化：`new_danger - old_danger`（可为负）
- 审查 suspicion 变化：每个 mismatch +15，全匹配 -5
- 单次证词修正正确：suspicion -5
- 单次证词修正错误：suspicion +10

## Phase Progression Rules

| audit_round | 工牌数 | 强制事件 |
|---|---|---|
| 1 | 2 张 | 无，教学阶段 |
| 2 | 3 张 | 强制交换 1 张（不可取消） |
| 3 | 4 张 | 审查员提前抽查 1 张 |
| 4 | 4 张 | 限时 60 秒完成所有修正 |

## Not A Choice List

- 不能只展示 2-4 个文字按钮让玩家选择
- UI worker 必须把 primary input 映射到场景对象操作（拖拽工牌 + 点击证词条目）
- integration worker 必须让这个操作进入状态结算，而不是只写叙事反馈
