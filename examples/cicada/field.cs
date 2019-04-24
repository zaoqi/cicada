import { abelian_group_t } from "./group.cs"

class field_t {
  element_t: type

  addition: abelian_group_t (
    element_t = this.element_t
  )

  // TODO
  // only non zero element_t forms an `abelian_group_t`
  //   how to describe this ?
  // maybe define `ring_t` first

  multiplication: abelian_group_t (
    element_t = this.element_t
  )

  zero = this.addition.id
  add = this.addition.add
  neg = this.addition.neg
  sub = this.addition.sub

  one = this.multiplication.id
  mul = this.multiplication.mul
  inv = this.multiplication.inv
  div = this.multiplication.div

  distr (
    x: this.element_t,
    y: this.element_t,
    z: this.element_t,
  ): eqv_t (
    this.mul (x, this.add (y, z)),
    this.add (this.mul (x, y), this.mul (x, z)),
  )
}