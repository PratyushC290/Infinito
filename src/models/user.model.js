import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        select: false
    },
    fullname: {
        type: String,
        required: [true, "Full name is required"]
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    collegeName: String,
    rollNo: String,
    isIITPStud: {
        type: Boolean,
        default: false
    },
    refreshToken: String,
    score: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

export const User = mongoose.model("User", userSchema);