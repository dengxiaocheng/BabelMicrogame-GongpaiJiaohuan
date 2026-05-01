/**
 * main.js — 工牌交换 主循环入口
 * Direction Lock: 查看岗位 -> 交换工牌 -> 调整证词 -> 接受审查 -> 结算危险和疑点
 * Primary Input: 拖换工牌并同步调整岗位记录/证词卡
 */
import { initGameState, swapBadge, updateTestimony, runAudit, advanceRound, settleRound, calculateWitnessScore } from './state.js'
import { POSITIONS, WORKERS, FACE_FEATURES, TESTIMONY_TEMPLATES } from './content/badgeData.js'
import { CORE_LOOP_PHASES, getEventsByPhase, getAvailableEvents } from './content/eventPool.js'

let gameState = null
let currentPhase = 'recon'
let feedbackFlash = null
let auditResult = null
let draggedBadgeId = null
let endingState = null

// ─── Helpers ─────────────────────────────────────────────────────
const phaseLabel = (p) => ({ recon: '查看岗位', swap: '交换工牌', align: '调整证词', audit: '接受审查', settle: '结算' })[p] ?? p
const workerName = (id) => WORKERS.find(w => w.id === id)?.name ?? id
const posTitle = (id) => POSITIONS.find(p => p.id === id)?.title ?? id
const isBefore = (a, b) => CORE_LOOP_PHASES.indexOf(a) < CORE_LOOP_PHASES.indexOf(b)

// ─── Event bridge ────────────────────────────────────────────────
// eventPool 使用小整数状态 (danger 0~5, suspicion 0~7, badge_match 0~5)
// state.js 使用 0~100 范围; 此桥接函数转换格式以匹配事件触发条件

function toEventState(state) {
  const ws = calculateWitnessScore(state)
  return {
    audit_round: state.audit_round,
    danger: Math.round(state.danger / 20),
    suspicion: Math.round(state.suspicion / 14),
    badge_match: Math.round(ws * 5),
    witness_consistency: Math.round(ws * 5),
  }
}

function triggerPhaseEvent(phase) {
  if (!gameState) return null
  const events = getAvailableEvents(toEventState(gameState), phase)
  return events.length ? events[0] : null
}

function showFeedback(type, message) {
  feedbackFlash = { type, message }
  setTimeout(() => { feedbackFlash = null; renderFeedback() }, 2200)
}

// ─── Game lifecycle ──────────────────────────────────────────────
export function startGame() {
  gameState = initGameState()
  currentPhase = 'recon'
  auditResult = null
  feedbackFlash = null
  endingState = null
  const overlay = document.getElementById('ending-overlay')
  if (overlay) overlay.remove()
  const reconEvent = triggerPhaseEvent('recon')
  render()
  if (reconEvent) showFeedback('swap', reconEvent.narrative)
}

export function nextCorePhase() {
  const idx = CORE_LOOP_PHASES.indexOf(currentPhase)
  if (idx < CORE_LOOP_PHASES.length - 1) {
    currentPhase = CORE_LOOP_PHASES[idx + 1]
    auditResult = null
    const phaseEvent = triggerPhaseEvent(currentPhase)
    if (phaseEvent) showFeedback('swap', phaseEvent.narrative)
  }
  render()
}

// ─── Core interactions ──────────────────────────────────────────

function handleSwap(badgeId, targetPositionId) {
  if (currentPhase !== 'swap') return
  if (gameState.badge_match[badgeId] === targetPositionId) return
  gameState = swapBadge(gameState, badgeId, targetPositionId)
  showFeedback('swap', `交换完成 → ${posTitle(targetPositionId)}`)
  render()
}

function handleTestimonyClick(badgeId, field) {
  if (currentPhase !== 'align') return
  const w = WORKERS.find(x => x.id === badgeId)
  const tmpl = TESTIMONY_TEMPLATES[w?.testimony_template]
  if (!tmpl || !tmpl.editable_fields.includes(field)) return
  const cur = gameState.witness_consistency[badgeId][field]
  const opts = field === 'saw_worker'
    ? WORKERS.filter(x => x.id !== badgeId).map(x => x.id)
    : POSITIONS.map(p => p.id)
  const next = opts[(opts.indexOf(cur) + 1) % opts.length]
  const r = updateTestimony(gameState, badgeId, field, next)
  gameState = r.state
  showFeedback(r.correct ? 'pass' : 'fail', r.correct ? '证词一致 ✓' : '证词矛盾 ✗ 疑点+10')
  render()
}

function handleAudit() {
  if (currentPhase !== 'audit') return
  const r = runAudit(gameState)
  gameState.suspicion = Math.max(0, Math.min(100, gameState.suspicion + r.suspicion_delta))
  auditResult = r
  showFeedback(r.passed ? 'pass' : 'fail', r.passed ? '审查通过' : `发现 ${r.mismatches.length} 处矛盾`)
  render()
}

function handleSettle() {
  if (currentPhase !== 'settle') return
  const { result, state: settled } = settleRound(gameState)
  if (result.ending) {
    gameState = settled
    endingState = result.ending
    showFeedback(result.ending.type === 'survive' ? 'pass' : 'fail', result.ending.message)
    render()
    renderEnding()
    return
  }
  const next = advanceRound(settled)
  if (!next) {
    gameState = settled
    endingState = { type: 'timeout', message: '时间到' }
    showFeedback('fail', '时间到')
    render()
    renderEnding()
    return
  }
  gameState = next
  currentPhase = 'recon'
  auditResult = null
  const reconEvent = triggerPhaseEvent('recon')
  showFeedback('pass', `进入第 ${next.audit_round} 轮`)
  render()
  if (reconEvent) setTimeout(() => showFeedback('swap', reconEvent.narrative), 400)
}

// ─── Drag & Drop ─────────────────────────────────────────────────

function onDragStart(e) {
  draggedBadgeId = e.target.dataset.badgeId
  e.target.classList.add('dragging')
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', draggedBadgeId)
}

function onDragEnd(e) {
  e.target.classList.remove('dragging')
  draggedBadgeId = null
  document.querySelectorAll('.position-slot').forEach(s => s.classList.remove('drop-target'))
}

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  e.currentTarget.classList.add('drop-target')
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drop-target')
}

function onDrop(e) {
  e.preventDefault()
  e.currentTarget.classList.remove('drop-target')
  const badgeId = e.dataTransfer.getData('text/plain')
  const targetPosId = e.currentTarget.dataset.positionId
  if (badgeId && targetPosId) handleSwap(badgeId, targetPosId)
}

// ─── Touch drag support ──────────────────────────────────────────
let touchBadge = null
let touchGhost = null

function onTouchStart(e) {
  const card = e.target.closest('.badge-card.draggable')
  if (!card) return
  touchBadge = card.dataset.badgeId
  const rect = card.getBoundingClientRect()
  touchGhost = card.cloneNode(true)
  touchGhost.classList.add('drag-ghost')
  touchGhost.style.width = rect.width + 'px'
  document.body.appendChild(touchGhost)
  moveTouchGhost(e.touches[0])
}

function onTouchMove(e) {
  if (!touchBadge) return
  e.preventDefault()
  moveTouchGhost(e.touches[0])
  const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)
  document.querySelectorAll('.position-slot').forEach(s => s.classList.remove('drop-target'))
  const slot = el?.closest('.position-slot')
  if (slot) slot.classList.add('drop-target')
}

function onTouchEnd(e) {
  if (!touchBadge) return
  const el = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
  const slot = el?.closest('.position-slot')
  if (slot) handleSwap(touchBadge, slot.dataset.positionId)
  if (touchGhost) { touchGhost.remove(); touchGhost = null }
  touchBadge = null
  document.querySelectorAll('.position-slot').forEach(s => s.classList.remove('drop-target'))
}

function moveTouchGhost(touch) {
  if (!touchGhost) return
  touchGhost.style.left = (touch.clientX - 30) + 'px'
  touchGhost.style.top = (touch.clientY - 20) + 'px'
}

// ─── Ending overlay ──────────────────────────────────────────────

function injectEndingStyles() {
  if (document.getElementById('ending-styles')) return
  const style = document.createElement('style')
  style.id = 'ending-styles'
  style.textContent = `
    .ending-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(26,26,46,.92);display:flex;align-items:center;justify-content:center;z-index:100}
    .ending-content{text-align:center;padding:32px;background:#16213e;border:2px solid #0f3460;border-radius:8px;max-width:400px}
    .ending-title{font-size:22px;margin-bottom:12px}
    .ending-pass .ending-title{color:#50c878}.ending-fail .ending-title{color:#e94560}
    .ending-message{font-size:14px;color:#aaa;margin-bottom:16px}
    .ending-stats{display:flex;gap:16px;justify-content:center;margin-bottom:16px;font-size:13px;color:#888}
    .ending-scores{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;font-size:12px;color:#666}
    #btn-restart{padding:10px 24px;background:#0f3460;color:#e0e0e0;border:1px solid #e94560;border-radius:4px;cursor:pointer;font-family:inherit;font-size:14px}
    #btn-restart:hover{background:#e94560;color:#fff}
  `
  document.head.appendChild(style)
}

function renderEnding() {
  if (!endingState) return
  injectEndingStyles()
  let overlay = document.getElementById('ending-overlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'ending-overlay'
    document.getElementById('app').appendChild(overlay)
  }
  const titles = {
    eliminated_danger: '事故 — 被分配到极端危险岗位',
    eliminated_suspicion: '暴露 — 审查员判定身份造假',
    survive: '存活 — 通过全部审查',
    timeout: '时间到',
  }
  const ws = Math.round(calculateWitnessScore(gameState) * 100)
  overlay.className = `ending-overlay ending-${endingState.type === 'survive' ? 'pass' : 'fail'}`
  overlay.innerHTML = `
    <div class="ending-content">
      <h2 class="ending-title">${titles[endingState.type] ?? endingState.type}</h2>
      <p class="ending-message">${endingState.message}</p>
      <div class="ending-stats">
        <span>危险 ${gameState.danger}</span>
        <span>疑点 ${gameState.suspicion}</span>
        <span>一致 ${ws}%</span>
        <span>轮次 ${gameState.audit_round}/4</span>
      </div>
      <button id="btn-restart">再来一局</button>
    </div>
  `
  document.getElementById('btn-restart').addEventListener('click', startGame)
}

// ─── Rendering ───────────────────────────────────────────────────

function render() {
  if (!gameState) return
  renderStatusBar()
  renderPhaseIndicator()
  renderPositionBoard()
  renderTestimonyPanel()
  renderControls()
  renderFeedback()
}

function renderStatusBar() {
  const bar = document.getElementById('status-bar')
  if (!bar) return
  const d = gameState.danger, s = gameState.suspicion
  const ws = Math.round(calculateWitnessScore(gameState) * 100)
  bar.innerHTML = `
    <div class="stat-group">
      <span class="stat danger ${d >= 60 ? 'critical' : ''}">
        <span class="stat-icon">⚠</span>
        <span class="stat-label">危险</span>
        <span class="stat-bar"><span class="stat-fill danger-fill" style="width:${d}%"></span></span>
        <span class="stat-value">${d}</span>
      </span>
      <span class="stat suspicion ${s >= 60 ? 'critical' : ''}">
        <span class="stat-icon">👁</span>
        <span class="stat-label">疑点</span>
        <span class="stat-bar"><span class="stat-fill suspicion-fill" style="width:${s}%"></span></span>
        <span class="stat-value">${s}</span>
      </span>
      <span class="stat witness">
        <span class="stat-icon">🔗</span>
        <span class="stat-label">一致</span>
        <span class="stat-bar"><span class="stat-fill witness-fill" style="width:${ws}%"></span></span>
        <span class="stat-value">${ws}%</span>
      </span>
    </div>
    <span class="stat round">第 ${gameState.audit_round}/4 轮</span>`
}

function renderPhaseIndicator() {
  const pi = document.getElementById('phase-indicator')
  if (!pi) return
  pi.innerHTML = CORE_LOOP_PHASES.map(p =>
    `<span class="phase ${p === currentPhase ? 'active' : ''} ${isBefore(p, currentPhase) ? 'done' : ''}">${phaseLabel(p)}</span>`
  ).join('<span class="phase-arrow">›</span>')
}

function renderPositionBoard() {
  const board = document.getElementById('position-board')
  if (!board) return
  board.innerHTML = ''
  const isSwap = currentPhase === 'swap'
  board.className = isSwap ? 'position-board swap-active' : 'position-board'

  for (const pos of POSITIONS) {
    const occId = Object.entries(gameState.badge_match).find(([, p]) => p === pos.id)?.[0]
    const w = occId ? WORKERS.find(x => x.id === occId) : null
    const feat = w ? w.face_features.map(f => FACE_FEATURES.find(ff => ff.id === f)?.label).join(', ') : ''
    const slot = document.createElement('div')
    slot.className = `position-slot danger-bg-${pos.danger_level}`
    slot.dataset.positionId = pos.id

    if (isSwap) {
      slot.addEventListener('dragover', onDragOver)
      slot.addEventListener('dragleave', onDragLeave)
      slot.addEventListener('drop', onDrop)
    }

    slot.innerHTML = `
      <div class="slot-header"><span class="pos-title">${pos.title}</span><span class="pos-zone">${pos.zone}</span></div>
      <div class="pos-danger danger-level-${pos.danger_level}">${'<span class="danger-pip">⚠</span>'.repeat(pos.danger_level)}</div>
      ${w
        ? `<div class="badge-card ${isSwap ? 'draggable' : ''}" data-badge-id="${w.id}" draggable="${isSwap}">
             <div class="badge-name">${w.name}</div>
             <div class="badge-face">${feat}</div>
           </div>`
        : '<div class="badge-card empty">空</div>'}`

    if (isSwap && w) {
      const badgeEl = slot.querySelector('.badge-card')
      badgeEl.addEventListener('dragstart', onDragStart)
      badgeEl.addEventListener('dragend', onDragEnd)
      badgeEl.addEventListener('touchstart', onTouchStart, { passive: false })
    }
    board.appendChild(slot)
  }
}

function renderTestimonyPanel() {
  const panel = document.getElementById('testimony-panel')
  if (!panel) return
  panel.innerHTML = ''
  const canEdit = currentPhase === 'align'

  for (const [bid, t] of Object.entries(gameState.witness_consistency)) {
    const w = WORKERS.find(x => x.id === bid)
    const cp = gameState.badge_match[bid]
    const posOk = t.at_position === cp
    const card = document.createElement('div')
    card.className = `testimony-card ${posOk ? 'consistent' : 'inconsistent'}`

    card.innerHTML = `
      <div class="testimony-header">
        <span>${w?.name ?? bid}</span>
        <span class="consistency-mark ${posOk ? 'match' : 'mismatch'}">${posOk ? '✓' : '✗'}</span>
      </div>
      <div class="testimony-line ${canEdit ? 'editable' : ''}" data-field="saw_worker" data-badge="${bid}">
        <span class="testimony-label">看见:</span>
        <span class="testimony-value">${workerName(t.saw_worker)}</span>
        ${canEdit ? '<span class="cycle-hint">▸</span>' : ''}
      </div>
      <div class="testimony-line ${canEdit ? 'editable' : ''}" data-field="at_position" data-badge="${bid}">
        <span class="testimony-label">在:</span>
        <span class="testimony-value">${posTitle(t.at_position)}</span>
        ${canEdit ? '<span class="cycle-hint">▸</span>' : ''}
      </div>`

    if (canEdit) {
      card.querySelectorAll('.testimony-line.editable').forEach(line => {
        line.addEventListener('click', () => handleTestimonyClick(bid, line.dataset.field))
      })
    }
    panel.appendChild(card)
  }
}

function renderControls() {
  const ctrl = document.getElementById('controls')
  if (!ctrl) return
  const actions = {
    recon:  [{ id: 'btn-next-phase', label: '开始换牌 ›', fn: nextCorePhase }],
    swap:   [{ id: 'btn-next-phase', label: '换牌完成 ›', fn: nextCorePhase }],
    align:  [{ id: 'btn-next-phase', label: '提交证词 ›', fn: nextCorePhase }],
    audit:  [{ id: 'btn-audit', label: '接受审查', fn: handleAudit },
             ...(auditResult ? [{ id: 'btn-next-phase', label: '审查结束 ›', fn: nextCorePhase }] : [])],
    settle: [{ id: 'btn-settle', label: '结算本轮', fn: handleSettle }],
  }
  ctrl.innerHTML = ''
  for (const b of (actions[currentPhase] ?? [])) {
    const el = document.createElement('button')
    el.id = b.id; el.textContent = b.label
    el.addEventListener('click', b.fn)
    ctrl.appendChild(el)
  }
}

function renderFeedback() {
  const eh = document.getElementById('event-hint')
  if (!eh) return

  if (auditResult) {
    eh.className = `event-hint ${auditResult.passed ? 'feedback-pass' : 'feedback-fail'}`
    eh.innerHTML = auditResult.passed
      ? '<span class="stamp pass">通过 ✓</span> 所有证词与工牌一致'
      : `<span class="stamp fail">不通过 ✗</span> ${auditResult.mismatches.map(m => `${workerName(m.badgeId)}: 证词说${posTitle(m.actual)}，实际在${posTitle(m.expected)}`).join('；')}`
    return
  }
  if (feedbackFlash) {
    eh.className = `event-hint feedback-${feedbackFlash.type}`
    eh.textContent = feedbackFlash.message
    return
  }
  eh.className = 'event-hint'
  const phaseEvent = triggerPhaseEvent(currentPhase)
  const hints = {
    recon: '查看各岗位的危险等级 — 红色越多越需要换牌',
    swap: '拖动工牌到目标岗位完成交换（每次交换疑点+3）',
    align: '点击证词中的「看见」或「在」循环切换，使证词与工牌匹配',
    audit: '点击「接受审查」检查证词一致性',
    settle: '点击「结算本轮」查看结果并进入下一轮',
  }
  eh.textContent = phaseEvent ? phaseEvent.narrative : (hints[currentPhase] ?? '')
}

// ─── Bootstrap ────────────────────────────────────────────────────
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    startGame()
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  })
}
