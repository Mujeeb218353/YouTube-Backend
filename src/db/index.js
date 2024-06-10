import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// console.log(process.env.MONGODB_URI);



const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB Connected !!! DB_NAME: ${connectionInstance.connection.host}`);
    }catch(err){
        console.log("MONGO_BD CONNECTION ERROR:",err);
        process.exit(1);
    }
}

export default connectDB;