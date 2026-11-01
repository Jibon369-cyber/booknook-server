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


app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
    
})