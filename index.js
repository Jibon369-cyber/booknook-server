import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";

// ----- App setup -----
const app = express();
const PORT = process.env.PORT || 9000;
const JWKS = process.env.JWKS_URI
  ? createRemoteJWKSet(new URL(process.env.JWKS_URI))
  : null;

app.use(cors());
app.use(express.json());

// ------ Verify Token function -------
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  if (!JWKS) {
    console.error("JWT verification is not configured: JWKS_URI is missing");
    return res.status(500).send({ message: "Authentication is not configured" });
  }

  try {
    const { payload } = await jwtVerify(match[1], JWKS);
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return res.status(401).send({ message: "Unauthorized" });
    }
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    console.error("JWT verification failed", error);
    return res.status(401).send({ message: "Unauthorized" });
  }
};

// ----- MongoDB connection -----
const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("booknook");

// Collections
const booksCollection = db.collection("books"); // all books
const borrowsCollection = db.collection("borrows"); // borrow records

// ----- Health check -----
app.get("/", (req, res) => {
  res.send({ message: "Server is Running Fine" });
});

// ----- Books: create -----
app.post("/add-book", verifyToken, (req, res) => {
  const data = { ...req.body, addedBy: req.user.email };
  const result = booksCollection.insertOne(data);
  res.send(result);
});

// ----- Books: read all -----
app.get("/all-books", async (req, res) => {
  const allBooks = await booksCollection.find().toArray();
  res.send(allBooks);
});

// ----- Books: read one book details-----
app.get("/book/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const book = await booksCollection.findOne({ _id: new ObjectId(id) });
  res.send(book);
});

// ----- My Books: books added by a specific user -----
app.get("/my-books", verifyToken, async (req, res) => {
  const books = await booksCollection.find({ addedBy: req.user.email }).toArray();
  res.send(books);
});

// ----- Books: update -----
app.patch("/update-book/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const { _id, ...updateData } = req.body;
  const result = await booksCollection.updateOne(
    { _id: new ObjectId(id), addedBy: req.user.email },
    { $set: updateData },
  );
  res.send(result);
});

// ----- Books: delete -----
app.delete("/delete-book/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const result = await booksCollection.deleteOne({
    _id: new ObjectId(id),
    addedBy: req.user.email,
  });
  res.send(result);
});

// ----- Borrow: create a borrow record and decrement availableCopies -----
app.post("/borrow", verifyToken, async (req, res) => {
  const data = { ...req.body, userEmail: req.user.email };
  const result = await borrowsCollection.insertOne(data);
  if (data.bookId) {
    await booksCollection.updateOne(
      { _id: new ObjectId(data.bookId) },
      { $inc: { availableCopies: -1 } },
    );
  }
  res.send(result);
});

// ----- My Borrows: borrow records for a specific user -----
app.get("/my-borrows", verifyToken, async (req, res) => {
  const borrows = await borrowsCollection.find({ userEmail: req.user.email }).toArray();
  res.send(borrows);
});

// ----- Return: delete borrow record and increment availableCopies -----
app.delete("/return-book/:id", verifyToken, async (req, res) => {
  const borrow = await borrowsCollection.findOne({
    _id: new ObjectId(req.params.id),
    userEmail: req.user.email,
  });
  if (!borrow) {
    return res.status(404).send({ message: "Borrow record not found" });
  }
  await borrowsCollection.deleteOne({
    _id: new ObjectId(req.params.id),
    userEmail: req.user.email,
  });
  if (borrow?.bookId) {
    await booksCollection.updateOne(
      { _id: new ObjectId(borrow.bookId) },
      { $inc: { availableCopies: 1 } },
    );
  }
  res.json({ ok: true });
});

// ----- Start server -----
app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});


export default app;
