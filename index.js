const dotenv = require('dotenv')
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const mongoDbSession = require('connect-mongodb-session')(session)

/* FILE IMPORTS */
const User = require('./models/user.model.js')
const verifyIsAuth = require('./middlewares/verifyIsAuth.js')

dotenv.config()
const app = express()
const PORT = process.env.PORT || 8000
const DB_NAME = 'session-based-authentication'
const MONGODB_URI = `${process.env.MONGODB_URI}/${DB_NAME}`
const store = new mongoDbSession({
	uri: MONGODB_URI,
	collection: 'sessions',
})
/* GLOBAL MIDDLEWARES */
//parsing url encoded form data into json object and inserts it in req.body
app.use(express.urlencoded({ extended: true }))
//parsing json data into json object and inserts it in req.body
app.use(express.json())

/* Config session in global middleware which will attach session object in req.session for every request 
	first it checks if in client cookie is present then decrypts it and the id stored in sessions collection in db,
	is matched with  this decrypted key ,if yes it attaches all the things stored in db with this id to req.session,
	else attaches session skeleton consisting of basic cookie object info
*/
app.use(
	session({
		secret: process.env.SESSION_SECRET_KEY,
		resave: false,
		saveUninitialized: false,
		store,
	})
)

app.get('/healthcheck', (req, res) => {
	return res.status(200).json({
		success: true,
		message: 'Server is up and running',
	})
})

app.post('/register', async (req, res) => {
	try {
		const { name, email, password } = req.body

		if (!name || !email || !password) {
			return res.status(400).json({
				success: false,
				message: 'Some Fields are not provided',
			})
		}

		const existingUser = await User.findOne({ email })
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: 'Email already exists',
			})
		}

		const user = await User.create({
			name,
			email,
			password,
		})

		const { password: userPassword, ...userWithoutPassword } = user._doc

		return res.status(201).json({
			success: true,
			message: 'User registered successfully',
			user: userWithoutPassword,
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({
			success: false,
			message: 'Internal Server error',
		})
	}
})

app.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: 'Some Fields are not provided',
			})
		}

		const existingUser = await User.findOne({ email }).select('+password')
		if (!existingUser) {
			return res.status(401).json({
				success: false,
				message: 'User not found',
			})
		}

		const { password: userPassword, ...userWithoutPassword } = existingUser._doc

		if (userPassword !== password) {
			return res.status(401).json({
				success: false,
				message: 'Password wrong',
			})
		}

		/* Instead of creating a new Schema for Session and then using it to store isAuth and user field in a new document
			we use a simple hack here, where if something is changed in session object , express-session will look in db, if id 
			is not found then will create a document with these key:value pairs , encrypts the id of this created document
			and store in client's cookies automatically
		*/

		req.session.isAuth = true
		req.session.user = userWithoutPassword

		return res.status(200).json({
			success: true,
			message: 'LoggedIn successfully',
			user: userWithoutPassword,
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({
			success: false,
			message: 'Internal Server error',
		})
	}
})

app.get('/dashboard', verifyIsAuth, (req, res) => {
	console.log(req.session)

	return res.status(200).json({
		success: true,
		message: 'In Dashboard page',
	})
})

app.get('/logout', verifyIsAuth, (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.error(err)
			return res.status(500).json({
				success: false,
				message: 'Internal Server error',
			})
		}
		return res.status(200).json({
			success: true,
			message: 'LoggedOut successfully',
		})
	})
})

mongoose
	.connect(MONGODB_URI)
	.then((connectionInstance) => {
		console.log('MongoDb connected :', connectionInstance.connections[0].name)
		app.listen(PORT, (err) => {
			if (err) {
				console.error(err)
				process.exit(1)
			}
			console.log(`Server is listening on port:${PORT}`)
		})
	})
	.catch((err) => {
		if (err) {
			console.error(err)
			process.exit(1)
		}
	})
