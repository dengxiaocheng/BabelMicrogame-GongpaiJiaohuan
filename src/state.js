// state.js — 工牌交换 状态模块
// Direction Lock: badge_match, danger, suspicion, witness_consistency, audit_round

import { POSITIONS, WORKERS, TESTIMONY_TEMPLATES } from './content/badgeData.js'

export function initGameState() {
  const workers = WORKERS.slice(0, 2) // audit_round 1: 2张工牌
  const badge_match = {}
  const witness_consistency = {}
  for (const w of workers) {
    badge_match[w.id] = w.original_position
    witness_consistency[w.id] = { ...TESTIMONY_TEMPLATES[w.testimony_template].default_claim }
  }
  const state = { badge_match, danger: 0, suspicion: 0, witness_consistency, audit_round: 1 }
  state.danger = calculateDanger(state)
  return state
}

export function swapBadge(state, badgeId, targetPositionId) {
  const bm = { ...state.badge_match }
  const src = bm[badgeId]
  let other = null
  for (const [bid, pid] of Object.entries(bm)) { if (pid === targetPositionId) { other = bid; break } }
  bm[badgeId] = targetPositionId
  if (other) bm[other] = src
  const ns = { ...state, badge_match: bm }
  ns.danger = calculateDanger(ns)
  // State coupling: 换牌同时推动 survival (danger) + risk (suspicion)
  ns.suspicion = Math.min(100, state.suspicion + 3)
  return ns
}

export function updateTestimony(state, badgeId, field, value) {
  const w = { ...state.witness_consistency }
  w[badgeId] = { ...w[badgeId], [field]: value }
  const correct = field === 'at_position' ? value === state.badge_match[badgeId] : true
  return {
    state: { ...state, witness_consistency: w, suspicion: Math.max(0, Math.min(100, state.suspicion + (correct ? -5 : +10))) },
    correct,
  }
}

export function calculateDanger(state) {
  const occ = new Set(Object.values(state.badge_match))
  return Math.min(100, POSITIONS.filter((p) => occ.has(p.id)).reduce((s, p) => s + p.danger_level, 0))
}

export function runAudit(state) {
  const mismatches = []
  for (const [bid, pid] of Object.entries(state.badge_match)) {
    const t = state.witness_consistency[bid]
    if (t && t.at_position !== pid) mismatches.push({ badgeId: bid, expected: pid, actual: t.at_position })
  }
  return { passed: mismatches.length === 0, mismatches, suspicion_delta: mismatches.length > 0 ? mismatches.length * 15 : -5 }
}

export function advanceRound(state) {
  const next = state.audit_round + 1
  if (next > 4) return null
  const count = { 2: 3, 3: 4, 4: 4 }[next] ?? 2
  const bm = { ...state.badge_match }, wc = { ...state.witness_consistency }
  for (const w of WORKERS.slice(0, count)) {
    if (!bm[w.id]) { bm[w.id] = w.original_position; wc[w.id] = { ...TESTIMONY_TEMPLATES[w.testimony_template].default_claim } }
  }
  const ns = { ...state, badge_match: bm, witness_consistency: wc, audit_round: next }
  ns.danger = calculateDanger(ns)
  return ns
}

export function checkEnding(state) {
  if (state.danger >= 100) return { type: 'eliminated_danger', message: '被分配到极端危险岗位' }
  if (state.suspicion >= 100) return { type: 'eliminated_suspicion', message: '审查员判定身份造假' }
  if (state.audit_round >= 4 && state.danger < 80 && state.suspicion < 80) return { type: 'survive', message: '通过全部审查' }
  return null
}

// calculateWitnessScore — 证词一致性比率 (0~1)
export function calculateWitnessScore(state) {
  const entries = Object.entries(state.witness_consistency)
  if (entries.length === 0) return 1
  let match = 0
  for (const [bid, t] of entries) {
    if (t.at_position === state.badge_match[bid]) match++
  }
  return match / entries.length
}

// settleRound — 一次审查结算：audit → suspicion → ending check
// 产出包含 survival (danger_score) + risk (witness_score, suspicion) 两类压力
export function settleRound(state) {
  const audit = runAudit(state)
  const newSuspicion = Math.max(0, Math.min(100, state.suspicion + audit.suspicion_delta))
  const witnessScore = calculateWitnessScore(state)
  const dangerScore = calculateDanger(state)
  const settled = { ...state, suspicion: newSuspicion }
  const result = {
    danger_score: dangerScore,
    witness_score: witnessScore,
    audit_passed: audit.passed,
    suspicion_before: state.suspicion,
    suspicion_after: newSuspicion,
    ending: null,
  }
  if (settled.danger >= 100) {
    result.ending = { type: 'eliminated_danger', message: '被分配到极端危险岗位' }
  } else if (settled.suspicion >= 100) {
    result.ending = { type: 'eliminated_suspicion', message: '审查员判定身份造假' }
  } else if (state.audit_round >= 4 && settled.danger < 80 && settled.suspicion < 80) {
    result.ending = { type: 'survive', message: '通过全部审查' }
  }
  return { result, state: settled, audit }
}

// resolveOneLoop — 执行一次完整主循环：swap → align → audit → settle → advance
// actions: { swap?: { badgeId, targetPositionId }, testimonyUpdates?: [{ badgeId, field, value }] }
export function resolveOneLoop(state, actions = {}) {
  let current = { ...state }
  // Phase 2: swap — survival + risk 双重压力
  if (actions.swap) {
    current = swapBadge(current, actions.swap.badgeId, actions.swap.targetPositionId)
  }
  // Phase 3: align testimony — risk 压力
  if (actions.testimonyUpdates) {
    for (const tu of actions.testimonyUpdates) {
      const r = updateTestimony(current, tu.badgeId, tu.field, tu.value)
      current = r.state
    }
  }
  // Phase 4-5: audit + settle — 综合结算
  const settlement = settleRound(current)
  if (!settlement.result.ending) {
    const next = advanceRound(settlement.state)
    if (next) settlement.state = next
    else settlement.result.ending = { type: 'timeout', message: '时间到' }
  }
  return settlement
}
