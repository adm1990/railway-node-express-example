const express = require("express");
const bodyParse = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3977;


app.use(bodyParse.urlencoded({extended:true}));
app.use(bodyParse.json());

app.get("/", (req,res) => {

res.status(200).send({msg:"Hola Tincode!"});
});


app.post("/welcome",(req,res) => {

const {username} = req.body;
res.status(200).send({msg: `Hola, ${username}`});

});

app.listen(PORT, () => {
console.log(`Tu server está listo en el puerto ${PORT}`);	

})

