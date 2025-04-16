import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    imagePublicId: { type: String, required: true }, // Add this line
    cpu: {
        cores: { type: Number, required: true, min: 1 },
        threads: { type: Number, required: true, min: 1 },
        baseClock: { type: Number, required: true, min: 1 },
        boostClock: { type: Number, required: true, min: 1 }
    },
    gpu: {
        series: { type: String, required: true, trim: true },
        vramGB: { type: Number, required: true, min: 1 },
        boostClockMHz: { type: Number, required: true, min: 1 },
        cores: { type: Number, required: true, min: 1 }
    },
    ram: {
        sizeGB: { type: Number, required: true, min: 1 },
        speedMHz: { type: Number, required: true, min: 1 },
        type: { type: String, required: true, trim: true }
    }
}, { timestamps: true });

const gameModel = mongoose.models.game || mongoose.model("game", gameSchema);

export default gameModel;
