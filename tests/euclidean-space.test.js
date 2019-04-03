import test from "ava"

import { ndarray_t } from "../dist/ndarray"
import { point_t, vector_t, matrix_t } from "../dist/euclidean-space"

test ("new matrix_t", t => {
  let x = new matrix_t (ndarray_t.from_2darray ([
    [1, 2, 4],
    [4, 5, 6],
    [7, 8, 9],
  ]))
  t.deepEqual (x.shape, [3, 3])
})

test ("new vector_t", t => {
  let x = new vector_t (ndarray_t.from_1darray ([1, 2, 4]))
  t.deepEqual (x.dim, 3)
})

test ("row & col", t => {
  let x = new matrix_t (ndarray_t.from_2darray ([
    [1, 2, 4],
    [4, 5, 6],
    [7, 8, 9],
  ]))
  let r = new vector_t (ndarray_t.from_1darray ([1, 2, 4]))
  t.true (x.row (0) .eq (r))

  let c = new vector_t (ndarray_t.from_1darray ([1, 4, 7]))
  t.true (x.col (0) .eq (c))
})

test ("trans", t => {
  let p = new point_t (ndarray_t.from_1darray ([1, 1, 1]))
  let v = new vector_t (ndarray_t.from_1darray ([1, 2, 4]))
  let w = new point_t (ndarray_t.from_1darray ([2, 3, 5]))

  t.true (p.trans (v) .eq (w))
})
