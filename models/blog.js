var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var BlogSchema = new mongoose.Schema({
   title: String,
   image: String,
   body: String,
   created: { type: Date, default: Date.now }, //Sets it to the current date automatically
   author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
   },
   comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
});

module.exports = mongoose.model("Blog", BlogSchema);
