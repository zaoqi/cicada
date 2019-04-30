import * as _ from "lodash"
import assert from "assert"

import * as ut from "./util"
import * as num from "./number"
import { permutation_t } from "./permutation"

import { set_t } from "./abstract/set"
import { monoid_t, abelian_group_t } from "./abstract/group"
import { euclidean_ring_t } from "./abstract/ring"

export type Array1d <R> = Array <R>
export type Array2d <R> = Array <Array <R>>
export type Array3d <R> = Array <Array <Array <R>>>

export
function ring <R> (the: {
  elements: set_t <R>,
  zero: R,
  add: (x: R, y: R) => R,
  neg: (x: R) => R,
  one: R,
  mul: (x: R, y: R) => R,
  degree_lt: (x: R, y: R) => boolean,
  divmod: (x: R, y: R) => [R, R],
}): euclidean_ring_t <R> {
  return new euclidean_ring_t ({
    addition: new abelian_group_t ({
      elements: the.elements,
      id: the.zero,
      add: the.add,
      neg: the.neg,
    }),
    multiplication: new monoid_t ({
      elements: the.elements,
      id: the.one,
      mul: the.mul,
    }),
    degree_lt: the.degree_lt,
    divmod: the.divmod,
  })
}

export
class matrix_t <R> {
  readonly ring: euclidean_ring_t <R>
  readonly buffer: Array <R>
  readonly shape: [number, number]
  readonly strides: [number, number]
  readonly offset: number
  readonly size: number

  constructor (the: {
    ring: euclidean_ring_t <R>,
    buffer: Array <R>,
    shape: [number, number],
    strides: [number, number],
    offset?: number,
  }) {
    this.ring = the.ring
    this.buffer = the.buffer
    this.shape = the.shape
    this.strides = the.strides
    this.offset = the.offset === undefined ? 0 : the.offset
    this.size = matrix_t.shape_to_size (the.shape)
  }

  static shape_to_size ([x, y]: [number, number]): number {
    return x * y
  }

  static shape_to_strides (
    [x, y]: [number, number]
  ): [number, number] {
    return [y, 1]
  }

  static from_buffer <R> (
    ring: euclidean_ring_t <R>,
    buffer: Array <R>,
    shape: [number, number],
  ): matrix_t <R> {
    let strides = matrix_t.shape_to_strides (shape)
    return new matrix_t ({ ring, buffer, shape, strides })
  }

  static fromArray2d <R> (
    ring: euclidean_ring_t <R>,
    array: Array2d <R>,
  ): matrix_t <R> {
    let y_length = array.length
    let x_length = array[0].length
    for (let a of array) {
      if (a.length !== x_length) {
        throw new Error ("inner array length mismatch")
      }
    }
    return matrix_t.from_buffer (
      ring,
      Array.from (array.flat ()),
      [y_length, x_length],
    )
  }

  static from_row <R> (
    ring: euclidean_ring_t <R>,
    row: vector_t <R>,
  ): matrix_t <R> {
    let [s] = row.strides
    return new matrix_t ({
      ring,
      buffer: row.buffer,
      shape: [1, row.size],
      strides: [0, s],
      offset: row.offset,
    })
  }

  static from_col <R> (
    ring: euclidean_ring_t <R>,
    col: vector_t <R>,
  ): matrix_t <R> {
    let [t] = col.strides
    return new matrix_t ({
      ring,
      buffer: col.buffer,
      shape: [col.size, 1],
      strides: [t, 0],
      offset: col.offset,
    })
  }

  get_linear_index (x: number, y: number): number {
    return (this.offset +
            x * this.strides [0] +
            y * this.strides [1])
  }

  get (x: number, y: number): R {
    return this.buffer [this.get_linear_index (x, y)]
  }

  set (x: number, y: number, v: R): matrix_t <R> {
    this.buffer [this.get_linear_index (x, y)] = v
    return this
  }

  update_at (
    i: number,
    j: number,
    f: (v: R) => R,
  ): matrix_t <R> {
    this.set (i, j, f (this.get (i, j)))
    return this
  }

  static *indexes_of_shape ([m, n]: [number, number]) {
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        yield [i, j] as [number, number]
      }
    }
  }

  *indexes () {
    for (let [i, j] of matrix_t.indexes_of_shape (this.shape)) {
      yield [i, j] as [number, number]
    }
  }

  *entries () {
    for (let [i, j] of this.indexes ()) {
      let v = this.get (i, j)
      yield [i, j, v] as [number, number, R]
    }
  }

  *values () {
    for (let [i, j] of this.indexes ()) {
      let v = this.get (i, j)
      yield v as R
    }
  }

  update_op1 (
    op: (x: R) => R,
  ): matrix_t <R> {
    let [m, n] = this.shape
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let v = op (this.get (i, j))
        this.set (i, j, v)
      }
    }
    return this
  }

  same_shape_p (that: matrix_t <R>): boolean {
    return ((this.shape [0] === that.shape [0]) &&
            (this.shape [1] === that.shape [1]))
  }

  update_op2 (
    that: matrix_t <R>,
    op: (x: R, y: R) => R,
  ): matrix_t <R> {
    assert (this.same_shape_p (that))
    let [m, n] = this.shape
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        let v = op (this.get (i, j), that.get (i, j))
        this.set (i, j, v)
      }
    }
    return this
  }

  slice (
    x: [number, number] | null,
    y: [number, number] | null,
  ): matrix_t <R> {
    let [m, n] = this.shape
    let offset = this.offset
    if (x !== null) {
      let [start, end] = x
      m = end - start
      offset += start * this.strides [0]
    }
    if (y !== null) {
      let [start, end] = y
      n = end - start
      offset += start * this.strides [1]
    }
    return new matrix_t ({
      ring: this.ring,
      buffer: this.buffer,
      shape: [m, n],
      strides: this.strides,
      offset,
    })
  }

  copy (): matrix_t <R> {
    let matrix = matrix_t.from_buffer (
      this.ring,
      new Array (this.size),
      this.shape,
    )
    for (let [i, j, x] of this.entries ()) {
      matrix.set (i, j, x)
    }
    return matrix
  }

  update_copy (that: matrix_t <R>): matrix_t <R> {
    let [m, n] = this.shape
    for (let i of ut.range (0, m)) {
      for (let j of ut.range (0, n)) {
        this.set (i, j, that.get (i, j))
      }
    }
    return this
  }

  row (i: number): vector_t <R> {
    let [m, n] = this.shape
    let [s, t] = this.strides
    let offset = this.offset + i * s
    return new vector_t ({
      ring: this.ring,
      buffer: this.buffer,
      shape: [n],
      strides: [t],
      offset,
    })
  }

  set_row (i: number, src: vector_t <R>): matrix_t <R> {
    let [m, n] = this.shape
    for (let j of ut.range (0, n)) {
      this.set (i, j, src.get (j))
    }
    return this
  }

  *row_entries () {
    let [m, _n] = this.shape
    for (let i = 0; i < m; i++) {
      yield [i, this.row (i)] as [number, vector_t <R>]
    }
  }

  *rows () {
    let [m, _n] = this.shape
    for (let i = 0; i < m; i++) {
      yield this.row (i) as vector_t <R>
    }
  }

  for_each_row_index (
    f: (row: vector_t <R>, i: number) => any
  ): matrix_t <R> {
    for (let [i, row] of this.row_entries ()) {
      f (row, i)
    }
    return this
  }

  for_each_row (
    f: (row: vector_t <R>) => any
  ): matrix_t <R> {
    for (let row of this.rows ()) {
      f (row)
    }
    return this
  }

  col (j: number): vector_t <R> {
    let [m, n] = this.shape
    let [s, t] = this.strides
    let offset = this.offset + j * t
    return new vector_t ({
      ring: this.ring,
      buffer: this.buffer,
      shape: [m],
      strides: [s],
      offset,
    })
  }

  set_col (j: number, src: vector_t <R>): matrix_t <R> {
    let [m, n] = this.shape
    for (let i of ut.range (0, m)) {
      this.set (i, j, src.get (i))
    }
    return this
  }

  *col_entries () {
    let [_m, n] = this.shape
    for (let i = 0; i < n; i++) {
      yield [i, this.col (i)] as [number, vector_t <R>]
    }
  }

  *cols () {
    let [_m, n] = this.shape
    for (let i = 0; i < n; i++) {
      yield this.col (i) as vector_t <R>
    }
  }

  for_each_col_index (
    f: (col: vector_t <R>, i: number) => any
  ): matrix_t <R> {
    for (let [i, col] of this.col_entries ()) {
      f (col, i)
    }
    return this
  }

  for_each_col (
    f: (col: vector_t <R>) => any
  ): matrix_t <R> {
    for (let col of this.cols ()) {
      f (col)
    }
    return this
  }

  reduce_with (
    init: R,
    f: (acc: R, cur: R) => R,
  ): R {
    let acc = init
    for (let v of this.values ()) {
      acc = f (acc, v)
    }
    return acc
  }

  every (p: (v: R) => boolean): boolean {
    for (let v of this.values ()) {
      if (! p (v)) {
        return false
      }
    }
    return true
  }

  some (p: (v: R) => boolean): boolean {
    for (let v of this.values ()) {
      if (p (v)) {
        return true
      }
    }
    return false
  }

  *zip (that: matrix_t <R>) {
    let this_iter = this.values ()
    let that_iter = that.values ()
    while (true) {
      let this_next = this_iter.next ()
      let that_next = that_iter.next ()
      if (this_next.done || that_next.done) {
        return
      } else {
        yield [this_next.value, that_next.value]
      }
    }
  }

  eq (that: matrix_t <R>): boolean {
    if (this.size !== that.size) { return false }
    if (! _.isEqual (this.shape, that.shape)) { return false }
    for (let [x, y] of this.zip (that)) {
      if (! this.ring.eq (x, y)) {
        return false
      }
    }
    return true
  }

  toArray2d (): Array2d <R> {
    let array = []
    let [x, _] = this.shape
    for (let i = 0; i < x; i++) {
      array.push (this.row (i) .toArray ())
    }
    return array
  }

  print () {
    console.log ("matrix:")
    console.table (this.toArray2d ())
  }

  update_add (that: matrix_t <R>): matrix_t <R> {
    return this.update_op2 (that, this.ring.add)
  }

  add (that: matrix_t <R>): matrix_t <R> {
    return this.copy () .update_add (that)
  }

  update_sub (that: matrix_t <R>): matrix_t <R> {
    return this.update_op2 (that, this.ring.sub)
  }

  sub (that: matrix_t <R>): matrix_t <R> {
    return this.copy () .update_sub (that)
  }

  map (f: (v: R) => R): matrix_t <R> {
    let matrix = this.copy ()
    for (let [i, j, v] of this.entries ()) {
      matrix.update_at (i, j, f)
    }
    return matrix
  }

  update_scale (a: R): matrix_t <R> {
    return this.update_op1 (x => this.ring.mul (x, a))
  }

  scale (a: R): matrix_t <R> {
    return this.map (n => this.ring.mul (n, a))
  }

  mul (that: matrix_t <R>): matrix_t <R> {
    let [m, n] = this.shape
    let [p, q] = that.shape
    assert (n === p)
    let shape: [number, number] = [m, q]
    let size = matrix_t.shape_to_size (shape)
    let buffer = new Array (size)
    let matrix = matrix_t.from_buffer (this.ring, buffer, shape)
    for (let i of ut.range (0, m)) {
      for (let j of ut.range (0, q)) {
        let v = this.row (i) .dot (that.col (j))
        matrix.set (i, j, v)
      }
    }
    return matrix
  }

  act (v: vector_t <R>): vector_t <R> {
    return v.trans (this)
  }

  transpose (): matrix_t <R> {
    let [m, n] = this.shape
    let [s, t] = this.strides
    return new matrix_t ({
      ring: this.ring,
      buffer: this.buffer,
      shape: [n, m],
      strides: [t, s],
      offset: this.offset,
    })
  }

  square_p (): boolean {
    let [x, y] = this.shape
    return x === y
  }

  update_swap_rows (i: number, j: number): matrix_t <R> {
    let [m, n] = this.shape
    for (let k of ut.range (0, n)) {
      let x = this.get (i, k)
      let y = this.get (j, k)
      this.set (i, k, y)
      this.set (j, k, x)
    }
    return this
  }

  update_swap_cols (i: number, j: number): matrix_t <R> {
    let [m, n] = this.shape
    for (let k of ut.range (0, m)) {
      let x = this.get (k, i)
      let y = this.get (k, j)
      this.set (k, i, y)
      this.set (k, j, x)
    }
    return this
  }

  append_cols (that: matrix_t <R>): matrix_t <R> {
    let [m, n] = this.shape
    let [p, q] = that.shape
    assert (m === p)
    let shape: [number, number] = [m, n + q]
    let size = matrix_t.shape_to_size (shape)
    let buffer = new Array (size)
    let matrix = matrix_t.from_buffer (this.ring, buffer, shape)
    for (let i of ut.range (0, m)) {
      let row = this.row (i) .append (that.row (i))
      matrix.set_row (i, row)
    }
    return matrix
  }

  append_rows (that: matrix_t <R>): matrix_t <R> {
    let [m, n] = this.shape
    let [p, q] = that.shape
    assert (n === q)
    let shape: [number, number] = [m + p, n]
    let size = matrix_t.shape_to_size (shape)
    let buffer = new Array (size)
    let matrix = matrix_t.from_buffer (this.ring, buffer, shape)
    for (let i of ut.range (0, n)) {
      let col = this.col (i) .append (that.col (i))
      matrix.set_col (i, col)
    }
    return matrix
  }

  /**
   * The main diag.
   */
  diag (): vector_t <R> {
    let [m, n] = this.shape
    n = Math.min (m, n)
    let vector = vector_t.zeros (this.ring, n)
    for (let i of ut.range (0, n)) {
      vector.set (i, this.get (i, i))
    }
    return vector
  }

  static numbers <R> (
    ring: euclidean_ring_t <R>,
    n: R,
    x: number,
    y: number,
  ): matrix_t <R> {
    let shape: [number, number] = [x, y]
    let size = matrix_t.shape_to_size (shape)
    let buffer = new Array (size)
    buffer.fill (n)
    return matrix_t.from_buffer (ring, buffer, shape)
  }

  static zeros <R> (
    ring: euclidean_ring_t <R>,
    x: number,
    y: number,
  ): matrix_t <R> {
    return matrix_t.numbers (ring, ring.zero, x, y)
  }

  static ones <R> (
    ring: euclidean_ring_t <R>,
    x: number,
    y: number,
  ): matrix_t <R> {
    return matrix_t.numbers (ring, ring.one, x, y)
  }

  static id <R> (
    ring: euclidean_ring_t <R>,
    n: number,
  ): matrix_t <R> {
    let matrix = matrix_t.zeros (ring, n, n)
    for (let i of ut.range (0, n)) {
      matrix.set (i, i, ring.one)
    }
    return matrix
  }

  static row_trans <R> (
    ring: euclidean_ring_t <R>,
    permutation: permutation_t,
  ): matrix_t <R> {
    let n = permutation.size
    let matrix = matrix_t.zeros (ring, n, n)
    for (let [i, v] of permutation.pairs ()) {
      matrix.set (i, v, ring.one)
    }
    return matrix
  }

  static col_trans <R> (
    ring: euclidean_ring_t <R>,
    permutation: permutation_t,
  ): matrix_t <R> {
    let n = permutation.size
    let matrix = matrix_t.zeros (ring, n, n)
    for (let [i, v] of permutation.pairs ()) {
      matrix.set (v, i, ring.one)
    }
    return matrix
  }

  tuck_row (i: number, j: number): matrix_t <R> {
    let [m, n] = this.shape
    let row_trans = matrix_t.row_trans (
      this.ring,
      permutation_t.id (m) .tuck (i, j),
    )
    return row_trans.mul (this)
  }

  tuck_col (i: number, j: number): matrix_t <R> {
    let [m, n] = this.shape
    let col_trans = matrix_t.col_trans (
      this.ring,
      permutation_t.id (n) .tuck (i, j),
    )
    return this.mul (col_trans)
  }

  update_tuck_row (i: number, j: number): matrix_t <R> {
    this.update_copy (this.tuck_row (i, j))
    return this
  }

  update_tuck_col (i: number, j: number): matrix_t <R> {
    this.update_copy (this.tuck_col (i, j))
    return this
  }

  // TODO

}

export
class vector_t <R> {
  readonly ring: euclidean_ring_t <R>
  readonly buffer: Array <R>
  readonly shape: [number]
  readonly strides: [number]
  readonly offset: number
  readonly size: number

  constructor (the: {
    ring: euclidean_ring_t <R>,
    buffer: Array <R>,
    shape: [number],
    strides: [number],
    offset?: number,
  }) {
    this.ring = the.ring
    this.buffer = the.buffer
    this.shape = the.shape
    this.strides = the.strides
    this.offset = the.offset === undefined ? 0 : the.offset
    this.size = the.shape [0]
  }

  static from_buffer <R> (
    ring: euclidean_ring_t <R>,
    buffer: Array <R>,
  ): vector_t <R> {
    return new vector_t ({
      ring,
      buffer,
      shape: [buffer.length],
      strides: [1],
    })
  }

  static fromArray <R> (
    ring: euclidean_ring_t <R>,
    array: Array1d <R>,
  ): vector_t <R> {
    return vector_t.from_buffer (ring, array)
  }

  get_linear_index (x: number): number {
    return (this.offset +
            x * this.strides [0])
  }

  get (i: number): R {
    return this.buffer [this.get_linear_index (i)]
  }

  set (i: number, v: R): vector_t <R> {
    this.buffer [this.get_linear_index (i)] = v
    return this
  }

  toArray (): Array <R> {
    let array = []
    for (let i of ut.range (0, this.size)) {
      array.push (this.get (i))
    }
    return array
  }

  print () {
    console.log ("vector:")
    console.table (this.toArray ())
  }

  *indexes () {
    for (let i of ut.range (0, this.size)) {
      yield i as number
    }
  }

  update_at (i: number, f: (v: R) => R): vector_t <R> {
    return this.set (i, f (this.get (i)))
  }

  update (f: (v: R) => R): vector_t <R> {
    for (let i of this.indexes ()) {
      this.set (i, f (this.get (i)))
    }
    return this
  }

  *values () {
    for (let i of ut.range (0, this.size)) {
      let v = this.buffer [this.get_linear_index (i)]
      yield v as R
    }
  }

  *entries () {
    for (let i of ut.range (0, this.size)) {
      let v = this.buffer [this.get_linear_index (i)]
      yield [i, v] as [number, R]
    }
  }

  copy (): vector_t <R> {
    let buffer = new Array (this.size)
    let vector = vector_t.from_buffer (this.ring, buffer)
    for (let [i, x] of this.entries ()) {
      vector.set (i, x)
    }
    return vector
  }

  *zip (that: vector_t <R>) {
    let this_iter = this.values ()
    let that_iter = that.values ()
    while (true) {
      let this_next = this_iter.next ()
      let that_next = that_iter.next ()
      if (this_next.done || that_next.done) {
        return
      } else {
        yield [this_next.value, that_next.value]
      }
    }
  }

  eq (that: vector_t <R>): boolean {
    if (this.size !== that.size) { return false }
    for (let [x, y] of this.zip (that)) {
      if (x !== y) {
        return false
      }
    }
    return true
  }

  dot (that: vector_t <R>): R {
    assert (this.size === that.size)
    let product = this.ring.zero
    for (let [i, y] of that.entries ()) {
      product = this.ring.add (
        product,
        this.ring.mul (this.get (i), y))
    }
    return product
  }

  map (f: (v: R) => R): vector_t <R> {
    let vector = this.copy ()
    for (let [i, v] of this.entries ()) {
      vector.update_at (i, f)
    }
    return vector
  }

  scale (a: R): vector_t <R> {
    return this.map (n => this.ring.mul (n, a))
  }

  update_scale (a: R): vector_t <R> {
    return this.update (n => this.ring.mul (n, a))
  }

  static numbers <R> (
    ring: euclidean_ring_t <R>,
    n: R,
    size: number,
  ): vector_t <R> {
    let buffer = new Array (size) .fill (n)
    return vector_t.from_buffer (ring, buffer)
  }

  static zeros <R> (
    ring: euclidean_ring_t <R>,
    size: number,
  ): vector_t <R> {
    return vector_t.numbers (ring, ring.zero, size)
  }

  static ones <R> (
    ring: euclidean_ring_t <R>,
    size: number,
  ): vector_t <R> {
    return vector_t.numbers (ring, ring.one, size)
  }

  trans (matrix: matrix_t <R>): vector_t <R> {
    let [m, n] = matrix.shape
    assert (n === this.size)
    let vector = vector_t.zeros (this.ring, m)
    for (let i of ut.range (0, m)) {
      vector.set (i, this.dot (matrix.row (i)))
    }
    return vector
  }

  append (that: vector_t <R>): vector_t <R> {
    let buffer = new Array (this.size + that.size)
    let vector = vector_t.from_buffer (this.ring, buffer)
    for (let [i, x] of this.entries ()) {
      vector.set (i, x)
    }
    for (let [i, x] of that.entries ()) {
      vector.set (i + this.size, x)
    }
    return vector
  }

  some (p: (v: R) => boolean): boolean {
    for (let v of this.values ()) {
      if (p (v)) {
        return true
      }
    }
    return false
  }

  every (p: (v: R) => boolean): boolean {
    for (let v of this.values ()) {
      if (! p (v)) {
        return false
      }
    }
    return true
  }

  update_add (that: vector_t <R>): vector_t <R> {
    assert (this.size === that.size)
    for (let [i, x] of that.entries ()) {
      this.update_at (i, v => this.ring.add (v, x))
    }
    return this
  }

  add (that: vector_t <R>): vector_t <R> {
    assert (this.size === that.size)
    let vector = this.copy ()
    for (let [i, x] of that.entries ()) {
      vector.update_at (i, v => this.ring.add (v, x))
    }
    return vector
  }

  update_sub (that: vector_t <R>): vector_t <R> {
    assert (this.size === that.size)
    for (let [i, x] of that.entries ()) {
      this.update_at (i, v => this.ring.sub (v, x))
    }
    return this
  }

  sub (that: vector_t <R>): vector_t <R> {
    assert (this.size === that.size)
    let vector = this.copy ()
    for (let [i, x] of that.entries ()) {
      vector.update_at (i, v => this.ring.sub (v, x))
    }
    return vector
  }

  reduce_with (
    init: R,
    f: (acc: R, cur: R) => R,
  ): R {
    let acc = init
    for (let v of this.values ()) {
      acc = f (acc, v)
    }
    return acc
  }

  reduce (
    f: (acc: R, cur: R) => R,
  ): R {
    assert (this.size > 0)
    if (this.size === 1) {
      return this.get (0)
    } else {
      let acc = this.get (0)
      for (let i of ut.range (1, this.size)) {
        acc = f (acc, this.get (i))
      }
      return acc
    }
  }

  // TODO

}
