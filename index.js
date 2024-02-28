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

const client_URL = "http://localhost:5173";
const server_URL = "http://localhost:5000";

// const client_URL = "https://hiremaster.netlify.app";
// const server_URL = "https://hire-master-server.vercel.app";

// middleware
app.use(
  cors({
    origin: [
      client_URL,
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use(express.json({ extended: true, limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

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

    const ManagersProfileCollection = client
      .db("HireMaster")
      .collection("ManagersProfile");

    const jobCollection = client.db("HireMaster").collection("jobData");

    const appliedJobCollection = client
      .db("HireMaster")
      .collection("AppliedJob");

    const staticCollection = client.db("HireMaster").collection("JobPost");

    const hiringTalentCollection = client
      .db("HireMaster")
      .collection("HiringTalent");

    const userCollection = client.db("HireMaster").collection("Users");
    const UserPaymentCollection = client
      .db("HireMaster")
      .collection("Payments");
    const subscriberCollection = client
      .db("HireMaster")
      .collection("Subscribers");
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
    //  ---------UserProfileCollection------------

    app.post("/userProfile", async (req, res) => {
      const feedbacks = req.body;
      const result = await UsersProfileCollection.insertOne(feedbacks);
      res.send(result);
    });

    app.get("/userProfile", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await UsersProfileCollection.find(query).toArray();
      res.send(result);
    });

    // app.get("/userProfile/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const query = {
    //     email: email,
    //   };
    //   const result = await UsersProfileCollection.findOne(query);
    //   res.send(result);
    // });

    app.post("/jobpost", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });
    app.get("/userProfile/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };
      const result = await UsersProfileCollection.findOne(query);
      res.send(result);
    });

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

    app.get("/managerProfile/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };
      const result = await ManagersProfileCollection.findOne(query);
      res.send(result);
    });

    // ---------------Jobs Section-------------------
    app.post("/jobpost", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    //----------------------Applied Jobs--------------------
    app.post("/users-appliedjobs", async (req, res) => {
      const appliedJob = req.body;
      console.log(appliedJob);
      const userEmail = appliedJob.email;
      const jobId = appliedJob.job_id;
      const existingApplication = await appliedJobCollection.findOne({
        email: userEmail,
        job_id: jobId,
      });

      if (existingApplication) {
        console.log("here");
        return res.send({
          message: "Already applied.",
          insertedId: null,
        });
      }

      const result = await appliedJobCollection.insertOne(appliedJob);
      res.send(result);
    });

    // ------------------Show Applied Jobs-----------------

    app.get("/showapplied-jobs", logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log("token owner info", req.cookies.token);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await appliedJobCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/showapplied-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };
      try {
        const result = await appliedJobCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting application:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // app.get("/applied-jobs-from-manager/:email", async (req, res) => {
    //   const email = req.params.email;
    //   console.log(email);
    //   const query = { hiring_manager_email: email };
    //   const result = await appliedJobCollection.find(query).toArray();
    //   res.send(result);
    // });

    app.get("/notifications/:email", async (req, res) => {
      const email = req.params.email;
      const applications = await appliedJobCollection
        .find({ hiring_manager_email: email })
        .toArray();
      res.send(applications);
    });

    app.get("/singleappliedjobs/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await appliedJobCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/jobpost", async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // app.get("/staticjobpost", async (req, res) => {
    //   const cursor = staticCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });
    app.get("/staticjobpost", async (req, res) => {
      const cursor = staticCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/staticjobpost/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await staticCollection.findOne(query);
      res.send(result);
    });

    app.get("/staticjobpost/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { hiring_manager_email: email };
      const result = await staticCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/staticjobpost", async (req, res) => {
      const { job_title, job_time, salaryRange } = req.query;
      // console.log("Query parameters:", req.query);
      const filter = {};

      if (job_title) {
        filter.job_title = { $regex: new RegExp(job_title, "i") };
      }
      if (job_time && job_time.length > 0) {
        filter.job_time = { $in: job_time };
      }
      if (salaryRange) {
        const [minSalary, maxSalary] = salaryRange.split("-").map(Number);
        filter.salary = { $gte: minSalary, $lte: maxSalary };
      }
      // console.log("Applied filters:", filter);
      const cursor = staticCollection.find(filter);
      const result = await cursor.toArray();
      if (result.length === 0) {
        res.status(200).json({
          message:
            "No jobs found matching your criteria. Please try with different criteria.",
        });
      } else {
        res.send(result);
      }
    });
    // --------------User Profile------------------

    app.patch("/UsersProfile/education/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          educationInstitute: item.educationInstitute,
          degree: item.degree,
          studyField: item.studyField,
          educationStartMonth: item.educationStartMonth,
          educationStartYear: item.educationStartYear,
          educationEndMonth: item.educationEndMonth,
          educationEndYear: item.educationEndYear,
          educationDescription: item.educationDescription,
        },
      };
      const result = await UsersProfileCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/UsersProfile/profileHead/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          UniversityName: item.UniversityName,
          headline: item.headline,
          location: item.location,
          linkedin: item.linkedin,
          portfolio: item.portfolio,
          github: item.github,
          aboutDescription: item.aboutDescription,
        },
      };
      const result = await UsersProfileCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/UsersProfile/photo/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          photo: item.photo,
        },
      };
      const result = await UsersProfileCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/UsersProfile/projects/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          projectName: item.projectName,
          projectLink: item.projectLink,
          technologies: item.technologies,
          projectStartMonth: item.projectStartMonth,
          projectStartYear: item.projectStartYear,
          projectEndMonth: item.projectEndMonth,
          projectEndYear: item.projectEndYear,
          projectDescription: item.projectDescription,
        },
      };
      const result = await UsersProfileCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/UsersProfile/experience/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          jobTitle: item.jobTitle,
          jobType: item.jobType,
          JobType: item.JobType,
          companyName: item.companyName,
          jobLocation: item.jobLocation,
          jobStartMonth: item.jobStartMonth,
          jobStartYear: item.jobStartYear,
          jobEndMonth: item.jobEndMonth,
          jobEndYear: item.jobEndYear,
          jobDescription: item.jobDescription,
        },
      };
      const result = await UsersProfileCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ status: "user already exists" });
      }
      res.send(await userCollection.insertOne(user));
      // console.log(user);
    });

    app.post("/subscribers", async (req, res) => {
      const subscriber = req.body;
      const query = { email: subscriber.email };
      const isExist = await subscriberCollection.findOne(query);
      if (isExist) {
        return res.send({ status: "subscriber already exists" });
      }
      res.send(await subscriberCollection.insertOne(subscriber));
      // console.log(user);
    });

    //
    //
    //
    // tech news routes
    //
    app.post("/tech-news", async (req, res) => {
      const newsData = req.body;
      const slug = slugify(req.body.title);

      const isExisting = await newsCollection.findOne({ slug });
      if (isExisting) {
        return res.status(400).send({ error: "News title must be unique" });
      }
      newsData.slug = slug.toLowerCase();
      try {
        const result = await newsCollection.insertOne(newsData);
        res.json(result);
      } catch (error) {
        console.error("Error inserting news:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/tech-news", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 2;
      const skip = (page - 1) * limit;
      const news = await newsCollection
        .find({})
        .skip(skip)
        .limit(limit)
        .toArray();
      const totalNewsCount = await newsCollection.countDocuments();
      res.json({
        news,
        totalNewsCount,
        currentPage: page,
        itemsPerPage: limit,
      });
    });

    app.get("/tech-news/:slug", async (req, res) => {
      const slug = req.params.slug;
      // console.log(slug);
      try {
        const result = await newsCollection.findOne({ slug });
        if (result) {
          res.json(result);
        } else {
          res.status(404).send({ error: "News not found" });
        }
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.delete("/tech-news/:slug", async (req, res) => {
      const slug = req.params.slug;
      try {
        const result = await newsCollection.findOneAndDelete({ slug });
        if (result) res.json(result);
        else {
          res.status(404).send({ error: "News not found" });
        }
      } catch (error) {
        console.error("Error inserting news:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.patch("/tech-news/:slug", async (req, res) => {
      const slug = req.params.slug;
      const newSlug = slugify(req.body.title);
      const newNews = req.body;
      newNews.slug = newSlug.toLowerCase();

      try {
        const result = await newsCollection.findOneAndUpdate(
          {
            slug,
          },
          { $set: newNews }
        );
        if (result) res.json(result);
        else {
          res.status(404).send({ error: "News not found" });
        }
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.post("/hiring-talents", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await hiringTalentCollection.findOne(query);
      if (isExist) {
        return res.send({ status: "user already exists" });
      }
      res.send(await hiringTalentCollection.insertOne(user));
      // console.log(user);
    });

    app.get("/subscribers", async (req, res) => {
      res.json(await subscriberCollection.find({}).toArray());
    });

    //--------------Pagination on Hiring Manager List----------------
    app.get("/hiring-talents", async (req, res) => {
      const result = await hiringTalentCollection.find().toArray();
      res.send(result);
    });
    app.get("/hiring-talents/pagination", async (req, res) => {
      const query = req.query;
      const page = query.page;
      console.log(page);
      const pageNumber = parseInt(page);
      const perPage = 4;
      const skip = pageNumber * perPage;
      const users = hiringTalentCollection.find().skip(skip).limit(perPage);
      const result = await users.toArray();
      const UsersCount = await hiringTalentCollection.countDocuments();
      res.send({ result, UsersCount });
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

    app.post("/job-fair/events", async (req, res) => {
      const event = req.body;
      const slug = slugify(req.body.title);
      const isExisting = await jobFairEventCollection.findOne({ slug });
      if (isExisting) {
        return res.status(400).send({ error: "Event title must be unique" });
      }
      event.slug = slug.toLowerCase();
      try {
        res.json(await jobFairEventCollection.insertOne(event));
      } catch (error) {
        console.error("Error inserting event:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/job-fair/events", async (req, res) => {
      res.json(await jobFairEventCollection.find({}).toArray());
    });

    app.get("/job-fair/events/:slug", async (req, res) => {
      const slug = req.params.slug;
      // console.log(slug);
      try {
        const result = await jobFairEventCollection.findOne({ slug });
        if (result) {
          res.json(result);
        } else {
          res.status(404).send({ error: "Event not found" });
        }
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/job-fair/profile/sponsor-event/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const result = await jobFairEventCollection
          .find({
            sponsor_email: email,
          })
          .toArray();
        res.json(result);
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.delete("/job-fair/profile/sponsor-event/:slug", async (req, res) => {
      const slug = req.params.slug;

      try {
        const result = await jobFairEventCollection.findOneAndDelete({ slug });
        // if (result.deletedCount > 0) res.json(result);
        if (result) res.json(result);
        else {
          res.status(404).send({ error: "Event not removed." });
        }
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.patch(
      "/job-fair/profile/sponsor-event/update/:slug",
      async (req, res) => {
        const slug = req.params.slug;
        const newSlug = slugify(req.body.title);
        const newEvent = req.body;
        newEvent.slug = newSlug.toLowerCase();

        try {
          const result = await jobFairEventCollection.findOneAndUpdate(
            {
              slug,
            },
            { $set: newEvent }
          );
          if (result) res.json(result);
          else {
            res.status(404).send({ error: "Event not found" });
          }
        } catch (error) {
          res.status(500).send({ error: "Internal Server Error" });
        }
      }
    );

    //
    //
    // fair event bookings
    //
    //

    app.post("/job-fair/event-bookings", async (req, res) => {
      const { slug, email } = req.body;

      try {
        const existingBooking = await jobFairEventBookingCollection.findOne({
          slug: slug,
          email: email,
        });
        if (existingBooking) {
          return res
            .status(400)
            .json({ message: "You have already booked this event." });
        }
        const newBooking = { slug: slug, email: email };
        const result = await jobFairEventBookingCollection.insertOne(
          newBooking
        );
        res.status(201).json({ result, message: "Event booked successfully." });
      } catch (error) {
        console.error("Error booking event:", error);
        res.status(500).json({ message: "Failed to book event." });
      }
    });

    app.get("/job-fair/event-bookings", async (req, res) => {
      res.json(await jobFairEventBookingCollection.find({}).toArray());
    });

    app.get("/job-fair/job-seeker/event-bookings", async (req, res) => {
      const { email } = req.query;
      try {
        const bookings = await jobFairEventBookingCollection
          .find({ email: email })
          .toArray();
        let events = [];
        for (const booking of bookings) {
          const event = await jobFairEventCollection.findOne({
            slug: booking.slug,
          });

          events.push(event);
        }
        res.json(events);
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get("/job-fair/sponsor-event-bookings", async (req, res) => {
      const { email } = req.query;
      try {
        const events = await jobFairEventCollection
          .find({
            sponsor_email: email,
          })
          .toArray();

        let bookedEvents = [];

        for (const event of events) {
          const bookings = await jobFairEventBookingCollection.findOne({
            slug: event.slug,
          });

          if (bookings) {
            bookedEvents.push(bookings);
          }
        }
        res.json(bookedEvents);
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.delete(
      "/job-fair/job-seeker/event-bookings/remove",
      async (req, res) => {
        const { slug, email } = req.body;
        // console.log(slug, email);
        // console.log(req.body);
        try {
          const result = await jobFairEventBookingCollection.deleteOne({
            slug: slug,
            email: email,
          });
          if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Booking not found." });
          }
          res.json(result);
        } catch (error) {
          res.status(500).json({ message: "Internal Server Error" });
        }
      }
    );

    app.post("/job-fair/interested-events", async (req, res) => {
      const { slug, email } = req.body;

      try {
        const existingInterest = await jobFairInterestedEventCollection.findOne(
          {
            slug: slug,
            email: email,
          }
        );
        if (existingInterest) {
          return res.status(400).json({
            message: "You have already added this event as interested.",
          });
        }
        const newInterest = { slug: slug, email: email };
        const result = await jobFairInterestedEventCollection.insertOne(
          newInterest
        );
        res
          .status(201)
          .json({ result, message: "Added to interested event successfully." });
      } catch (error) {
        res.status(500).json({ message: "Failed to add event as interested." });
      }
    });

    app.get("/job-fair/interested-events", async (req, res) => {
      res.json(await jobFairInterestedEventCollection.find({}).toArray());
    });

    app.get("/job-fair/job-seeker/interested-events", async (req, res) => {
      const { email } = req.query;
      // console.log(email);
      try {
        const interests = await jobFairInterestedEventCollection
          .find({ email: email })
          .toArray();
        // console.log(interests);
        let interestedEvents = [];
        for (const interest of interests) {
          const event = await jobFairEventCollection.findOne({
            slug: interest.slug,
          });

          interestedEvents.push(event);
        }
        res.json(interestedEvents);
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.delete(
      "/job-fair/job-seeker/interested-events/remove",
      async (req, res) => {
        const { slug, email } = req.body;
        // console.log(slug, email);
        // console.log(req.body);
        try {
          const result = await jobFairInterestedEventCollection.deleteOne({
            slug: slug,
            email: email,
          });
          if (result.deletedCount === 0) {
            return res
              .status(404)
              .json({ message: "Interested event not found." });
          }
          res.json(result);
        } catch (error) {
          res.status(500).json({ message: "Internal Server Error" });
        }
      }
    );

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
      const perPage = 4;
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
    app.delete("/users/JobSeeker/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/hiring-talents", async (req, res) => {
      const hirer = req.body;
      // console.log(hirer);
      const result = await hiringTalentCollection.insertOne(hirer);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      res.json(await userCollection.find({}).toArray());
    });
    app.get("/hiring-talents", async (req, res) => {
      res.json(await hiringTalentCollection.find({}).toArray());
    });

    app.post("/fair-registration", async (req, res) => {
      const register = req.body;
      const query = { email: register.email };
      const isRegistered = await jobFairUserCollection.findOne(query);

      try {
        if (isRegistered) {
          return res.send({ status: " Already registered." });
        }
        const result = await jobFairUserCollection.insertOne(register);
        if (result) res.json(result);
        else {
          res.status(404).send({ error: "News not found" });
        }
      } catch (error) {
        console.error("Error inserting news:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/fair-registration", async (req, res) => {
      res.json(await jobFairUserCollection.find({}).toArray());
    });

    // ---------------------- Admin Dashboard ------------------------

    // --------------------SSL PAYMENT-------------------

    const tran_id = new ObjectId().toString();
    app.post("/buy-premium", async (req, res) => {
      const data = {
        total_amount: req.body.amount,
        currency: "BDT",
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `${server_URL}/payment-success/${tran_id}`,
        fail_url: `${server_URL}/${tran_id}`,
        cancel_url: `${server_URL}/cancel`,
        ipn_url: `${server_URL}/ipn`,
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: req.body.email,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      console.log(data);
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });

        const finalPayment = {
          email: req.body.email,
          name: req.body.name,
          price: req.body.amount,
          date: new Date(),
          transaction_ID: tran_id,
          paidStatus: false,
        };
        const result = UserPaymentCollection.insertOne(finalPayment);
        console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/payment-success/:tranId", async (req, res) => {
        console.log(req.params.tranId);
        const result = await UserPaymentCollection.updateOne(
          { transaction_ID: req.params.tranId },
          {
            $set: {
              paidStatus: true,
            },
          }
        );
        if (result.modifiedCount > 0) {
          res.redirect(
            `${client_URL}/payment-success/${req.params.tranId}`
          );
        }
      });

      app.post("/payment-fail/:tranId", async (req, res) => {
        const result = await UserPaymentCollection.deleteOne({
          transaction_ID: req.params.tranId,
        });
        if (result.deletedCount > 0) {
          res.redirect(
            `${client_URL}/payment-fail/${req.params.tranId}`
          );
        }
      });
    });

    // ------------------Stripe Payment--------------------

    //Payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/payments", async (req, res) => {
      const result = await UserPaymentCollection.find().toArray();
      res.send(result);
    });
    // pagination added in Premium User list
    app.get("/payments/pagination", async (req, res) => {
      const query = req.query;
      const page = query.page;
      console.log(page);
      const pageNumber = parseInt(page);
      const perPage = 4;
      const skip = pageNumber * perPage;
      const users = UserPaymentCollection.find().skip(skip).limit(perPage);
      const result = await users.toArray();
      const UsersCount = await UserPaymentCollection.countDocuments();
      res.send({ result, UsersCount });
    });

    app.get("/payments", async (req, res) => {
      const cursor = UserPaymentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = UserPaymentCollection.insertOne(payment);
      res.send(paymentResult);
    });

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
    exports.upload = async (req, res) => {
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
    };

    exports.remove = (req, res) => {
      const removed = req.body;
      const image_id = req.body.public_id;
      cloudinary.uploader.destroy(image_id, (err) => {
        if (err) {
          console.error("Error deleting image:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        res.send({ removed, message: "Image deleted successfully!" });
      });
    };

    app.post("/profile/imageUpload", exports.upload);
    app.post("/profile/imageRemove", exports.remove);
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
