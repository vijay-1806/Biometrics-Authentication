const mongoose = require('mongoose');
module.exports = function idVariants(id) {
  const value = String(id);
  return /^[0-9a-fA-F]{24}$/.test(value) ? [value, new mongoose.Types.ObjectId(value)] : [value];
};
