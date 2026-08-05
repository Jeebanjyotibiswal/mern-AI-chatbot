
require('dotenv').config();
const mongoose = require('mongoose');
 // Make sure this is at the top

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI not set in environment variables");
        }
        await mongoose.connect(mongoUri);
        console.log("MongoDB Connected to:", mongoUri.split("@").pop()); // Log only the host part for security
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
};

module.exports = connectDB;