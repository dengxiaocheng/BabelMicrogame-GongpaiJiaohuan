/**
 * badgeData.js — 工牌交换 基础数据资产
 *
 * 服务核心情绪：身份一致性谜题 + 危险岗位规避
 * 服务核心循环：查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
 *
 * Scene Objects: 工牌, 岗位表, 脸部特征卡, 证词链, 审查印章
 * Required State: badge_match, danger, suspicion, witness_consistency, audit_round
 */

// ─── 岗位表 (岗位表 Scene Object) ────────────────────────────────

export const POSITIONS = [
  {
    id: 'pos_boiler',
    title: '锅炉巡检',
    danger_level: 5,
    zone: 'B3',
    description: '高温管道区，单人值守。近期事故率高。',
    risk_tag: '致命',
  },
  {
    id: 'pos_chemical',
    title: '化料调配',
    danger_level: 4,
    zone: 'B2',
    description: '接触有毒溶剂。防护设备不足。',
    risk_tag: '高危',
  },
  {
    id: 'pos_forklift',
    title: '叉车搬运',
    danger_level: 3,
    zone: 'A1',
    description: '重型机械作业区。需持证上岗。',
    risk_tag: '中危',
  },
  {
    id: 'pos_assembly',
    title: '装配线',
    danger_level: 2,
    zone: 'A2',
    description: '流水线组装。有固定工位。',
    risk_tag: '普通',
  },
  {
    id: 'pos_warehouse',
    title: '仓库清点',
    danger_level: 1,
    zone: 'C1',
    description: '远离产线，室内恒温。最安全的岗位。',
    risk_tag: '低危',
  },
]

// ─── 脸部特征 (脸部特征卡 Scene Object) ──────────────────────────

export const FACE_FEATURES = [
  { id: 'feat_scar', label: '左颊疤痕', visual: 'scar_left' },
  { id: 'feat_glasses', label: '黑框眼镜', visual: 'glasses_black' },
  { id: 'feat_beard', label: '络腮胡', visual: 'beard_full' },
  { id: 'feat_mole', label: '眉心痣', visual: 'mole_center' },
  { id: 'feat_bald', label: '光头', visual: 'bald' },
]

// ─── 工人基础档案 (工牌 Scene Object 的数据源) ──────────────────

export const WORKERS = [
  {
    id: 'w_chen',
    name: '陈实',
    face_features: ['feat_scar', 'feat_bald'],
    original_position: 'pos_boiler',
    testimony_template: 'testimony_chen',
  },
  {
    id: 'w_liu',
    name: '刘芳',
    face_features: ['feat_glasses', 'feat_mole'],
    original_position: 'pos_chemical',
    testimony_template: 'testimony_liu',
  },
  {
    id: 'w_zhao',
    name: '赵刚',
    face_features: ['feat_beard'],
    original_position: 'pos_forklift',
    testimony_template: 'testimony_zhao',
  },
  {
    id: 'w_sun',
    name: '孙梅',
    face_features: ['feat_mole', 'feat_glasses'],
    original_position: 'pos_assembly',
    testimony_template: 'testimony_sun',
  },
  {
    id: 'w_huang',
    name: '黄涛',
    face_features: ['feat_bald', 'feat_beard'],
    original_position: 'pos_warehouse',
    testimony_template: 'testimony_huang',
  },
]

// ─── 证词模板 (证词链 Scene Object) ──────────────────────────────
// 每条证词引用一个工人和岗位，形成交叉印证网络
// 关键：证词的「看见谁在哪个岗位」是身份一致性的核心检查点

export const TESTIMONY_TEMPLATES = {
  testimony_chen: {
    worker_id: 'w_chen',
    default_claim: {
      saw_worker: 'w_liu',
      at_position: 'pos_chemical',
      time_slot: 'morning',
    },
    editable_fields: ['saw_worker', 'at_position'],
    text_template: '我看到 {saw_worker_name} 在 {position_title} 岗位。',
  },
  testimony_liu: {
    worker_id: 'w_liu',
    default_claim: {
      saw_worker: 'w_zhao',
      at_position: 'pos_forklift',
      time_slot: 'morning',
    },
    editable_fields: ['saw_worker', 'at_position'],
    text_template: '{saw_worker_name} 早上在 {position_title} 那边。',
  },
  testimony_zhao: {
    worker_id: 'w_zhao',
    default_claim: {
      saw_worker: 'w_chen',
      at_position: 'pos_boiler',
      time_slot: 'morning',
    },
    editable_fields: ['saw_worker', 'at_position'],
    text_template: '我记得 {saw_worker_name} 去了 {position_title}。',
  },
  testimony_sun: {
    worker_id: 'w_sun',
    default_claim: {
      saw_worker: 'w_huang',
      at_position: 'pos_warehouse',
      time_slot: 'morning',
    },
    editable_fields: ['saw_worker', 'at_position'],
    text_template: '{saw_worker_name} 分配到了 {position_title}。',
  },
  testimony_huang: {
    worker_id: 'w_huang',
    default_claim: {
      saw_worker: 'w_sun',
      at_position: 'pos_assembly',
      time_slot: 'morning',
    },
    editable_fields: ['saw_worker', 'at_position'],
    text_template: '我看见 {saw_worker_name} 去 {position_title} 报到了。',
  },
}

// ─── 工牌初始分配 (badge_match 计算的基准) ──────────────────────
// badge_match = 工牌上的岗位 是否与 脸部特征卡对应工人的实际岗位一致

export function createInitialBadgeState() {
  return WORKERS.map((w) => ({
    worker_id: w.id,
    face_features: [...w.face_features],
    badge_position: w.original_position, // 工牌上写的岗位
    actual_position: w.original_position, // 该工人实际去的岗位
  }))
}

// ─── 审查印章预设 (审查印章 Scene Object) ────────────────────────

export const AUDIT_STAMPS = {
  PASS: { id: 'stamp_pass', label: '通过', icon: 'check', color: 'green' },
  FLAG: { id: 'stamp_flag', label: '存疑', icon: 'warning', color: 'yellow' },
  FAIL: { id: 'stamp_fail', label: '不通过', icon: 'cross', color: 'red' },
}

// ─── 危险等级阈值 ────────────────────────────────────────────────

export const DANGER_THRESHOLDS = {
  SAFE: 1,
  CAUTION: 2,
  DANGEROUS: 3,
  CRITICAL: 4,
  LETHAL: 5,
}

// ─── 疑点等级阈值 ────────────────────────────────────────────────

export const SUSPICION_THRESHOLDS = {
  CLEAR: 0,
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5,
  CAUGHT: 7,
}
