/* ************************
 * Copyright 2023
 * ABSERVETECH
 ************************ */
// const mongoose = require('mongoose')
// const extend = require('extend')
import mongoose from 'mongoose'
import extend from 'extend'
let counterSchema
let IdentityCounter

// Initialize plugin by creating counter collection in database.
const initialize = function (connection) {
  try {
    IdentityCounter = connection.model('IdentityCounter')
  } catch (ex) {
    if (ex.name === 'MissingSchemaError') {
      // Create new counter schema.
      counterSchema = new mongoose.Schema({
        model: { type: String, require: true },
        field: { type: String, require: true },
        count: { type: Number, default: 0 }
      })

      // Create a unique index using the "field" and "model" fields.
      // Bug fix: remove "required" and "index" options, and add "background" options
      counterSchema.index({ field: 1, model: 1 }, { unique: true, background: true })

      // Create model using new schema.
      IdentityCounter = connection.model('IdentityCounter', counterSchema)
    } else throw ex
  }
}

// The function to use when invoking the plugin on a custom schema.
const plugin = function (schema, options) {
  // If we don't have reference to the counterSchema or the IdentityCounter model then the plugin was most likely not
  // initialized properly so throw an error.
  if (!counterSchema || !IdentityCounter) throw new Error('mongoose-auto-increment has not been initialized')

  // Default settings and plugin scope variables.
  const settings = {
    model: null, // The model to configure the plugin for.
    field: '_id', // The field the plugin should track.
    startAt: 0, // The number the count should start at.
    incrementBy: 1, // The number by which to increment the count each time.
    unique: true // Should we create a unique index for the field
  }
  const fields = {} // A hash of fields to add properties to in Mongoose.
  let ready = false // True if the counter collection has been updated and the document is ready to be saved.

  switch (typeof options) {
    // If string, the user chose to pass in just the model name.
    case 'string':
      settings.model = options
      break
    // If object, the user passed in a hash of options.
    case 'object':
      extend(settings, options)
      break
  }

  if (settings.model == null) throw new Error('model must be set')

  // Add properties for field in schema.
  fields[settings.field] = {
    type: Number,
    require: true
  }
  if (settings.field !== '_id') fields[settings.field].unique = settings.unique
  if (settings.options) fields[settings.field].options = settings.options
  schema.add(fields)

  // Find the counter for this model and the relevant field.
  IdentityCounter.findOne({ model: settings.model, field: settings.field }).then(function (counter) {
    if (!counter) {
      // If no counter exists then create one and save it.
      counter = new IdentityCounter({
        model: settings.model,
        field: settings.field,
        count: settings.startAt - settings.incrementBy
      })
      counter.save(function () {
        ready = true
      })
    } else {
      ready = true
    }
  })

  // Declare a function to get the next counter for the model/schema.
  const nextCount = function (callback) {
    try {
      IdentityCounter.findOne({
        model: settings.model,
        field: settings.field
      }).then(function (counter) {
        callback(null, counter === null ? settings.startAt : counter.count + settings.incrementBy)
      })
    } catch (err) {
      return callback(err)
    }
  }
  // Add nextCount as both a method on documents and a static on the schema for convenience.
  schema.method('nextCount', nextCount)
  schema.static('nextCount', nextCount)

  // Declare a function to reset counter at the start value - increment value.
  const resetCount = function (callback) {
    try {
      IdentityCounter.findOneAndUpdate(
        { model: settings.model, field: settings.field },
        { count: settings.startAt - settings.incrementBy },
        { new: true } // new: true specifies that the callback should get the updated counter.
      ).then(function () {
        callback(null, settings.startAt)
      })
    } catch (err) {
      return callback(err)
    }
  }
  // Add resetCount as both a method on documents and a static on the schema for convenience.
  schema.method('resetCount', resetCount)
  schema.static('resetCount', resetCount)

  // Every time documents in this schema are saved, run this logic.
  schema.pre('save', function (next) {
    // Get reference to the document being saved.
    const doc = this

    // Only do this if it is a new document (see http://mongoosejs.com/docs/api.html#document_Document-isNew)
    if (doc.isNew) {
      // Declare self-invoking save function.
      ;(function save() {
        // If ready, run increment logic.
        // Note: ready is true when an existing counter collection is found or after it is created for the
        // first time.
        if (ready) {
          // check that a number has already been provided, and update the counter to that number if it is
          // greater than the current count
          if (typeof doc[settings.field] === 'number') {
            try {
              IdentityCounter.findOneAndUpdate(
                // IdentityCounter documents are identified by the model and field that the plugin was invoked for.
                // Check also that count is less than field value.
                { model: settings.model, field: settings.field, count: { $lt: doc[settings.field] } },
                // Change the count of the value found to the new field value.
                { count: doc[settings.field] }
              ).then(function () {
                // Continue with default document save functionality.
                next()
              })
            } catch (err) {
              return next(err)
            }
          } else {
            try {
              // Find the counter collection entry for this model and field and update it.
              IdentityCounter.findOneAndUpdate(
                // IdentityCounter documents are identified by the model and field that the plugin was invoked for.
                { model: settings.model, field: settings.field },
                // Increment the count by `incrementBy`.
                { $inc: { count: settings.incrementBy } },
                // new:true specifies that the callback should get the counter AFTER it is updated (incremented).
                { new: true }
                // Receive the updated counter.
              ).then(function (updatedIdentityCounter) {
                // If there are no errors then go ahead and set the document's field to the current count.
                doc[settings.field] = updatedIdentityCounter.count
                // Continue with default document save functionality.
                next()
              })
            } catch (err) {
              return next(err)
            }
          }
        }
        // If not ready then set a 5 millisecond timer and try to save again. It will keep doing this until
        // the counter collection is ready.
        else setTimeout(save, 5)
      })()
    }
    // If the document does not have the field we're interested in or that field isn't a number AND the user did
    // not specify that we should increment on updates, then just continue the save without any increment logic.
    else next()
  })
}

export default { initialize, plugin }
