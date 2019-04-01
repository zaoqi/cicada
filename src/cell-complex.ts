import { dic_t } from "./dic"

/**
 * In the context of a [[cell_complex_t]],
 * The dimension and a serial number can identify a cell.
 */
export
class id_t {
  constructor (
    readonly dim: number,
    readonly ser: number,
  ) {}

  eq (that: id_t): boolean {
    return ((this.dim === that.dim) &&
            (this.ser === that.ser))
  }

  to_str (): string {
    return `${this.dim}:${this.ser}`
  }

  static valid_id_str (str: string): boolean {
    let words = str.split (":")
    if (words.length !== 2) { return false }
    let dim = Number.parseInt (words [0])
    let ser = Number.parseInt (words [1])
    if (Number.isNaN (dim)) { return false }
    if (Number.isNaN (ser)) { return false }
    return true
  }

  static parse (str: string): id_t {
    let words = str.split (":")
    let dim = Number.parseInt (words [0])
    let ser = Number.parseInt (words [1])
    return new id_t (dim, ser)
  }

  rev (): rev_id_t {
    return new rev_id_t (this.dim, this.ser)
  }
}

export
function id_to_str (id: id_t): string {
  return id.to_str ()
}

/**
 * I use this builder to enclose
 * some of the functions related to the dic of cell.
 * It also make the process of building explicit in code.
 */
export
class cell_builder_t {
  constructor (
    public dom: cell_complex_t,
    public cod: cell_complex_t,
    public dic: dic_t <id_t, im_t> = new dic_t (id_to_str),
  ) {}

  build (): cell_t {
    return new cell_t (this)
  }
}

export
class im_t {
  constructor (
    public id: id_t,
    public cell: cell_t,
  ) {}

  to_exp (): im_exp_t {
    return {
      id: this.id.to_str (),
      cell: this.cell.to_exp (),
    }
  }
}

function im_dic_check_dim (
  dom: cell_complex_t,
  cod: cell_complex_t,
  dic: dic_t <id_t, im_t>,
  dim: number,
) {
  for (let [id, im] of dic) {
    if (id.dim === dim) {
      for (let [id1, im1] of im.cell.dic) {
        let x = dom.get (id) .dic.get (id1) .id
        let y = cod.get (im.id) .dic.get (im1.id) .id
        if (! dic.get (x) .id.eq (y)) {
          throw new Error ("check fail")
        }
      }
    }
  }
}

// complete dic for every dimensions
// infer from high dim to low dim
function im_dic_check (
  dom: cell_complex_t,
  cod: cell_complex_t,
  dic: dic_t <id_t, im_t>,
) {
  if (dom.cell_dic.size !== dic.size) {
    throw new Error ("dic not complete")
  }
  let dim = dom.dim
  while (dim > 0) {
    im_dic_check_dim (dom, cod, dic, dim)
    dim -= 1
  }
}

export
class cell_t {
  readonly dom: spherical_complex_t
  readonly cod: cell_complex_t
  readonly dic: dic_t <id_t, im_t>

  constructor (
    bui: cell_builder_t
  ) {
    this.dom = bui.dom.as_spherical ()
    this.cod = bui.cod
    this.dic = bui.dic.clone ()
    im_dic_check (this.dom, this.cod, this.dic)
  }

  get dim (): number {
    return this.dom.dim + 1
  }

  to_exp (): cell_exp_t {
    return {
      dom: this.dom.to_exp (),
      cod: this.cod.to_exp (),
      dic: im_dic_to_exp (this.dic),
    }
  }

  static from_exp (exp: cell_exp_t): cell_t {
    let dom = cell_complex_t.from_exp (exp.dom)
    let cod = cell_complex_t.from_exp (exp.cod)
    let cell = new cell_builder_t (dom, cod)
    let iter = Object.entries (exp.dic)
    for (let [k, v] of iter) {
      let id = id_t.parse (k)
      let im = new im_t (
        id_t.parse (v.id),
        cell_t.from_exp (v.cell))
      cell.dic.set (id, im)
    }
    return new cell_t (cell)
  }
}

function im_dic_to_exp (
  dic: dic_t <id_t, im_t>
): {
  [id: string]: im_exp_t
} {
  let exp: {
    [id: string]: im_exp_t
  } = {}
  for (let [id, im] of dic) {
    exp [id.to_str ()] = im.to_exp ()
  }
  return exp
}

interface cell_complex_exp_t {
  [id: string] : cell_exp_t
}

interface im_exp_t {
  id: string,
  cell: cell_exp_t,
}

interface cell_exp_t {
  dom: cell_complex_exp_t,
  cod: cell_complex_exp_t,
  dic: {
    [id: string]: im_exp_t
  }
}

export
class cell_complex_t {
  readonly cell_dic: dic_t <id_t, cell_t>

  constructor (
    builder: cell_complex_builder_t =
      new cell_complex_builder_t ()
  ) {
    this.cell_dic = builder.cell_dic.clone ()
  }

  get dim (): number {
    let array = this.cell_dic.key_array () .map (id => id.dim)
    return Math.max (0, ...array)
  }

  dim_of (id: id_t): number {
    return this.get (id) .dim
  }

  skeleton (dim: number): cell_complex_t {
    let com = new cell_complex_t ()
    for (let [id, cell] of this.cell_dic.to_array ()) {
      if (id.dim <= dim) {
        com.cell_dic.set (id, cell)
      }
    }
    return com
  }

  *in_dim (dim: number) {
    for (let [id, cell] of this.cell_dic) {
      if (id.dim === dim) {
        yield [id, cell] as [id_t, cell_t]
      }
    }
  }

  *points () {
    for (let [id, _cell] of this.in_dim (0)) {
      yield id
    }
  }

  has (id: id_t): boolean {
    return this.cell_dic.has (id)
  }

  get (id: id_t): cell_t {
    return this.cell_dic.get (id)
  }

  as_spherical (): spherical_complex_t {
    return new spherical_complex_t (this)
  }

  get_edge (id: id_t): edge_t {
    if (id.dim !== 1) {
      throw new Error ("dimension mismatch")
    } else {
      return this.get (id) as edge_t
    }
  }

  get_face (id: id_t): face_t {
    if (id.dim !== 2) {
      throw new Error ("dimension mismatch")
    } else {
      return this.get (id) as face_t
    }
  }

  as_builder (): cell_complex_builder_t {
    let bui = new cell_complex_builder_t ()
    bui.cell_dic = this.cell_dic.clone ()
    return bui
  }

  clone (): cell_complex_t {
    return new cell_complex_t (this.as_builder ())
  }

  to_exp (): cell_complex_exp_t {
    let exp: cell_complex_exp_t = {}
    for (let [id, cell] of this.cell_dic) {
      exp [id.to_str ()] = cell.to_exp ()
    }
    return exp
  }

  static from_exp (exp: cell_complex_exp_t): cell_complex_t {
    let bui = new cell_complex_builder_t ()
    let iter = Object.entries (exp)
      .filter (([k, _]) => id_t.valid_id_str (k))
    for (let [k, v] of iter) {
      let id = id_t.parse (k)
      let cell = cell_t.from_exp (v)
      bui.set (id, cell)
    }
    return bui.build ()
  }
}

export
class cell_complex_builder_t {
  cell_dic: dic_t <id_t, cell_t>

  constructor () {
    this.cell_dic = new dic_t (id_to_str)
  }

  get dim (): number {
    let array = this.cell_dic.key_array () .map (id => id.dim)
    return Math.max (0, ...array)
  }

  set (id: id_t, cell: cell_t) {
    this.cell_dic.set (id, cell)
  }

  has (id: id_t): boolean {
    return this.cell_dic.has (id)
  }

  get (id: id_t): cell_t {
    return this.cell_dic.get (id)
  }

  gen_id (dim: number): id_t {
    let ser = 0
    for (let id of this.cell_dic.key_array ()) {
      if (id.dim === dim) {
        ser = Math.max (ser, id.ser) + 1
      }
    }
    return new id_t (dim, ser)
  }

  inc_one_point (): id_t {
    let id = this.gen_id (0)
    // this.set (id, new empty_cell_t ())
    this.set (id, empty_cell)
    return id
  }

  inc_points (n: number): Array <id_t> {
    let array = new Array <id_t> ()
    for (let i = 0; i < n; i += 1) {
      array.push (this.inc_one_point ())
    }
    return array
  }

  attach (cell: cell_t): id_t {
    let id = this.gen_id (cell.dim)
    this.cell_dic.set (id, cell)
    return id
  }

  attach_edge (start: id_t, end: id_t): id_t {
    return this.attach (new edge_t (this, start, end))
  }

  attach_face (circuit: circuit_t): id_t {
    return this.attach (new face_t (this, circuit))
  }

  get_edge (id: id_t): edge_t {
    if (id.dim !== 1) {
      throw new Error ("dimension mismatch")
    } else {
      return this.get (id) as edge_t
    }
  }

  get_face (id: id_t): face_t {
    if (id.dim !== 2) {
      throw new Error ("dimension mismatch")
    } else {
      return this.get (id) as face_t
    }
  }

  build (): cell_complex_t {
    return new cell_complex_t (this)
  }

  skeleton (dim: number): cell_complex_t {
    return this.build () .skeleton (dim)
  }
}

export
class bounfold_evidence_t {
  constructor () {}
}

function bounfold_check (
  cell_complex: cell_complex_t
): bounfold_evidence_t {
  let evidence = new bounfold_evidence_t ()
  // TODO
  return evidence
}

/**
 * [[bounfold_t]] -- manifold with boundary
 */
export
class bounfold_t extends cell_complex_t {
  readonly bounfold_evidence
  : bounfold_evidence_t

  constructor (com: cell_complex_t) {
    super (com.as_builder ())
    this.bounfold_evidence = bounfold_check (this)
  }
}

/**
 * `vertex_figure` commute with sub_complex relation.
 * (respecting the vertex)
 */
export
class vertex_figure_t extends cell_complex_t {
  readonly com: cell_complex_t
  readonly vertex: id_t
  readonly idx_dic: dic_t <[id_t, id_t], id_t>

  constructor (
    com: cell_complex_t,
    vertex: id_t,
  ) {
    let index_to_str = ([c, p]: [id_t, id_t]): string => {
      return c.to_str () + ", " + p.to_str ()
    }
    let idx_dic = new dic_t <[id_t, id_t], id_t> (index_to_str)
    let bui = new cell_complex_builder_t ()

    for (let [id, cell] of com.in_dim (1)) {
      for (let p of cell.dom.points ()) {
        if (cell.dic.get (p) .id.eq (vertex)) {
          idx_dic.set ([id, p], bui.inc_one_point ())
        }
      }
    }

    for (let [id, cell] of com.in_dim (2)) {
      for (let p of cell.dom.points ()) {
        if (cell.dic.get (p) .id.eq (vertex)) {
          let verf = new vertex_figure_t (cell.dom, p)
          let [[e1, p1], [e2, p2]] = verf.idx_dic.key_array ()
          let im1 = cell.dic.get (e1)
          let im2 = cell.dic.get (e2)
          let start = idx_dic.get ([
            im1.id,
            im1.cell.dic.get (p1) .id,
          ])
          let end = idx_dic.get ([
            im2.id,
            im2.cell.dic.get (p2) .id,
          ])
          idx_dic.set ([id, p], bui.attach_edge (start, end))
        }
      }
    }

    for (let [id, cell] of com.in_dim (3)) {
      for (let p of cell.dom.points ()) {
        if (cell.dic.get (p) .id.eq (vertex)) {
          // TODO
        }
      }
    }

    super (bui)
    this.com = com
    this.vertex = vertex
    this.idx_dic = idx_dic
  }

  /**
   * use `cell` in `this.com`, and `point` in `cell.dom`,
   * to index a point or cell in vertex_figure
   */
  idx (c: id_t, p: id_t): id_t {
    return this.idx_dic.get ([c, p])
  }
}

export
class spherical_complex_evidence_t {
  constructor () {}
}

function spherical_complex_check (
  cell_complex: cell_complex_t
): spherical_complex_evidence_t {
  let evidence = new spherical_complex_evidence_t ()
  // TODO
  return evidence
}

export
class spherical_complex_t extends cell_complex_t {
  readonly spherical_complex_evidence
  : spherical_complex_evidence_t

  constructor (com: cell_complex_t) {
    super (com.as_builder ())
    this.spherical_complex_evidence =
      spherical_complex_check (this)
  }
}

//// empty

export
class empty_complex_t extends cell_complex_t {
  constructor () {
    super ()
  }
}

const empty_complex = new empty_complex_t ()

export
class empty_cell_t extends cell_t {
  constructor () {
    let cell = new cell_builder_t (empty_complex, empty_complex)
    super (cell)
  }
}

const empty_cell = new empty_cell_t ()

//// 0 dimension

export
class discrete_complex_t extends cell_complex_t {
  readonly size: number

  constructor (size: number) {
    let bui = new cell_complex_builder_t ()
    bui.inc_points (size)
    super (bui)
    this.size = size
  }

  idx (i: number): id_t {
    return new id_t (0, i)
  }
}

export
class singleton_t extends discrete_complex_t {
  readonly point: id_t

  constructor () {
    super (1)
    this.point = this.idx (0)
  }
}

export
class endpoints_t extends discrete_complex_t {
  readonly start: id_t
  readonly end: id_t

  constructor () {
    super (2)
    this.start = this.idx (0)
    this.end = this.idx (1)
  }
}

//// 1 dimension

/**
 * Although cell-complex is recursively defined,
 * but each dimension has its own special features.
 * For example, the only possible 1-cell is [[edge_t]].
 */
export
class edge_t extends cell_t {
  start: id_t
  end: id_t
  endpoints: endpoints_t

  constructor (
    bui: cell_complex_builder_t,
    start: id_t,
    end: id_t,
  ) {
    let endpoints = new endpoints_t ()
    let cod = bui.skeleton (0)
    let cell = new cell_builder_t (endpoints, cod)
    cell.dic.set (endpoints.start, new im_t (start, empty_cell))
    cell.dic.set (endpoints.end, new im_t (end, empty_cell))
    super (cell)
    this.start = start
    this.end = end
    this.endpoints = endpoints
  }
}

export
class interval_t extends cell_complex_t {
  readonly start: id_t
  readonly end: id_t
  readonly inter: id_t

  constructor () {
    let com = new endpoints_t ()
    let bui = com.as_builder ()
    let inter = bui.attach_edge (com.start, com.end)
    super (bui)
    this.start = com.start
    this.end = com.end
    this.inter = inter
  }
}

export
class polygon_t extends cell_complex_t {
  readonly size: number
  readonly point_array: Array <id_t>
  readonly edge_array: Array <id_t>

  constructor (size: number) {
    let bui = new cell_complex_builder_t ()
    let edge_array = []
    let point_array = bui.inc_points (size)
    let i = 0
    while (i < size - 1) {
      edge_array.push (
        bui.attach_edge (
          point_array [i],
          point_array [i + 1]))
      i += 1
    }
    edge_array.push (
      bui.attach_edge (
        point_array [size - 1],
        point_array [0]))
    super (bui)
    this.size = size
    this.point_array = point_array
    this.edge_array = edge_array
  }
}

//// 2 dimension

export
class rev_id_t extends id_t {
  constructor (
    readonly dim: number,
    readonly ser: number,
  ) {
    super (dim, ser)
  }
}

type circuit_t = Array <id_t>

export
class face_t extends cell_t {
  circuit: circuit_t
  polygon: polygon_t

  constructor (
    bui: cell_complex_builder_t,
    circuit: circuit_t,
  ) {
    let size = circuit.length
    let polygon = new polygon_t (size)
    let cod = bui.skeleton (1)
    let cell = new cell_builder_t (polygon, cod)
    for (let i = 0; i < size; i += 1) {
      let src_id = polygon.edge_array [i]
      let tar_id = circuit [i]
      let src = polygon.get_edge (src_id)
      let tar = bui.get_edge (tar_id)
      let boundary = new cell_builder_t (src.dom, tar.dom)
      if (tar_id instanceof rev_id_t) {
        boundary.dic.set (
          src.endpoints.start,
          new im_t (tar.endpoints.end, empty_cell))
        boundary.dic.set (
          src.endpoints.end,
          new im_t (tar.endpoints.start, empty_cell))
        cell.dic.set (src.start, new im_t (tar.end, empty_cell))
        cell.dic.set (src.end, new im_t (tar.start, empty_cell))
      } else {
        boundary.dic.set (
          src.endpoints.start,
          new im_t (tar.endpoints.start, empty_cell))
        boundary.dic.set (
          src.endpoints.end,
          new im_t (tar.endpoints.end, empty_cell))
        cell.dic.set (src.start, new im_t (tar.start, empty_cell))
        cell.dic.set (src.end, new im_t (tar.end, empty_cell))
      }
      cell.dic.set (src_id, new im_t (tar_id, boundary.build ()))
    }
    super (cell)
    this.circuit = circuit
    this.polygon = polygon
  }
}

//// 3 dimension

// TODO
