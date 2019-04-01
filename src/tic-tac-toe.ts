import * as _ from "lodash"

import * as cg from "./combinatorial-game"

type player_t = "X" | "O"

type mark_t = "_" | "X" | "O"

type row_t = [ mark_t, mark_t, mark_t ]

type position_t = [ row_t, row_t, row_t ]

let empty_position: position_t = [
  [ "_", "_", "_" ],
  [ "_", "_", "_" ],
  [ "_", "_", "_" ],
]

type choice_t = [ number, number ]

class game_t
extends cg.game_t <player_t, position_t, choice_t> {
  choices (
    _p: player_t,
    pos: position_t
  ): Array <choice_t> {
    let array: Array <choice_t> = []
    pos.forEach ((row, x) => {
      row.forEach ((mark, y) => {
        if (pos [x] [y] === "_")
          array.push ([x, y])
      })
    })
    return array
  }

  choose (
    p: player_t,
    ch: choice_t,
    pos: position_t,
  ): position_t {
    let pos1 = _.cloneDeep (pos)
    let [x, y] = ch
    pos1 [x] [y] = p
    return pos1
  }

  win_p (
    p: player_t,
    pos: position_t,
  ): boolean {
    return (row_win_p (p, pos) ||
            column_win_p (p, pos) ||
            diagonal_win_p (p, pos))
  }
}

function row_win_p (
  p: player_t,
  pos: position_t,
): boolean {
  return ((pos [0] [0] === p &&
           pos [0] [1] === p &&
           pos [0] [2] === p) ||
          (pos [1] [0] === p &&
           pos [1] [1] === p &&
           pos [1] [2] === p) ||
          (pos [2] [0] === p &&
           pos [2] [1] === p &&
           pos [2] [2] === p))
}

function column_win_p (
  p: player_t,
  pos: position_t,
): boolean {
  return ((pos [0] [0] === p &&
           pos [1] [0] === p &&
           pos [2] [0] === p) ||
          (pos [0] [1] === p &&
           pos [1] [1] === p &&
           pos [2] [1] === p) ||
          (pos [0] [2] === p &&
           pos [1] [2] === p &&
           pos [2] [2] === p))
}

function diagonal_win_p (
  p: player_t,
  pos: position_t,
): boolean {
  return ((pos [0] [0] === p &&
           pos [1] [1] === p &&
           pos [2] [2] === p) ||
          (pos [0] [2] === p &&
           pos [1] [1] === p &&
           pos [2] [0] === p))
}

class play_t
extends cg.play_t <player_t, position_t, choice_t> {
  next_player = this.tow_player_alternating

  position_log (pos: position_t) {
    let repr = ""
    pos.forEach ((row, x) => {
      row.forEach ((mark, y) => {
        repr += `${ mark } `
      })
      repr += "\n"
    })
    console.log (repr)
  }
}

export
let tic_tac_toe = new game_t ()

export
let random_bot = new cg.random_bot_t (tic_tac_toe)

export
function new_play (): play_t {
  let play = new play_t (
    tic_tac_toe, empty_position, "O", ["O", "X"])
  return play
}

// brute force the winning strategy
