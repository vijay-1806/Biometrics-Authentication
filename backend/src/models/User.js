const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Imported seed accounts use ObjectIds; newer accounts may use string IDs.
userSchema.statics.findByLoginId = function (id) {
  const ids = [String(id)];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) {
    ids.push(new mongoose.Types.ObjectId(String(id)));
  }
  return this.findOne({ _id: { $in: ids } });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
