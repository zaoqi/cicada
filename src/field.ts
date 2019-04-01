import { set_t } from "./set"
import { eqv_t } from "./eqv"

export
abstract class field_t <F> extends set_t <F> {
  abstract add_id: F
  abstract add (x: F, y: F): F
  abstract neg (x: F): F

  sub (x: F, y: F): F {
    return this.add (x, this.neg (y))
  }

  add_assoc (x: F, y: F, z: F): eqv_t <F> {
    return new eqv_t (
      this,
      this.add (this.add (x, y), z),
      this.add (x, this.add (y, z)),
    )
  }

  add_commu (x: F, y: F): eqv_t <F> {
    return new eqv_t (
      this,
      this.add (x, y),
      this.add (y, x),
    )
  }

  abstract mul_id: F
  abstract mul (x: F, y: F): F
  abstract inv (x: F): F

  div (x: F, y: F): F {
    return this.mul (x, this.inv (y))
  }

  mul_assoc (x: F, y: F, z: F): eqv_t <F> {
    return new eqv_t (
      this,
      this.mul (this.mul (x, y), z),
      this.mul (x, this.mul (y, z)),
    )
  }

  mul_commu (x: F, y: F): eqv_t <F> {
    return new eqv_t (
      this,
      this.mul (x, y),
      this.mul (y, x),
    )
  }
}

class number_field_t extends field_t <number> {
  constructor () {
    super ()
  }

  eq (x: number, y: number): boolean {
    return x === y
  }

  add_id = 0

  add (x: number, y: number): number {
    return x + y
  }

  neg (x: number): number {
    return - x
  }

  mul_id = 1

  mul (x: number, y: number): number {
    return x * y
  }

  inv (x: number): number {
    return 1 / x
  }
}
