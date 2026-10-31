import express from 'express';

const app = express()
const PORT = process.env.PORT || 9000;

app.get('/', (req, res) => {
    res.send({message: 'Server is Running Fine'});
})


app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
    
})