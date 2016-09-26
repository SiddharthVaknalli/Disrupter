var express = require("express"),
    app = express(),
    mongoose = require("mongoose"),
    bodyParser = require("body-parser"),
    expressSanitizer = require("express-sanitizer"),
    methodOverride = require("method-override"), 
    passport = require("passport"), 
    LocalStrategy = require("passport-local"), 
    passportLocalMongoose = require("passport-local-mongoose"),
    flash = require("connect-flash");

//To turn the request body into a JS object which can be manipulated - using body-parser package
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

//If an _method query is seen in a route, use the HTTP verb it specifies instead of the one sent
app.use(methodOverride("_method"));

//Use express-sanitizer to strip HTML of any script tags
app.use(expressSanitizer());

//Use flash for displaying interactive messages to user
app.use(flash());

//Eliminates need for specifying .ejs extension after each file
app.set("view engine", "ejs");

//To tell Express to use the "public" directory for serving assets
app.use(express.static("public"));

//Create the DB and connect mongoose to it
mongoose.connect("mongodb://localhost/blog_app");

//Import Mongoose models
var Blog = require("./models/blog.js"),
    Comment = require("./models/comment.js"),
    User = require("./models/user.js");

//------PASSPORT configuration-------------
app.use(require("express-session")({
    secret: "Blogs are great!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//All the User methods come from the Passport plugin in user.js
passport.use(new LocalStrategy(User.authenticate())); 
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//---------------------RESTful Routes---------------------------------

//Passes in the current user (stored in req.user by PassportJS) into all the routes through a middleware function. req.user contains the username and id of a user that's signed in or is empty if no user is logged in
app.use(function(req, res, next){
    res.locals.currentUser = req.user; //Anything stored in res.locals is available in the template that is rendered in that route - could be used as alternative to passing in an object
    res.locals.error = req.flash("error"); //Send the error message (if any) stored in flash
    res.locals.success = req.flash("success"); //Send the success message (if any) stored in flash
    next(); //Call the next function
});

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
app.get("/blogs/new", isLoggedIn, function(req, res){
    res.render("new");
});

//CREATE route
app.post("/blogs", isLoggedIn, function(req, res){
    //Sanitize the body of the blog object by removing all script tags in it
    req.body.blog.body = req.sanitize(req.body.blog.body);
    
    req.body.blog.author = {
        id: req.user._id,
        username: req.user.username
    }
    
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
app.get("/blogs/:id", isLoggedIn, function(req, res){
    //Populate the database references before displaying them
    Blog.findById(req.params.id).populate("comments").exec(function(err, foundBlog){
        if(err){
            res.redirect("/blogs");
        }
        else{
            res.render("show", {blog: foundBlog});
        }
    })
});

//EDIT route
app.get("/blogs/:id/edit", checkBlogOwnership, function(req, res){
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
app.put("/blogs/:id", checkBlogOwnership, function(req, res){
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
app.delete("/blogs/:id", checkBlogOwnership, function(req, res){
    Blog.findByIdAndRemove(req.params.id, function(err){
       if(err){
          res.redirect("/blogs"); 
       }
       else{
          res.redirect("/blogs");   
       }
    });
});

//====================
//AUTH Routes
//====================

//Show register form
app.get("/register", function(req, res) {
   res.render("register"); 
});

//Signup logic
app.post("/register", function(req, res) {
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
       if(err){
           req.flash("error", err.message)
           return res.render("register");
       }
       passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to Disrupter, " + user.username + " !")
            res.redirect("/blogs");
       });
    });  
});

//Show login form
app.get("/login", function(req, res) {
   res.render("login"); 
});

//Login logic
//Passport.authenticate as middleware between route and callback
app.post("/login", passport.authenticate("local", {
    successRedirect: "/blogs",
    failureRedirect: "/login",
    failureFlash: "Invalid username or password",
    successFlash: "Welcome to Disrupter!"
}), function(req, res) {
});

//Logout route
app.get("/logout", function(req, res) {
   req.logout();
   req.flash("success", "Logged You Out!");
   res.redirect("/blogs");
});

//=================
//COMMENTS ROUTES
//=================

//Comments New
//Pass in isLoggedIn() as middleware function
app.get("/blogs/:id/comments/new", isLoggedIn, function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            console.log(err);
        }
        else{
            res.render("comments/new", { blog: foundBlog });      
        }
    });
});

//Comments Create
app.post("/blogs/:id/comments/", isLoggedIn, function(req, res){
   Blog.findById(req.params.id, function(err, blog){
      if(err){
          console.log(err);
          res.redirect("/blogs");
      }
      else{
          Comment.create(req.body.comment, function(err, comment){
              if(err){
                  console.log(err);
              }
              else{
                  //Set the comment's user to the current logged in user
                  comment.author.id = req.user._id;
                  comment.author.username = req.user.username;
                  comment.save();
                  
                  blog.comments.push(comment);
                  blog.save(function(err, blog){
                      if(err){
                          console.log(err);
                      }
                      else{
                          req.flash("success", "Successfully added comment!")
                          res.redirect("/blogs/" + blog._id);
                      }
                  });
              }
          });
      }
   }); 
});

//Comment edit route
app.get("/blogs/:id/comments/:comment_id/edit", checkCommentOwnership, function(req, res){
    Comment.findById(req.params.comment_id, function(err, foundComment) {
        if(err){
            console.log(err);
            res.redirect("back");
        }
        else {
            res.render("comments/edit", { comment: foundComment, blog_id: req.params.id });
        }
    })
});

//Comments update route
app.put("/blogs/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
         if(err){
             console.log(err);
             res.redirect("back");
         }
         else{
             req.flash("success", "Successfully edited comment!");
             res.redirect("/blogs/" + req.params.id)
         }
    });
});

//Comment destroy route
app.delete("/blogs/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
         if(err){
             console.log(err);
             res.redirect("back");
         }
         else {
             req.flash("success", "Successfully deleted comment");
             res.redirect("/blogs/" + req.params.id);
         }
    });
});


//=============================
//Middleware functions
//=============================

function isLoggedIn (req, res, next){
    if(req.isAuthenticated()){
        return next();   
    }
    //Store a flash message as a key-value pair - used in the next route that the user is directed to
    req.flash("error", "You need to be logged in!") // The message is stored in the flash key "error"
    res.redirect("/login");
};

function checkBlogOwnership (req, res, next){
    //First, check if user is logged in
    if(req.isAuthenticated()){
        //If logged in, find the blog with the requested ID and check if the logged in user's ID matches with this blog's owner's ID
        Blog.findById(req.params.id, function(err, foundBlog) {
            if (err){
                req.flash("error", "Blog not found") // The message is stored in the flash key "error"
                res.redirect("back");
            }
            else{
                if(foundBlog.author.id.equals(req.user._id)){ //Cannot use == or === since foundBlog.author.id is a Mongoose object
                    next(); //Call the next function in the list 
                }
                else{
                    req.flash("error", "You don't have permission to do that!") // The message is stored in the flash key "error"
                    res.redirect("back"); //Redirect back to the route where the user is coming from
                }   
            }
        });
    }
    else {
        req.flash("error", "You need to be logged in to do that!") // The message is stored in the flash key "error"
        res.redirect("back"); //Redirect back to the route where the user is coming from
    }
};

function checkCommentOwnership (req, res, next) {
    //Check if user is first logged in at all
    if(req.isAuthenticated()){
        //Find the comment which is being edited/deleted
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if (err){
                req.flash("error", "Comment not found") // The message is stored in the flash key "error"
                res.redirect("back");
            }
            else{
                //Next check if the comment belongs to the logged in user
                if(foundComment.author.id.equals(req.user._id)){
                    next();
                }
                else{
                    req.flash("error", "You don't have permission to do that!") // The message is stored in the flash key "error"
                    res.redirect("back");
                }   
            }
        });
    }
    else {
        req.flash("error", "You need to be logged in to do that!") // The message is stored in the flash key "error"
        res.redirect("back");
    }
};

app.listen(process.env.PORT, process.env.IP, function(){
   console.log("Blog app server started!");
});
