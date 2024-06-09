import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// console.log(process.env.MONGODB_URI);

const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB Connected !!! DB_NAME: ${connectionInstance.connection.host}`);
        process.exit(1);
    }catch(err){
        console.log("MONGOBD CONNECTION ERROR:",err);
    }
}

export default connectDB;