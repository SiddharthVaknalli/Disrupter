var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var CommentSchema = new mongoose.Schema({
    text: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    created: { type: Date, default: Date.now }, //Sets it to the current date automatically
});

module.exports = mongoose.model("Comment", CommentSchema);
