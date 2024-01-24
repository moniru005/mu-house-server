const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mumbaicluster.krljslb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("muHouse").collection("users");
    const houseCollection = client.db("muHouse").collection("houses");

    //jwt API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });
      res.send({ token });
    });

    //middleware
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // users API
    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/owner/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let owner = false;
      let isRenter = false;
      if (user) {
        owner = user?.role === "owner";
        isRenter = user?.role === "renter";
      }
      res.send({ owner, isRenter });
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Houses API
    app.post("/houses", async (req, res) => {
      const house = req.body;
      const result = await houseCollection.insertOne(house);
      res.send(result);
    });

    app.get("/houses", async (req, res) => {
      let queryObj = {};
      let sortObj = {};

      const city = req.query.city;
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder;

      if (city) {
        queryObj.city = city;
      }

      if (sortField && sortOrder) {
        sortObj[sortField] = sortOrder;
      }

      const result = await houseCollection.find(queryObj).sort(sortObj).toArray();
      res.send(result);
    });

    app.get("/houses/:id", gateman, async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = houseCollection.findOne(query);
      res.send(result);
    });

    app.delete("/houses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await houseCollection.deleteOne(query);
      res.send(result);
    });

    //Update to house
    app.patch("/houses/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          address: item.address,
          city: item.city,
          bedroom: item.bedroom,
          bathroom: item.bathroom,
          roomSize: item.roomSize,
          rent: item.rent,
          available: item.available,
          phone: item.phone,
          description: item.description,
          image:item.image,
        },
      };
      const result = await houseCollection.updateOne(filter, updatedDoc);
      res.send(result);
      console.log(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
  res.send("House Hunter is running");
});

app.listen(port, () => {
  console.log(`House Hunter is running in the port on: ${port}`);
});
