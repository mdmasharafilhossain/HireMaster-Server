const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lzichn4.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const UsersProfileCollection = client.db('HireMaster').collection('UsersProfile');
    const jobCollection = client.db('HireMaster').collection('jobData')
    const staticCollection = client.db('HireMaster').collection('JobPost')

    //  UserProfileCollection

    app.post('/userProfile', async (req, res) => {
      const feedbacks = req.body;
      const result = await UsersProfileCollection.insertOne(feedbacks);
      res.send(result);
    });

    app.get('/userProfile', async (req, res) => {
      const result = await UsersProfileCollection.find().toArray();
      res.send(result);
    });

    app.post("/jobpost", async (req, res) => {
      const job = req.body
      const result = await jobCollection.insertOne(job)
      res.send(result)
    })

    app.get('/jobpost', async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })



    app.get('/staticjobpost', async (req, res) => {
      const cursor = staticCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('HireMaster Server Running Successfully');
});

app.listen(port, () => {
  console.log(`HireMaster Server Running at Port ${port}`)
});