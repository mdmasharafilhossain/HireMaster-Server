const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());





app.get('/',(req,res)=>{
    res.send('Server Running Successfully');
});

app.listen(port,()=>{
    console.log(`Server Running at Port ${port}`)
});