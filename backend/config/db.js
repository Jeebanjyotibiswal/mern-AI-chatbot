const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mern_auth";
        await mongoose.connect(mongoUri);
        console.log("MongoDB Connected to:", mongoUri.split("@").pop()); // Log only the host part for security
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
};

module.exports = connectDB;