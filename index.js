const dotenv = require('dotenv')
const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const User = require('./models/user.model.js')
const sendEmailVerificationMail = require('./utils/sendEmail.js')
const verifyJwt = require('./middlewares/auth.middleware.js')

dotenv.config()
const app = express()
const PORT = process.env.PORT || 8000
const DB_NAME = 'jwt-based-authentication'

/* GLOBAL MIDDLEWARES */
//parsing url encoded form data into json object and inserts it in req.body
app.use(express.urlencoded({ extended: true }))
//parsing json data into json object and inserts it in req.body
app.use(express.json())

app.use(cookieParser())

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

		const emailJwtToken = jwt.sign(email, process.env.SECRET_KEY)

		sendEmailVerificationMail(email, emailJwtToken)

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

app.get('/verify-email/:emailJwtToken', async (req, res) => {
	try {
		const { emailJwtToken } = req.params
		const email = jwt.verify(emailJwtToken, process.env.SECRET_KEY)
		await User.findOneAndUpdate({ email }, { isEmailVerified: true })
		return res.status(200).json({
			success: true,
			message: 'Email verified successfully',
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

		if (!existingUser.isEmailVerified) {
			return res.status(403).json({
				success: false,
				message:
					'Email not verified please check your email for verification link',
			})
		}

		const token = jwt.sign(userWithoutPassword, process.env.SECRET_KEY)

		return res
			.status(200)
			.cookie('token', token, { httpOnly: true, secure: true })
			.json({
				success: true,
				message: 'LoggedIn successfully',
				user: userWithoutPassword,
				token,
			})
	} catch (err) {
		console.error(err)
		return res.status(500).json({
			success: false,
			message: 'Internal Server error',
		})
	}
})

app.get('/dashboard', verifyJwt, (req, res) => {
	return res.status(200).json({
		success: true,
		message: 'Welcome to dashboard',
		user: req.user,
	})
})

mongoose
	.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
	.then((res) => {
		console.log('MongoDb connected', res.connection.name)
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
