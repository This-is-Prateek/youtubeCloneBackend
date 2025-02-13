import mongoose from "mongoose";
import { DB_NAME } from "../contants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);   //connects the codebase to mongodb atlas
        console.log(`/n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);   //gives the host name or domain name of the mongodb server instance

    } catch (error) {
        console.log("Mongodb connection error ", error);
        process.exit(1);
    }
}

export default connectDB;