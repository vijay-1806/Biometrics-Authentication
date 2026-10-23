const mongoose = require('mongoose');

// Imported records use ObjectIds, while locally created records may use strings.
module.exports = function mixedIdLookup(schema) {
  schema.statics.findByRecordId = function (id) {
    if (id == null) return this.findOne({ _id: null });
    const ids = [String(id)];
    if (/^[0-9a-fA-F]{24}$/.test(String(id))) {
      ids.push(new mongoose.Types.ObjectId(String(id)));
    }
    return this.findOne({ _id: { $in: ids } });
  };
};
