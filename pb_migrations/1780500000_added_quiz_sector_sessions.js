/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const questions = app.findCollectionByNameOrId("pbc_questions000")
  questions.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_sector_key",
    "max": 80,
    "min": 0,
    "name": "sectorKey",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  questions.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_sector_name",
    "max": 120,
    "min": 0,
    "name": "sectorName",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  questions.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "num_quiz_session_idx",
    "max": 4,
    "min": 0,
    "name": "quizSessionIndex",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))
  questions.indexes.push("CREATE INDEX `idx_questions_quiz_session` ON `questions` (`gameKey`, `quizSessionIndex`)")

  const results = app.findCollectionByNameOrId("pbc_95nbhvet300qgon")
  results.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "num_result_quiz_session",
    "max": 4,
    "min": 0,
    "name": "quizSessionIndex",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))
  results.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_result_sector_key",
    "max": 80,
    "min": 0,
    "name": "sectorKey",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  results.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_result_sector_name",
    "max": 120,
    "min": 0,
    "name": "sectorName",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))
  results.indexes = results.indexes.filter((index) => !index.includes("idx_game_results_player_game"))
  results.indexes.push("CREATE INDEX `idx_game_results_player_game` ON `game_results` (`player`, `gameKey`)")
  results.indexes.push("CREATE INDEX `idx_game_results_player_game_quiz_session` ON `game_results` (`player`, `gameKey`, `quizSessionIndex`)")

  const games = app.findCollectionByNameOrId("pbc_hnfldp5j2adegjo")
  games.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "json_quiz_open_groups",
    "maxSize": 2000000,
    "name": "quizOpenGroups",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  app.save(questions)
  app.save(results)
  return app.save(games)
}, (app) => {
  const questions = app.findCollectionByNameOrId("pbc_questions000")
  questions.fields.removeById("text_sector_key")
  questions.fields.removeById("text_sector_name")
  questions.fields.removeById("num_quiz_session_idx")
  questions.indexes = questions.indexes.filter((index) => !index.includes("idx_questions_quiz_session"))

  const results = app.findCollectionByNameOrId("pbc_95nbhvet300qgon")
  results.fields.removeById("num_result_quiz_session")
  results.fields.removeById("text_result_sector_key")
  results.fields.removeById("text_result_sector_name")
  results.indexes = results.indexes.filter((index) => !index.includes("idx_game_results_player_game"))
  results.indexes.push("CREATE UNIQUE INDEX `idx_game_results_player_game` ON `game_results` (`player`, `gameKey`)")

  const games = app.findCollectionByNameOrId("pbc_hnfldp5j2adegjo")
  games.fields.removeById("json_quiz_open_groups")

  app.save(questions)
  app.save(results)
  return app.save(games)
})
