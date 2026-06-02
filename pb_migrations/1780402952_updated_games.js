/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_hnfldp5j2adegjo")

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "number1463617562",
    "max": 5,
    "min": 0,
    "name": "quizCurrentGroup",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_hnfldp5j2adegjo")

  // remove field
  collection.fields.removeById("number1463617562")

  return app.save(collection)
})
