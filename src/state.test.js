import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { initGameState, swapBadge, updateTestimony, runAudit, calculateDanger, advanceRound, checkEnding } from './state.js'

describe('initGameState', () => {
  it('uses 2 workers for round 1', () => {
    const s = initGameState()
    assert.equal(Object.keys(s.badge_match).length, 2)
    assert.equal(s.audit_round, 1)
    assert.equal(s.suspicion, 0)
    assert.ok(s.danger > 0)
  })
  it('maps badges to positions', () => {
    const s = initGameState()
    for (const [bid, pid] of Object.entries(s.badge_match)) {
      assert.ok(bid.startsWith('w_'))
      assert.ok(pid.startsWith('pos_'))
    }
  })
  it('has witness entries per badge', () => {
    const s = initGameState()
    for (const bid of Object.keys(s.badge_match)) {
      assert.ok(s.witness_consistency[bid]?.at_position)
      assert.ok(s.witness_consistency[bid]?.saw_worker)
    }
  })
})

describe('swapBadge', () => {
  it('swaps two badges', () => {
    const s = initGameState()
    const [b1, b2] = Object.keys(s.badge_match)
    const p1 = s.badge_match[b1], p2 = s.badge_match[b2]
    const ns = swapBadge(s, b1, p2)
    assert.equal(ns.badge_match[b1], p2)
    assert.equal(ns.badge_match[b2], p1)
  })
  it('recalculates danger', () => {
    const s = initGameState()
    const [b1, b2] = Object.keys(s.badge_match)
    const ns = swapBadge(s, b1, s.badge_match[b2])
    assert.equal(ns.danger, s.danger)
  })
  it('does not mutate original', () => {
    const s = initGameState()
    const orig = { ...s.badge_match }
    swapBadge(s, Object.keys(s.badge_match)[0], 'pos_warehouse')
    assert.deepEqual(s.badge_match, orig)
  })
})

describe('updateTestimony', () => {
  it('correct update reduces suspicion', () => {
    let s = { ...initGameState(), suspicion: 20 }
    const bid = Object.keys(s.badge_match)[0]
    const r = updateTestimony(s, bid, 'at_position', s.badge_match[bid])
    assert.equal(r.correct, true)
    assert.equal(r.state.suspicion, 15)
  })
  it('wrong update adds suspicion', () => {
    const s = initGameState()
    const bid = Object.keys(s.badge_match)[0]
    const r = updateTestimony(s, bid, 'at_position', 'pos_warehouse')
    assert.equal(r.correct, false)
    assert.equal(r.state.suspicion, 10)
  })
})

describe('runAudit', () => {
  it('passes when testimonies match', () => {
    const s = initGameState()
    for (const [bid, pid] of Object.entries(s.badge_match)) s.witness_consistency[bid].at_position = pid
    const r = runAudit(s)
    assert.equal(r.passed, true)
    assert.equal(r.mismatches.length, 0)
    assert.equal(r.suspicion_delta, -5)
  })
  it('detects mismatches', () => {
    const s = initGameState()
    const [b1, b2] = Object.keys(s.badge_match)
    s.witness_consistency[b1].at_position = 'pos_warehouse'
    s.witness_consistency[b2].at_position = 'pos_warehouse'
    const r = runAudit(s)
    assert.equal(r.passed, false)
    assert.equal(r.mismatches.length, 2)
    assert.equal(r.suspicion_delta, 30)
  })
})

describe('calculateDanger', () => {
  it('sums occupied position danger levels', () => {
    const s = initGameState()
    assert.ok(calculateDanger(s) > 0)
  })
})

describe('advanceRound', () => {
  it('advances round 1 to 2', () => {
    const ns = advanceRound(initGameState())
    assert.ok(ns)
    assert.equal(ns.audit_round, 2)
  })
  it('returns null after round 4', () => {
    const s = initGameState(); s.audit_round = 4
    assert.equal(advanceRound(s), null)
  })
})

describe('checkEnding', () => {
  it('danger >= 100 → eliminated_danger', () => {
    assert.equal(checkEnding({ ...initGameState(), danger: 100 }).type, 'eliminated_danger')
  })
  it('suspicion >= 100 → eliminated_suspicion', () => {
    assert.equal(checkEnding({ ...initGameState(), suspicion: 100 }).type, 'eliminated_suspicion')
  })
  it('round 4 safe → survive', () => {
    assert.equal(checkEnding({ ...initGameState(), audit_round: 4, danger: 20, suspicion: 20 }).type, 'survive')
  })
  it('ongoing → null', () => {
    assert.equal(checkEnding(initGameState()), null)
  })
})
