const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");

const db = require('knex')({
  client: 'pg',
  connection: {
    connectionString : process.env.DATABASE_URL,
    ssl:true
  }
});



const app = express();

app.use(bodyParser.json());
app.use(cors());



app.get('/',(req,res)=>{
	res.json('connected');
})

app.post('/signin', (req,res)=>{
	db.select('email','hash').from('login')
	.where('email','=',req.body.email)
	.then(data => {
		const isValid = bcrypt.compareSync(req.body.password,data[0].hash);
		if(isValid){
			return db('users').select('*')
			.where('email','=',req.body.email)
			.then(user => {
				res.json(user[0])
			}).catch(err => res.status(400).json('signin failed'))
		}else{
			res.status(400).json('wrong credentials');
		}
	})
	.catch(err => res.status(400).json('wrong credentials'))
	})

app.post('/register', (req,res)=>{
	const {email,password,name} = req.body;
	const hash = bcrypt.hashSync(password);
	db.transaction(trx =>{
		trx.insert({
			hash:hash,
			email:email
		}).into('login')
		.returning('email')
		.then(logedEmail => {
			return trx('users').returning('*').insert({
				name:name,
				email: logedEmail[0],
				joined: new Date()
				}).then(user => {
					res.json(user[0]);
				})
				.then(trx.commit)
				.catch(trx.rollback)
		})
	}).catch(err => res.status(400).json('unable to register'))
	
})

app.get('/profile/:id',(req,res)=>{
	const {id} = req.params;
	let found = false;
	db.select('*').from('users').where({
		id:id
	}).then(user=>{
		if(user.length){
			res.json(user[0])
		}else{
			res.status(404).json('no such user');
		}
	}).catch(err=> res.status(404).json('error getting user'))
})

app.put('/image',(req,res)=>{
	const {id} = req.body;
	db('users').where('id','=',id)
	.increment('entries',1)
	.returning('entries')
	.then(entry => {
		res.json(entry[0]);
	}).catch(err=> res.status(400).json('error while updating'))

})
app.listen(process.env.PORT || 3000, ()=>{
	console.log(`this app runs smooth ${process.env.PORT}`);
})