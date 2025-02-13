import mongoose from "mongoose"

const subscriptionSchema = new mongoose.Schema({
    subscriber:{
        type: mongoose.Schema.Types.ObjectId,  //who is subscribing
        ref: "User"
    },
    channel:{
        type: mongoose.Schema.Types.ObjectId, //to whom subscriber is subscribing
        ref: "User"
    }

})

export const Subscription = mongoose.model("Subscription", subscriptionSchema);