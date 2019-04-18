import * as _ from "lodash"
import assert from "assert"

import * as ut from "./util"
import { set_t, eqv } from "./set"
import { group_t } from "./group"

export
class permutation_t {
  /**
   * a permutation is encoded by
   * the result of its action on [1, 2, ..., n].
   * I call this result "sequence".
   */
  readonly sequence: Array <number>
  readonly size: number

  constructor (sequence: Array <number>) {
    this.sequence = sequence
    this.size = sequence.length
  }

  get (i: number): number {
    return this.sequence [i]
  }

  *[Symbol.iterator] () {
    for (let v of this.sequence) {
      yield v
    }
  }

  *pairs () {
    let i = 0
    for (let x of this.sequence) {
      yield [i, x] as [number, number]
      i += 1
    }
  }

  *inv_pairs () {
    let i = 0
    for (let x of this.sequence) {
      yield [x, i] as [number, number]
      i += 1
    }
  }

  inv (): permutation_t {
    let sequence = Array.from (this.inv_pairs ())
      .sort ((x, y) => x [0] - y [0])
      .map (x => x [1])
    return new permutation_t (sequence)
  }

  mul (that: permutation_t): permutation_t {
    let sequence = new Array ()
    for (let i of that.sequence) {
      sequence.push (this.sequence [i])
    }
    return new permutation_t (sequence)
  }

  static identity (n: number): permutation_t {
    let sequence = Array.from (ut.range (0, n))
    return new permutation_t (sequence)
  }

  eq (that: permutation_t): boolean {
    return _.isEqual (this.sequence, that.sequence)
  }

  lt (that: permutation_t): boolean {
    assert (this.size === that.size)
    return this.lt_after (that, 0)
  }

  private lt_after (that: permutation_t, n: number): boolean {
    if (n >= this.size) {
      return false
    }

    let x = this.get (n)
    let y = that.get (n)

    if (x < y) {
      return true
    } else if (x === y) {
      return this.lt_after (that, n + 1)
    } else {
      return false
    }
  }

  lteq (that: permutation_t): boolean {
    return this.lteq_after (that, 0)
  }

  private lteq_after (that: permutation_t, n: number): boolean {
    if (n >= this.size) {
      return true
    }

    let x = this.get (n)
    let y = that.get (n)

    if (x < y) {
      return true
    } else if (x === y) {
      return this.lteq_after (that, n + 1)
    } else {
      return false
    }
  }

  gt (that: permutation_t): boolean {
    return that.lt (this)
  }

  gteq (that: permutation_t): boolean {
    return that.lteq (this)
  }

  // TODO
  // static from_cycle

  // TODO
  // canonical_cycle

  // TODO
  // lehmer_code (): Array <number>
}

/**
 * The group of all permutations of a set M
 * is the symmetric group of M.
 * The term permutation group means
 * a subgroup of the symmetric group.
 */

export
class symmetric_group_t {
  readonly size: number
  readonly group: group_t <permutation_t>

  constructor (
    size: number,
  ) {
    this.size = size
    this.group = new group_t ({
      elements: new set_t ({
        eq: (x, y) => x.eq (y)
      }),
      id: permutation_t.identity (size),
      mul: (x, y) => x.mul (y),
      inv: (x) => x.inv (),
    })
  }
}
