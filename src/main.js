/**
 * main.js — 工牌交换 主循环入口
 * Direction Lock: 查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
 */
import { initGameState, swapBadge, updateTestimony, runAudit, advanceRound, checkEnding, settleRound } from './state.js'
import { POSITIONS, WORKERS, FACE_FEATURES } from './content/badgeData.js'
import { CORE_LOOP_PHASES, getEventsByPhase } from './content/eventPool.js'

let gameState = null
let currentPhase = 'recon'

export function startGame() {
  gameState = initGameState()
  currentPhase = 'recon'
  render()
}

export function nextCorePhase() {
  const idx = CORE_LOOP_PHASES.indexOf(currentPhase)
  if (idx < CORE_LOOP_PHASES.length - 1) currentPhase = CORE_LOOP_PHASES[idx + 1]
  render()
}

export function handleBadgeSwap(badgeId, targetPositionId) {
  if (currentPhase !== 'swap') return null
  gameState = swapBadge(gameState, badgeId, targetPositionId)
  render()
  return gameState
}

export function handleTestimonyUpdate(badgeId, field, value) {
  if (currentPhase !== 'align') return null
  const r = updateTestimony(gameState, badgeId, field, value)
  gameState = r.state
  render()
  return r
}

export function handleAudit() {
  if (currentPhase !== 'audit') return null
  const r = runAudit(gameState)
  gameState.suspicion = Math.max(0, Math.min(100, gameState.suspicion + r.suspicion_delta))
  render()
  return r
}

export function handleSettle() {
  if (currentPhase !== 'settle') return null
  const { result, state: settledState } = settleRound(gameState)
  if (result.ending) return result.ending
  const next = advanceRound(settledState)
  if (!next) return { type: 'timeout', message: '时间到' }
  gameState = next
  currentPhase = 'recon'
  render()
  return null
}

const barFill = (v) => '█'.repeat(Math.round(v / 25)) + '░'.repeat(4 - Math.round(v / 25))
const phaseLabel = (p) => ({ recon: '查看岗位', swap: '交换工牌', align: '调整证词', audit: '接受审查', settle: '结算' })[p] ?? p

function render() {
  if (!gameState) return
  const bar = document.getElementById('status-bar')
  if (bar) {
    const d = gameState.danger, s = gameState.suspicion
    bar.innerHTML = `<span class="stat danger ${d >= 80 ? 'critical' : ''}">danger: ${barFill(d)} ${d}</span>
      <span class="stat suspicion ${s >= 80 ? 'critical' : ''}">suspicion: ${barFill(s)} ${s}</span>
      <span class="stat round">round: ${gameState.audit_round}/4</span>`
  }

  const board = document.getElementById('position-board')
  if (board) {
    board.innerHTML = ''
    for (const pos of POSITIONS) {
      const occId = Object.entries(gameState.badge_match).find(([, p]) => p === pos.id)?.[0]
      const w = occId ? WORKERS.find((x) => x.id === occId) : null
      const feat = w ? w.face_features.map((f) => FACE_FEATURES.find((ff) => ff.id === f)?.label).join(', ') : ''
      const slot = document.createElement('div')
      slot.className = 'position-slot'
      slot.dataset.positionId = pos.id
      slot.innerHTML = `<div class="slot-header"><span class="pos-title">${pos.title}</span><span class="pos-zone">${pos.zone}</span></div>
        <div class="pos-danger danger-level-${pos.danger_level}">危:${pos.danger_level}</div>
        ${w ? `<div class="badge-card" data-badge-id="${w.id}" draggable="true"><div class="badge-name">${w.name}</div><div class="badge-face">${feat}</div></div>` : '<div class="badge-card empty">空</div>'}`
      board.appendChild(slot)
    }
  }

  const panel = document.getElementById('testimony-panel')
  if (panel) {
    panel.innerHTML = ''
    for (const [bid, t] of Object.entries(gameState.witness_consistency)) {
      const w = WORKERS.find((x) => x.id === bid)
      const cp = gameState.badge_match[bid]
      const ok = t.at_position === cp
      const card = document.createElement('div')
      card.className = 'testimony-card'
      card.dataset.badgeId = bid
      card.innerHTML = `<div class="testimony-header">${w?.name ?? bid} 的证词 <span class="${ok ? 'match' : 'mismatch'}">${ok ? '✓' : '✗'}</span></div>
        <div class="testimony-line" data-field="saw_worker">看见: ${t.saw_worker}</div>
        <div class="testimony-line" data-field="at_position">在: ${t.at_position}</div>`
      panel.appendChild(card)
    }
  }

  const pi = document.getElementById('phase-indicator')
  if (pi) pi.innerHTML = CORE_LOOP_PHASES.map((p) => `<span class="phase ${p === currentPhase ? 'active' : ''}">${phaseLabel(p)}</span>`).join(' → ')

  const eh = document.getElementById('event-hint')
  if (eh) { const ev = getEventsByPhase(currentPhase); if (ev.length) eh.textContent = ev[0].narrative }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    startGame()
    document.addEventListener('click', (e) => {
      if (e.target.matches('#btn-next-phase')) nextCorePhase()
      if (e.target.matches('#btn-audit')) handleAudit()
      if (e.target.matches('#btn-settle')) handleSettle()
    })
  })
}
