/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const games = app.findCollectionByNameOrId("pbc_hnfldp5j2adegjo")
  games.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "field_bingo_scored",
    "name": "bingoScored",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  const results = app.findCollectionByNameOrId("pbc_95nbhvet300qgon")
  results.fields.addAt(6, new Field({
    "help": "",
    "hidden": false,
    "id": "field_pending_bingo_score",
    "name": "pendingBingoScore",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  app.save(games)
  return app.save(results)
}, (app) => {
  const games = app.findCollectionByNameOrId("pbc_hnfldp5j2adegjo")
  games.fields.removeById("field_bingo_scored")

  const results = app.findCollectionByNameOrId("pbc_95nbhvet300qgon")
  results.fields.removeById("field_pending_bingo_score")

  app.save(games)
  return app.save(results)
})
