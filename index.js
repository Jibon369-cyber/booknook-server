import express from 'express';
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from 'cors'



const app = express()
const PORT = process.env.PORT || 9000;


app.use(cors());
app.use(express.json());



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

const db = mongoClient.db('booknook')

const booksCollection = db.collection('books')
const borrowsCollection = db.collection("borrows");



app.get('/', (req, res) => {
    res.send({message: 'Server is Running Fine'});
})


app.post('/add-book', (req, res) => {
    const data = req.body
    
    const result = booksCollection.insertOne(data)
    
    res.send(result)
})


app.get('/all-books', async(req, res) => {
    const allBooks = await booksCollection.find().toArray();
    res.send(allBooks);
})


app.get('/book/:id', async(req, res) => {
    const id = req.params.id;
    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    res.send(book);
})


app.get("/my-books", async (req, res) => {
  const email = req.query.email;
  const filter = email ? { addedBy: email } : {};
  const books = await booksCollection.find(filter).toArray();
  res.send(books);
});


app.patch("/update-book/:id", async (req, res) => {
  const id = req.params.id;
  const { _id, ...updateData } = req.body;
  const result = await booksCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData },
  );
  res.send(result);
});


app.delete("/delete-book/:id", async (req, res) => {
  const id = req.params.id;
  const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});


app.post("/borrow", async (req, res) => {
  const data = req.body;
  const result = await borrowsCollection.insertOne(data);
  res.send(result);
});

app.get("/my-borrows", async (req, res) => {
    const email = req.query.email;
    const borrows = await borrowsCollection.find({ userEmail: email }).toArray();
    res.send(borrows);
});


app.delete("/return-book/:id", async (req, res) => {
  await db
    .collection("borrows")
    .deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
});


app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
    
})