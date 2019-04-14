import test, { ExecutionContext } from "ava"

import * as nd from "../src/ndarray"
import * as eu from "../src/euclidean-space"
import { log } from "../src/util"

test ("new eu.matrix_t", t => {
  let x = eu.matrix ([
    [1, 2, 4],
    [4, 5, 6],
    [7, 8, 9],
  ])
  t.deepEqual (x.shape, [3, 3])
})

test ("new eu.vector_t", t => {
  let x = eu.vector ([1, 2, 4])
  t.deepEqual (x.dim, 3)
})

test ("eu.matrix_t row & col", t => {
  let x = eu.matrix ([
    [1, 2, 4],
    [4, 5, 6],
    [7, 8, 9],
  ])
  let r = eu.vector ([1, 2, 4])
  t.true (x.row (0) .eq (r))

  let c = eu.vector ([1, 4, 7])
  t.true (x.col (0) .eq (c))
})

test ("eu.matrix_t set_row & set_col", t => {
  let x = eu.matrix ([
    [1, 2, 4],
    [4, 5, 6],
    [7, 8, 9],
  ])
  let r = eu.vector ([0, 0, 0])
  x.set_row (0, r)
  t.true (x.row (0) .eq (r))

  let c = eu.vector ([0, 0, 0])
  x.set_col (0, r)
  t.true (x.col (0) .eq (c))
})

test ("eu.matrix_t mul", t => {
  {
    let x = eu.matrix ([
      [0, 1],
      [0, 0],
    ])

    let y = eu.matrix ([
      [0, 0],
      [1, 0],
    ])

    t.true (
      x.mul (y) .eq (eu.matrix ([
        [1, 0],
        [0, 0],
      ]))
    )

    t.true (
      y.mul (x) .eq (eu.matrix ([
        [0, 0],
        [0, 1],
      ]))
    )
  }
})

test ("eu.matrix_t transpose", t => {
  {
    let x = eu.matrix ([
      [1, 2],
      [3, 4],
      [5, 6],
    ])

    let y = eu.matrix ([
      [1, 3, 5],
      [2, 4, 6],
    ])

    t.true (
      x.transpose () .eq (y)
    )
  }
})

test ("eu.point_t trans", t => {
  let p = eu.point ([1, 1, 1])
  let v = eu.vector ([1, 2, 4])
  let q = eu.point ([2, 3, 5])

  t.true (p.trans (v) .eq (q))
  t.true (p.trans (v) .eq (v.act (p)))
})

test ("eu.vector_t dot", t => {
  let v = eu.vector ([1, 2, 4])
  let w = eu.vector ([1, 2, 4])

  t.true (v.dot (w) === 1 + 4 + 16)
})

test ("eu.vector_t trans", t => {
  {
    let v = eu.vector ([1, 2])

    let f = eu.matrix ([
      [0, 1],
      [0, 1],
    ])

    t.true (
      v.trans (f)
        .eq (eu.vector ([2, 2]))
    )

    t.true (
      v.trans (f) .eq (f.act (v))
    )
  }

  {
    let m = eu.matrix ([
      [ 2, -1],
      [-1,  2],
    ])
    let b = eu.vector ([0, 3])
    let v = eu.vector ([1, 2])

    t.true (
      v.trans (m) .eq (b)
    )

    t.true (
      v.trans (m) .eq (m.act (v))
    )
  }
})

test ("eu.matrix_t diag", t => {
  let m = eu.matrix ([
    [1, 3, 1],
    [1, 1, -1],
    [3, 11, 5],
  ])
  let v = eu.vector ([
    1,
    1,
    5,
  ])

  t.true (m.diag () .eq (v))
})

test ("reduced_row_echelon_form", t => {
  let m = eu.matrix ([
    [1, 3, 1, 9],
    [1, 1, -1, 1],
    [3, 11, 5, 35],
  ])
  m.row_echelon_form ()
  m.unit_row_echelon_form ()
  t.true (
    m.reduced_row_echelon_form () .eq (eu.matrix ([
      [1, 0, -2, -3],
      [0, 1, 1, 4],
      [0, 0, 0, 0],
    ]))
  )
})

function test_lower_upper_permutation (
  t: ExecutionContext,
  matrix: eu.matrix_t,
) {
  let [
    lower, upper, permutation
  ] = matrix.lower_upper_permutation_decomposition ()
  t.true (lower.lower_p ())
  t.true (upper.upper_p ())
  t.true (permutation.mul (matrix) .eq (lower.mul (upper)))
}

test ("lower_upper_permutation_decomposition", t => {
  test_lower_upper_permutation (t, eu.matrix ([
    [1, 3, 1],
    [1, 1, -1],
    [3, 11, 5],
  ]))

  test_lower_upper_permutation (t, eu.matrix ([
    [4, 3],
    [6, 3],
  ]))
})

test ("rank", t => {
  {
    let m = eu.matrix ([
      [1, 3, 1, 9],
      [1, 1, -1, 1],
      [3, 11, 5, 35],
    ])

    t.true (
      m.rank () === 2
    )
  }

  {
    let m = eu.matrix ([
      [1, 3, 1, 9],
      [0, 0, 0, 0],
      [0, 0, 0, 0.00000000001],
    ])

    t.true (
      m.rank () === 1
    )
  }
})

test ("inv", t => {
  {
    let m = eu.matrix ([
      [1, 3, 1],
      [1, 1, -1],
      [3, 11, 5],
    ])
    t.true (m.inv_maybe () === null)
  }

  {
    let m = eu.matrix ([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ])
    t.true (m.inv_maybe () === null)
  }

  {
    let m = eu.matrix ([
      [2, -1, 0],
      [-1, 2, -1],
      [0, -1, 2],
    ])

    t.true (
      m.mul (m.inv ()) .sub (
        eu.matrix_t.identity (3)
      ) .epsilon_p ()
    )
  }

  t.pass ()
})

test ("append_cols & append_cols", t => {
  let m = eu.matrix ([
    [1, 3, 1],
    [1, 1, -1],
    [3, 11, 5],
  ])

  let i = eu.matrix ([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ])

  let a = eu.matrix ([
    [1, 3, 1, 1, 0, 0],
    [1, 1, -1, 0, 1, 0],
    [3, 11, 5, 0, 0, 1],
  ])

  let b = eu.matrix ([
    [1, 3, 1],
    [1, 1, -1],
    [3, 11, 5],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ])

  t.true (
    m.append_cols (i) .eq (a)
  )

  t.true (
    m.append_rows (i) .eq (b)
  )
})

test ("eu.vector_t reduce", t => {
  let v = eu.vector ([1, 2, 3])

  t.true (
    v.reduce ((acc, cur) => acc * cur) === 6
  )

  t.true (
    v.reduce_with (10, (acc, cur) => acc * cur) === 60
  )
})

test ("eu.matrix_t.identity", t => {
  let v = eu.matrix_t.identity (3)

  t.true (
    v.eq (eu.matrix ([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]))
  )
})

test ("eu.matrix_t.symmetric_p", t => {
  t.true (eu.matrix ([
    [ 1, -3, 0],
    [-3, 1, 0],
    [ 0, 0, 1],
  ]) .symmetric_p ())

  t.true (! eu.matrix ([
    [ 1, 0, 0],
    [-3, 1, 0],
    [ 0, 0, 1],
  ]) .symmetric_p ())

  let m = eu.matrix ([
    [ 1, 0],
    [-3, 1],
    [ 0, 0],
  ])

  t.true (m.transpose () .mul (m) .symmetric_p ())
  t.true (m.mul (m.transpose ()) .symmetric_p ())
})
