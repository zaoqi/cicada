# A Substitution Model for Class Definition

------
- Author: Xie Yuheng
- Date: 2019-05-07
- Keywords: cell-complex, data structure.
------

- This document serves as an appendix of the paper ["A Recursive Combinatorial Description of cell-complex"](https://github.com/xieyuheng/cicada/blob/master/docs/a-recursive-combinatorial-description-of-cell-complex.md).

My overall class definitions are:

``` typescript
class id_t {
  dim: number
  ser: number
}

class cell_complex_t {
  cell_dic: dic_t <id_t, cell_t>
}

class cell_t {
  dom: spherical_t
  cod: cell_complex_t
  dic: dic_t <id_t, { id: id_t, cell: cell_t }>
}

class spherical_t extends cell_complex_t {
  spherical_evidence: spherical_evidence_t
}

class spherical_evidence_t {
  /**
   * [detail definition omitted]
   */
}
```

In the definition of `spherical_t`:

``` typescript
class spherical_t extends cell_complex_t {
  spherical_evidence: spherical_evidence_t
}
```

Substitute `extends cell_complex_t` by the definition of `cell_complex_t`,
we get:
- i.e. `spherical_t extends cell_complex_t` means merge the definition of `cell_complex_t` into the definition of `spherical_t`.

``` typescript
class spherical_t {
  spherical_evidence: spherical_evidence_t
  cell_dic: dic_t <id_t, cell_t>
}
```

And substitute the above definition of `spherical_t` and `cell_complex_t` into the definition of `cell_t`,
we get:

``` typescript
class cell_t {
  dom: {
    spherical_evidence: spherical_evidence_t
    cell_dic: dic_t <id_t, cell_t>
  }
  cod: {
    cell_dic: dic_t <id_t, cell_t>
  }
  dic: dic_t <id_t, { id: id_t, cell: cell_t }>
}
```

And substitute the definition of `spherical_evidence_t` into the above definition of `cell_t`,
we get:

``` typescript
class cell_t {
  dom: {
    spherical_evidence: {
      /**
       * [detail definition omitted]
       */
    }
    cell_dic: dic_t <id_t, cell_t>
  }
  cod: {
    cell_dic: dic_t <id_t, cell_t>
  }
  dic: dic_t <id_t, { id: id_t, cell: cell_t }>
}
```

If I do not omit the `[detail definition]` in above structure,
I will get something like:

``` typescript
class cell_t {
  dom: {
    spherical_evidence: {
      "isomorphism": "isomorphism between two cell-complexes A and B"
      "subdivision of dom": "A is a subdivision of this dom"
      "subdivision of standard n-sphere": "B is a subdivision of a standard n-sphere"
    }
    cell_dic: dic_t <id_t, cell_t>
  }
  cod: {
    cell_dic: dic_t <id_t, cell_t>
  }
  dic: dic_t <id_t, { id: id_t, cell: cell_t }>
}
```

This means,
to construct a `cell`,
one have to **provide the evidence** that the `dom` of the `cell` is spherical.

i.e. I pushed the responsibility of making sure the `dom` is spherical to people who use my method.

It is required that the `dom` must be a spherical cell-complex,
but "check" can means "write a program to decide whether a cell-complex is spherical".
- It is possible to write this program for dimension 0, 1, 2, 3,
- but not possible for dimension >= 5.

My construction of cell-complex, does not require such program exist,
because one have to provide the `spherical_evidence` by hand (i.e. not generated by a computer program).

And this does not make the construction invalid.