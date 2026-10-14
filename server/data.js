"use strict";

const { AppData } = require("./models");

const COLLECTIONS = new Set([
    "departments", "programs", "batches", "faculty", "subjects", "rooms",
    "time-slots", "timetable", "leaves", "notifications", "audit-logs", "institution"
]);

async function list(bucket) {
    const rows = await AppData.find({ bucket }).sort({ createdAt: 1 }).lean();
    return rows.map((row) => row.data);
}

async function get(bucket, id) {
    const row = await AppData.findOne({ bucket, recordId: String(id) }).lean();
    return row?.data || null;
}

async function put(bucket, record) {
    if (!record || !record.id) {
        throw Object.assign(new Error("A record id is required."), { status: 400 });
    }
    const data = { ...record, id: String(record.id) };
    await AppData.findOneAndUpdate(
        { bucket, recordId: data.id },
        { $set: { data } },
        { upsert: true, new: true, runValidators: true }
    );
    return data;
}

async function remove(bucket, id) {
    const result = await AppData.deleteOne({ bucket, recordId: String(id) });
    return result.deletedCount > 0;
}

async function replace(bucket, records) {
    await AppData.deleteMany({ bucket });
    if (records.length) {
        await AppData.insertMany(records.map((data) => ({
            bucket,
            recordId: String(data.id),
            data
        })));
    }
}

module.exports = { COLLECTIONS, list, get, put, remove, replace };
