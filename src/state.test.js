import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { initGameState, swapBadge, updateTestimony, runAudit, calculateDanger, advanceRound, checkEnding, calculateWitnessScore, settleRound, resolveOneLoop } from './state.js'

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

describe('swapBadge dual pressure', () => {
  it('adds suspicion on swap (risk pressure)', () => {
    const s = initGameState()
    const [b1, b2] = Object.keys(s.badge_match)
    const ns = swapBadge(s, b1, s.badge_match[b2])
    assert.ok(ns.suspicion > s.suspicion, 'swap should increase suspicion')
  })
  it('changes danger on swap to empty position (survival pressure)', () => {
    const s = initGameState()
    const [b1] = Object.keys(s.badge_match)
    const ns = swapBadge(s, b1, 'pos_warehouse')
    assert.notEqual(ns.danger, s.danger)
    assert.ok(ns.danger < s.danger, 'moving to safer position should reduce danger')
  })
})

describe('calculateWitnessScore', () => {
  it('returns 0 when all testimonies mismatch', () => {
    const s = initGameState()
    assert.equal(calculateWitnessScore(s), 0)
  })
  it('returns 1 when all testimonies match', () => {
    const s = initGameState()
    for (const [bid, pid] of Object.entries(s.badge_match)) {
      s.witness_consistency[bid].at_position = pid
    }
    assert.equal(calculateWitnessScore(s), 1)
  })
  it('returns 0.5 when half match', () => {
    const s = initGameState()
    const [b1] = Object.keys(s.badge_match)
    s.witness_consistency[b1].at_position = s.badge_match[b1]
    assert.equal(calculateWitnessScore(s), 0.5)
  })
})

describe('settleRound', () => {
  it('detects danger ending', () => {
    const s = { ...initGameState(), danger: 100 }
    const { result } = settleRound(s)
    assert.equal(result.ending.type, 'eliminated_danger')
  })
  it('detects suspicion ending', () => {
    const s = { ...initGameState(), suspicion: 100 }
    const { result } = settleRound(s)
    assert.equal(result.ending.type, 'eliminated_suspicion')
  })
  it('settles without ending when within thresholds', () => {
    const s = initGameState()
    const { result } = settleRound(s)
    assert.equal(result.ending, null)
    assert.ok(result.danger_score >= 0)
    assert.ok(result.witness_score >= 0 && result.witness_score <= 1)
  })
  it('audit pass lowers suspicion', () => {
    const s = { ...initGameState(), suspicion: 20 }
    for (const [bid, pid] of Object.entries(s.badge_match)) {
      s.witness_consistency[bid].at_position = pid
    }
    const { result } = settleRound(s)
    assert.equal(result.audit_passed, true)
    assert.ok(result.suspicion_after < result.suspicion_before)
  })
})

describe('resolveOneLoop', () => {
  it('runs full loop and advances round', () => {
    const s = initGameState()
    const [b1, b2] = Object.keys(s.badge_match)
    const { state: ns, result } = resolveOneLoop(s, {
      swap: { badgeId: b1, targetPositionId: s.badge_match[b2] },
      testimonyUpdates: [
        { badgeId: b1, field: 'at_position', value: s.badge_match[b2] },
        { badgeId: b2, field: 'at_position', value: s.badge_match[b1] },
      ],
    })
    assert.equal(result.ending, null)
    assert.equal(ns.audit_round, s.audit_round + 1)
  })
  it('eliminated when suspicion too high', () => {
    const s = { ...initGameState(), suspicion: 95 }
    const { result } = resolveOneLoop(s, {
      swap: { badgeId: Object.keys(s.badge_match)[0], targetPositionId: 'pos_warehouse' },
    })
    assert.ok(result.ending !== null)
    assert.ok(['eliminated_suspicion', 'eliminated_danger'].includes(result.ending.type))
  })
  it('no swap skips swap phase', () => {
    const s = initGameState()
    for (const [bid, pid] of Object.entries(s.badge_match)) {
      s.witness_consistency[bid].at_position = pid
    }
    const { state: ns } = resolveOneLoop(s, {})
    assert.equal(ns.audit_round, s.audit_round + 1)
  })
})
