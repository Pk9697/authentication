const dotenv = require('dotenv')
const express = require('express')
const mongoose = require('mongoose')
const User = require('./models/user.model.js')

dotenv.config()
const app = express()
const PORT = process.env.PORT || 8000
const DB_NAME = 'session-based-authentication'

/* GLOBAL MIDDLEWARES */
//parsing url encoded form data into json object and inserts it in req.body
app.use(express.urlencoded({ extended: true }))
//parsing json data into json object and inserts it in req.body
app.use(express.json())

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

		return res.status(201).json({
			success: true,
			message: 'User registered successfully',
			user,
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

		const existingUser = await User.findOne({ email })
		if (!existingUser) {
			return res.status(401).json({
				success: false,
				message: 'User not found',
			})
		}

		if (existingUser.password !== password) {
			return res.status(401).json({
				success: false,
				message: 'Password wrong',
			})
		}

		return res.status(200).json({
			success: true,
			message: 'LoggedIn successfully',
			user: existingUser,
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({
			success: false,
			message: 'Internal Server error',
		})
	}
})

mongoose
	.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
	.then(() => {
		console.log('MongoDb connected')
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
