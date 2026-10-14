"use strict";

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "faculty", "student"], required: true },
    rollNumber: { type: String, trim: true },
    isApproved: { type: Boolean, default: true },
    isProfileComplete: { type: Boolean, default: false },
    batchId: { type: String, default: null },
    facultyId: { type: String, default: null },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

userSchema.index({ rollNumber: 1 }, {
    unique: true,
    partialFilterExpression: { rollNumber: { $type: "string" } }
});

const appDataSchema = new mongoose.Schema({
    bucket: { type: String, required: true },
    recordId: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true, versionKey: false });
appDataSchema.index({ bucket: 1, recordId: 1 }, { unique: true });

module.exports = {
    User: mongoose.models.User || mongoose.model("User", userSchema),
    AppData: mongoose.models.AppData || mongoose.model("AppData", appDataSchema)
};
