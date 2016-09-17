var express = require("express"),
    app = express(),
    mongoose = require("mongoose"),
    bodyParser = require("body-parser"),
    expressSanitizer = require("express-sanitizer"),
    methodOverride = require("method-override");
    
    
//To turn the request body into a JS object which can be manipulated - using body-parser package
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

//If an _method query is seen in a route, use the HTTP verb it specifies instead of the one sent
app.use(methodOverride("_method"));

//Use express-sanitizer to strip HTML of any script tags
app.use(expressSanitizer());

//Eliminates need for specifying .ejs extension after each file
app.set("view engine", "ejs");

//To tell Express to use the "public" directory for serving assets
app.use(express.static("public"));

//Create the Yelp_Camp DB and connect mongoose to it
mongoose.connect("mongodb://localhost/blog_app");

//MONGOOSE/MODEL CONFIG
var blogSchema = new mongoose.Schema({
   title: String,
   image: String,
   body: String,
   created: { type: Date, default: Date.now } //Sets it to the current date automatically
});
var Blog = mongoose.model("Blog", blogSchema);

//---------------------RESTful Routes---------------------------------

app.get("/", function(req, res){
    res.redirect("/blogs");
})

//INDEX route
app.get("/blogs", function(req, res){
    Blog.find({}, function(err, blogs){
        if(err){
            console.log(err);
        }
        else {
            res.render("index", {
                blogs: blogs
            });
        }
    });
});

//NEW route
app.get("/blogs/new", function(req, res){
    res.render("new");
});

//CREATE route
app.post("/blogs", function(req, res){
    //Sanitize the body of the blog object by removing all script tags in it
    req.body.blog.body = req.sanitize(req.body.blog.body);
    
    //A blog object is created in the new.ejs file already. It is passed in using req.body.blog
    Blog.create(req.body.blog, function(err, createdBlog){
        if (err){
            res.render("new");
        }
        else{
            res.redirect("/blogs");
        }
    })
});

//SHOW route
app.get("/blogs/:id", function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            res.redirect("/blogs");
        }
        else{
            res.render("show", {blog: foundBlog});
        }
    })
});

//EDIT route
app.get("/blogs/:id/edit", function(req, res){
   Blog.findById(req.params.id, function(err, foundBlog){
       if(err){
           res.redirect("/blogs/" + req.params.id);
       }
       else{
           res.render("edit", {blog: foundBlog});
       }
   });
});

//UPDATE route
app.put("/blogs/:id", function(req, res){
    //Sanitize the body of the blog object by removing all script tags in it
    req.body.blog.body = req.sanitize(req.body.blog.body);
    
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
        if(err){
            res.redirect("/blogs");
        }
        else{
            res.redirect("/blogs/" + req.params.id);
        }
    })
});

//DESTROY route
app.delete("/blogs/:id", function(req, res){
    Blog.findByIdAndRemove(req.params.id, function(err){
       if(err){
          res.redirect("/blogs"); 
       }
       else{
          res.redirect("/blogs");   
       }
    });
});

app.listen(process.env.PORT, process.env.IP, function(){
   console.log("Blog app server started!");
});
