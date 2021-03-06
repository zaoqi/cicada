let assert = require ("assert") .strict

let ut = require ("../lib/util")
let num = require ("../lib/num")

{
  /**
   * `reduced_row_echelon_form` reduces pivots to one
   *   while respecting `epsilon` for numerical stability
   */

  let A = num.matrix ([
    [1, 3, 1, 9],
    [1, 1, -1, 1],
    [3, 11, 5, 35],
  ])

  let B = num.matrix ([
    [1, 0, -2, -3],
    [0, 1, 1, 4],
    [0, 0, 0, 0],
  ])

  A.reduced_row_echelon_form () .print ()

  assert (
    A.reduced_row_echelon_form () .eq (B)
  )
}
