import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },//Trim removes whitespace from the beginning and end of the string
    description: { type: String, required: true, trim: true },//Required ensures that the field is not empty
    image: { type: String, required: true, trim: true },
    imagePublicId: { type: String, required: true }, 
    cpu: {
        cores: { type: Number, required: true, min: 1 },//Min ensures that the value is not less than 1
        threads: { type: Number, required: true, min: 1 },
        baseClock: { type: Number, required: true, min: 1 },
        boostClock: { type: Number, required: true, min: 1 }
    },//Nested object for CPU specifications
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
