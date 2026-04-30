/**
 * eventPool.js — 工牌交换 事件池
 *
 * 核心情绪：身份一致性谜题 + 危险岗位规避
 * 核心循环：查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
 *
 * 事件围绕 Scene Objects 触发，驱动 Required State 变化
 * 每个事件必须同时推动两类压力（生存/资源 + 关系/风险）
 */

// ─── 事件结构说明 ──────────────────────────────────────────────
// {
//   id: 唯一标识,
//   phase: 'recon' | 'swap' | 'align' | 'audit' | 'settle',
//   trigger: 状态条件（函数或条件描述）,
//   scene_object: 涉及的场景对象,
//   narrative: 短叙述文本,
//   state_delta: { badge_match?, danger?, suspicion?, witness_consistency?, audit_round? },
//   feedback: 对应 Feedback Channel,
//   action_required: 玩家必须执行的场景操作,
// }

// ═══════════════════════════════════════════════════════════════
// Phase 1: RECON — 查看岗位
// 场景对象: 岗位表
// 情绪: 发现危险，产生换牌动机
// ═══════════════════════════════════════════════════════════════

export const RECON_EVENTS = [
  {
    id: 'recon_danger_reveal',
    phase: 'recon',
    trigger: { audit_round: 0 },
    scene_object: '岗位表',
    narrative: '岗位表更新了。锅炉巡检和化料调配都标了红色警告。',
    state_delta: { danger: 0 },
    feedback: 'danger 降低信号被阻断——你必须行动',
    action_required: '选择至少一个高危险岗位上的工牌，准备交换',
  },
  {
    id: 'recon_new_shift',
    phase: 'recon',
    trigger: { audit_round: 1 },
    scene_object: '岗位表',
    narrative: '新一班次开始，锅炉区需要双人值守。但工牌还是单人配置。',
    state_delta: { danger: +1 },
    feedback: 'danger 增量——岗位风险上升',
    action_required: '检查岗位表上各岗位的当前持牌人',
  },
  {
    id: 'recon_inspector_hint',
    phase: 'recon',
    trigger: { suspicion_gte: 3 },
    scene_object: '岗位表',
    narrative: '安全员的目光扫过岗位表，在每个名字上停了停。他记住了原本的分配。',
    state_delta: { suspicion: +1 },
    feedback: 'suspicion 增量——安全员开始关注换牌行为',
    action_required: '在安全员审查前确保脸部特征卡与工牌匹配',
  },
]

// ═══════════════════════════════════════════════════════════════
// Phase 2: SWAP — 交换工牌
// 场景对象: 工牌, 脸部特征卡
// 情绪: 交换的紧张感——换对了避险，换错了暴露
// ═══════════════════════════════════════════════════════════════

export const SWAP_EVENTS = [
  {
    id: 'swap_simple',
    phase: 'swap',
    trigger: { always: true },
    scene_object: '工牌',
    narrative: '两张工牌在桌上滑过去。名字和岗位对调了。',
    state_delta: { badge_match: -1, danger: -1 },
    feedback: 'badge_match 下降（脸不匹配了），danger 降低（危险岗位让出去了）',
    action_required: '拖动一张工牌到另一张上完成交换',
  },
  {
    id: 'swap_face_mismatch',
    phase: 'swap',
    trigger: { badge_match_lte: 3 },
    scene_object: '脸部特征卡',
    narrative: '新工牌上的照片和拿牌人的脸对不上。疤痕变成了光头，眼镜变成了痣。',
    state_delta: { badge_match: -2, suspicion: +1 },
    feedback: '一致性勾叉显示 ✗——脸部特征不匹配',
    action_required: '调整脸部特征卡使工牌照片与持牌人一致，或承受疑点',
  },
  {
    id: 'swap_witness_sees',
    phase: 'swap',
    trigger: { audit_round_gte: 1 },
    scene_object: '工牌',
    narrative: '有人看到你在换牌。"你把锅炉的牌子给了那个光头？"——这句话变成了证词。',
    state_delta: { witness_consistency: -1, suspicion: +1 },
    feedback: 'witness_consistency 下降——目击者的证词与工牌记录矛盾',
    action_required: '去证词链里修正那条证词，否则审查时会暴露',
  },
  {
    id: 'swap_emergency_post',
    phase: 'swap',
    trigger: { danger_gte: 4 },
    scene_object: '工牌',
    narrative: '紧急调岗通知！锅炉区缺人，必须立刻有人持牌上岗。来不及慢慢换了。',
    state_delta: { danger: +1, badge_match: -1 },
    feedback: 'danger 持续升高——必须快速决策',
    action_required: '在限时内把任一工牌拖到锅炉岗位并确认',
  },
]

// ═══════════════════════════════════════════════════════════════
// Phase 3: ALIGN — 调整证词
// 场景对象: 证词链
// 情绪: 谎言要圆——每个证词都可能在审查时被交叉比对
// ═══════════════════════════════════════════════════════════════

export const ALIGN_EVENTS = [
  {
    id: 'align_testimony_fix',
    phase: 'align',
    trigger: { witness_consistency_lte: 3 },
    scene_object: '证词链',
    narrative: '证词链上亮了黄灯。"刘芳说看到赵刚在叉车岗位，但赵刚的工牌显示装配线。"',
    state_delta: { witness_consistency: +1, suspicion: 0 },
    feedback: '一致性勾叉显示 △——证词可以修正',
    action_required: '点击证词链中冲突的条目，修改「看到谁」或「在哪个岗位」使之匹配',
  },
  {
    id: 'align_cross_witness',
    phase: 'align',
    trigger: { audit_round_gte: 1, badge_match_lte: 2 },
    scene_object: '证词链',
    narrative: '陈实和刘芳的证词互相矛盾。一个说看到赵刚在叉车，一个说在化料。',
    state_delta: { witness_consistency: -2, suspicion: +2 },
    feedback: 'witness_consistency 大幅下降——两条证词互相打脸',
    action_required: '选择修正其中一条证词（只能改一条），使两条至少不矛盾',
  },
  {
    id: 'align_silent_worker',
    phase: 'align',
    trigger: { always: true },
    scene_object: '证词链',
    narrative: '孙梅拒绝开口。她的证词栏是空的。没有证词意味着没有人替你证明你在装配线。',
    state_delta: { witness_consistency: -1, suspicion: +1 },
    feedback: 'suspicion 增量——沉默本身就是疑点',
    action_required: '用审查印章在孙梅的证词栏盖「存疑」章，并确保其他证词链覆盖她的位置',
  },
]

// ═══════════════════════════════════════════════════════════════
// Phase 4: AUDIT — 接受审查
// 场景对象: 审查印章
// 情绪: 审判时刻——所有不一致都在这里爆发
// ═══════════════════════════════════════════════════════════════

export const AUDIT_EVENTS = [
  {
    id: 'audit_face_check',
    phase: 'audit',
    trigger: { always: true },
    scene_object: '审查印章',
    narrative: '安全员拿起工牌，抬头看脸。"你……工牌上是陈实，但你脸上有胡子。陈实没胡子。"',
    state_delta: { badge_match: -1, suspicion: +2 },
    feedback: '审查印章盖下「存疑」——脸部特征不匹配',
    action_required: '在审查面板中用脸部特征卡匹配工牌持有者，或接受疑点惩罚',
  },
  {
    id: 'audit_testimony_compare',
    phase: 'audit',
    trigger: { witness_consistency_lte: 2 },
    scene_object: '审查印章',
    narrative: '安全员把所有证词摊在桌上，用红笔连线。"你俩说的对不上。"',
    state_delta: { suspicion: +3, witness_consistency: -1 },
    feedback: '审查印章盖下「不通过」——证词链矛盾',
    action_required: '无操作——审查结算阶段，承受后果',
  },
  {
    id: 'audit_spot_check',
    phase: 'audit',
    trigger: { audit_round_gte: 2 },
    scene_object: '审查印章',
    narrative: '随机抽查！安全员指着你的工牌："去你牌子上写的岗位，我跟你去确认。"',
    state_delta: { badge_match: -2, suspicion: +2, danger: +1 },
    feedback: 'audit_round 结果——如果工牌岗位与实际岗位不同，三重惩罚',
    action_required: '如果你已交换工牌，必须选择：坦白换牌（suspicion +2）或冒险跟去（danger +2）',
  },
  {
    id: 'audit_clean_pass',
    phase: 'audit',
    trigger: { badge_match_gte: 4, suspicion_lte: 1 },
    scene_object: '审查印章',
    narrative: '安全员逐项检查。工牌、脸、证词——全部对上了。"行了，下一组。"',
    state_delta: { suspicion: -1, audit_round: +1 },
    feedback: '审查印章盖下「通过」——本轮审查通过',
    action_required: '无——享受短暂的安全感',
  },
]

// ═══════════════════════════════════════════════════════════════
// Phase 5: SETTLE — 结算危险和疑点
// 场景对象: 全部（综合结算）
// 情绪: 结果与代价——这一轮的换牌到底值不值？
// ═══════════════════════════════════════════════════════════════

export const SETTLE_EVENTS = [
  {
    id: 'settle_danger_hit',
    phase: 'settle',
    trigger: { danger_gte: 4 },
    scene_object: '岗位表',
    narrative: '锅炉区的温度又升高了。没换出去的那个工人在里面。事故报告还没写完。',
    state_delta: { danger: -2 },
    feedback: 'danger 降低（本轮结束），但代价已经产生',
    action_required: '在结算面板确认本轮危险分配',
  },
  {
    id: 'settle_suspicion_burst',
    phase: 'settle',
    trigger: { suspicion_gte: 6 },
    scene_object: '审查印章',
    narrative: '安全员把所有工牌收回。"你们几个，跟我去办公室。换牌的事我全知道了。"',
    state_delta: { suspicion: +1 },
    feedback: 'suspicion 超过阈值——被淘汰',
    action_required: '游戏结束——身份一致性彻底崩溃',
  },
  {
    id: 'settle_partial_success',
    phase: 'settle',
    trigger: { danger_lte: 2, suspicion_lte: 3 },
    scene_object: '岗位表',
    narrative: '这一轮的岗位分配勉强过关。有人在安全的位置，有人还在硬撑。但至少没出事。',
    state_delta: { audit_round: +1, danger: 0, suspicion: 0 },
    feedback: 'audit_round 推进——进入下一轮',
    action_required: '确认结算，准备下一轮',
  },
  {
    id: 'settle_perfect',
    phase: 'settle',
    trigger: { danger_lte: 1, suspicion_lte: 1, witness_consistency_gte: 4 },
    scene_object: '岗位表',
    narrative: '所有工牌匹配、所有证词一致、危险岗位都有人顶着。安全员没什么可说的。',
    state_delta: { audit_round: +2, danger: -1 },
    feedback: '完美结算——获得额外回合',
    action_required: '确认结算',
  },
]

// ═══════════════════════════════════════════════════════════════
// 事件池聚合 + 查询接口
// ═══════════════════════════════════════════════════════════════

const ALL_EVENTS = [
  ...RECON_EVENTS,
  ...SWAP_EVENTS,
  ...ALIGN_EVENTS,
  ...AUDIT_EVENTS,
  ...SETTLE_EVENTS,
]

/**
 * 按阶段获取事件
 * @param {'recon'|'swap'|'align'|'audit'|'settle'} phase
 * @returns {Array} 该阶段的所有事件
 */
export function getEventsByPhase(phase) {
  return ALL_EVENTS.filter((e) => e.phase === phase)
}

/**
 * 按场景对象获取事件
 * @param {string} sceneObject - 场景对象名称
 * @returns {Array} 涉及该场景对象的所有事件
 */
export function getEventsBySceneObject(sceneObject) {
  return ALL_EVENTS.filter((e) => e.scene_object === sceneObject)
}

/**
 * 按状态条件筛选可触发事件
 * @param {object} currentState - 当前游戏状态 { badge_match, danger, suspicion, witness_consistency, audit_round }
 * @param {string} phase - 当前阶段
 * @returns {Array} 可触发的事件列表
 */
export function getAvailableEvents(currentState, phase) {
  const phaseEvents = getEventsByPhase(phase)
  return phaseEvents.filter((event) => evaluateTrigger(event.trigger, currentState))
}

/**
 * 评估事件触发条件
 */
function evaluateTrigger(trigger, state) {
  if (trigger.always) return true

  if (trigger.audit_round !== undefined && state.audit_round !== trigger.audit_round) return false
  if (trigger.audit_round_gte !== undefined && state.audit_round < trigger.audit_round_gte) return false
  if (trigger.danger_gte !== undefined && state.danger < trigger.danger_gte) return false
  if (trigger.danger_lte !== undefined && state.danger > trigger.danger_lte) return false
  if (trigger.suspicion_gte !== undefined && state.suspicion < trigger.suspicion_gte) return false
  if (trigger.suspicion_lte !== undefined && state.suspicion > trigger.suspicion_lte) return false
  if (trigger.badge_match_lte !== undefined && state.badge_match > trigger.badge_match_lte) return false
  if (trigger.badge_match_gte !== undefined && state.badge_match < trigger.badge_match_gte) return false
  if (trigger.witness_consistency_lte !== undefined && state.witness_consistency > trigger.witness_consistency_lte) return false
  if (trigger.witness_consistency_gte !== undefined && state.witness_consistency < trigger.witness_consistency_gte) return false

  return true
}

/**
 * 应用事件的状态变化
 * @param {object} event - 触发的事件
 * @param {object} currentState - 当前游戏状态
 * @returns {object} 新状态（浅拷贝）
 */
export function applyEventDelta(event, currentState) {
  const delta = event.state_delta
  return {
    badge_match: (currentState.badge_match ?? 5) + (delta.badge_match ?? 0),
    danger: Math.max(0, (currentState.danger ?? 0) + (delta.danger ?? 0)),
    suspicion: Math.max(0, (currentState.suspicion ?? 0) + (delta.suspicion ?? 0)),
    witness_consistency: (currentState.witness_consistency ?? 5) + (delta.witness_consistency ?? 0),
    audit_round: (currentState.audit_round ?? 0) + (delta.audit_round ?? 0),
  }
}

/**
 * 核心循环阶段顺序
 */
export const CORE_LOOP_PHASES = ['recon', 'swap', 'align', 'audit', 'settle']

/**
 * 获取下一个阶段
 */
export function nextPhase(currentPhase) {
  const idx = CORE_LOOP_PHASES.indexOf(currentPhase)
  if (idx === -1 || idx === CORE_LOOP_PHASES.length - 1) return CORE_LOOP_PHASES[0]
  return CORE_LOOP_PHASES[idx + 1]
}
