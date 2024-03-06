const express = require("express");
const cloudinary = require("cloudinary").v2;
const app = express();
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const SSLCommerzPayment = require("sslcommerz-lts");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: slugify } = require("slugify");
const port = process.env.PORT || 5000;
// multer for file upload
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const client_URL = "http://localhost:5173";
const server_URL = "http://localhost:5000";

// const client_URL = "https://hiremaster.netlify.app";
// const server_URL = "https://hire-master-server.vercel.app";

// Socket.io
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

// middleware
app.use(
  cors({
    origin: [client_URL],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ extended: true, limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));



const uploadPath = path.join(__dirname, "resumes");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

app.use("/resumes", express.static(uploadPath));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});
const upload = multer({ storage: storage });

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lzichn4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false; //true for live, false for sandbox

// ----------------middleware----------------------
const logger = async (req, res, next) => {
  console.log("called", req.hostname, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// cloudinary image upload
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

async function run() {
  try {
    const UsersProfileCollection = client
      .db("HireMaster")
      .collection("UsersProfile");

    const userCollection = client.db("HireMaster").collection("Users");

    const ManagersProfileCollection = client
      .db("HireMaster")
      .collection("ManagersProfile");

    const hiringTalentCollection = client
      .db("HireMaster")
      .collection("HiringTalent");


    const subscriberCollection = client
      .db("HireMaster")
      .collection("Subscribers");

    const jobCollection = client.db("HireMaster").collection("jobData");

    const appliedJobCollection = client
      .db("HireMaster")
      .collection("AppliedJob");

    const staticCollection = client.db("HireMaster").collection("JobPost");

    const UserPaymentCollection = client
      .db("HireMaster")
      .collection("Payments");

    const newsCollection = client.db("HireMaster").collection("News");

    const jobFairUserCollection = client
      .db("HireMaster")
      .collection("Fair-registration");

    const jobFairEventCollection = client
      .db("HireMaster")
      .collection("Fair-events");

    const userReportCollection = client
      .db("HireMaster")
      .collection("UserReport");

    const premiumUserCourseCollection = client
      .db("HireMaster")
      .collection("Course");

    const jobFairEventBookingCollection = client
      .db("HireMaster")
      .collection("Event-bookings");

    const jobFairInterestedEventCollection = client
      .db("HireMaster")
      .collection("Interested-events");
    const resumeCollection = client.db("HireMaster").collection("User-resumes");

      
    // Socket.IO logic
    io.on("connection", (socket) => {
      console.log("New client connected");

      socket.on("chat", (payload) => {
        console.log("User Message", payload);
        io.emit("chat", payload);
      });
    });

    // -----------------JWT----------------------
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
          // secure: true,
          // sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });



    // user resume upload
    app.post("/upload/cv-resume", upload.single("file"), async (req, res) => {
      try {
        const resume = req.file.filename;
        const user_email = req.body.user_email;
        const existingUser = await resumeCollection.findOne({ user_email });

        // if (existingUser) {
        //   res.status(409).json({ error: "Resume already exists" });
        // } else {
        const result = await resumeCollection.insertOne({
          user_email,
          resume,
        });
        const savedResume = {
          _id: result.insertedId,
          user_email: user_email,
          resume: resume,
        };
        res.json({
          success: true,
          message: "Resume uploaded successfully",
          savedResume,
        });
        // }
      } catch (error) {
        console.error("Error during file upload:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.get("/get-resumes/:user_email", async (req, res) => {
      try {
        const user_email = req.params.user_email;
        const userResumes = await resumeCollection
          .find({ user_email })
          .toArray();
        res.json(userResumes);
      } catch (error) {
        console.error("Error during GET request:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // app.get("/userProfile/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const query = {
    //     email: email,
    //   };
    //   const result = await UsersProfileCollection.findOne(query);
    //   res.send(result);
    // });



    // ---------Managers Profile Collection--------------
    app.post("/managerProfile", async (req, res) => {
      const newProfile = req.body;

      const existingProfile = await ManagersProfileCollection.findOne({
        email: newProfile.email,
      });

      if (existingProfile) {
        return res.send({
          message: "Already Exist, Update from profile.",
          insertedId: null,
        });
      }

      const result = await ManagersProfileCollection.insertOne(newProfile);
      res.status(201).json({ insertedId: result.insertedId });
    });

    app.get("/managerProfile", async (req, res) => {
      const result = await ManagersProfileCollection.find().toArray();
      res.send(result);
    });

    app.patch("/managerProfile", async (req, res) => {
      const updatedProfile = req.body;

      const existingProfile = await ManagersProfileCollection.findOne({
        email: updatedProfile.email,
      });

      if (!existingProfile) {
        return res.status(404).json({
          message: "Profile not found",
        });
      }

      const result = await ManagersProfileCollection.updateOne(
        { email: updatedProfile.email },
        { $set: updatedProfile }
      );

      if (result.modifiedCount === 0) {
        return res.status(500).json({
          message: "Failed to update profile",
        });
      }
      res.status(200).json({ message: "Profile updated successfully" });
      res.send(result);
    });

    app.get("/managerProfile/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };
      const result = await ManagersProfileCollection.findOne(query);
      res.send(result);
    });


   
    
    // make admin to Hiring Manager
    app.patch("/hiring-talents/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const UpdatedDoc = {
        $set: {
          role2: "admin",
        },
      };
      const result = await hiringTalentCollection.updateOne(filter, UpdatedDoc);
      res.send(result);
    });

    // remove admin Functionality added in Hiring Manager List
    app.patch("/hiring-talents/remove-admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const UpdatedDoc = {
        $unset: {
          role2: "",
        },
      };
      const result = await hiringTalentCollection.updateOne(filter, UpdatedDoc);
      res.send(result);
    });

    app.delete("/hiring-talents/HR/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await hiringTalentCollection.deleteOne(query);
      res.send(result);
    });

    // check Admin
    app.get("/hiring-talents/checkAdmin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await hiringTalentCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role2 == "admin";
      }
      res.send({ admin });
    });
    //
    //
    // Fair registration routes
    //
    //

    app.post("/fair-registration", async (req, res) => {
      const register = req.body;
      const query = { email: register.email };
      const isRegistered = await jobFairUserCollection.findOne(query);

      try {
        if (isRegistered) {
          return res.send({ status: "Already registered" });
        }
        const result = await jobFairUserCollection.insertOne(register);
        res.json(result);
      } catch (error) {
        console.error("Error inserting news:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/fair-registration", async (req, res) => {
      res.json(await jobFairUserCollection.find({}).toArray());
    });

    app.get("/fair-registration/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const result = await jobFairUserCollection.findOne({ email });
        res.json(result);
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.patch("/fair-registration/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedUser = req.body;
      const updatedDoc = {
        $set: {
          fullname: updatedUser.fullname,
          profilePicture: updatedUser.profilePicture,
        },
      };
      const result = await jobFairUserCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.json(result);
    });

    // ---------------------- Admin Dashboard ------------------------
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // pagination for user list

    app.get("/users/pagination", async (req, res) => {
      const query = req.query;
      const page = query.page;
      console.log(page);
      const pageNumber = parseInt(page);
      const perPage = 10;
      const skip = pageNumber * perPage;
      const users = userCollection.find().skip(skip).limit(perPage);
      const result = await users.toArray();
      const UsersCount = await userCollection.countDocuments();
      res.send({ result, UsersCount });
    });

    // Make Admin to User
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const UpdatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, UpdatedDoc);
      res.send(result);
    });

    // check Admin

    app.get("/users/checkAdmin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role == "admin";
      }
      res.send({ admin });
    });

    // remove admin
    app.patch("/users/remove-admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const UpdatedDoc = {
        $unset: {
          role: "",
        },
      };
      const result = await userCollection.updateOne(filter, UpdatedDoc);
      res.send(result);
    });

    // Delete Job Seeker
   
  
// ---------------------------------payment end-----------------------------
    // premium user delete
    app.delete("/payments/PremiumUser/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await UserPaymentCollection.deleteOne(query);
      res.send(result);
    });

    // user report section
    app.post("/userreport", async (req, res) => {
      const report = req.body;
      const result = await userReportCollection.insertOne(report);
      res.send(result);
    });

    app.get("/userreport", async (req, res) => {
      const cursor = userReportCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Premium User Course Section
    app.post("/premiumusercourse", async (req, res) => {
      const course = req.body;
      const result = await premiumUserCourseCollection.insertOne(course);
      res.send(result);
    });

    app.get("/premiumusercourse", async (req, res) => {
      const cursor = premiumUserCourseCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //
    // cloudinary
    app.post("/profile/imageUpload", async (req, res) => {
      try {
        let result = await cloudinary.uploader.upload(req.body.image, {
          public_id: `${Date.now()}`,
          resource_type: "auto",
        });

        if (result) {
          res.json({
            public_id: result.public_id,
            url: result.secure_url,
          });
        }
      } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        res.status(500).json({
          error: "Internal Server Error",
        });
      }
    });
    app.post("/profile/imageRemove", (req, res) => {
      const removed = req.body;
      const image_id = req.body.public_id;
      cloudinary.uploader.destroy(image_id, (err) => {
        if (err) {
          console.error("Error deleting image:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        res.send({ removed, message: "Image deleted successfully!" });
      });
    });
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("HireMaster Server Running Successfully");
});

app.listen(port, () => {
  console.log(`HireMaster Server Running at Port ${port}`);
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
