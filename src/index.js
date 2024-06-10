import dotenv from "dotenv";
dotenv.config({
    path: "./env"
});
import app from './app.js';
import connectDB from "./db/index.js";

app.get('/',(req, res)=>{
    res.send('hello')
})

connectDB().then(
    app.on('error',(err)=>{
        console.log('ERROR:',err);
    }),
    app.listen(process.env.PORT,()=>{
        console.log(`Your app is listening on http://localhost:${process.env.PORT}`);
    })
).catch((err)=>{
    console.log(err);
});




/*
import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()
*/