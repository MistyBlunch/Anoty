import mongoose from "mongoose";

export interface IUser {
  _id?: string;
  googleId?: string;
  facebookId?: string;
  email?: string;
  name?: string;
  avatar?: string;
  username: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
  },
  name: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  username: {
    type: String,
    required: [true, "El nombre de usuario es requerido"],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, "El nombre de usuario debe tener al menos 3 caracteres"],
  },
}, {
  timestamps: true,
});

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
