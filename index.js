const dotenv = require('dotenv')
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const mongoDbSession = require('connect-mongodb-session')(session)
const cron = require('node-cron')

/* FILE IMPORTS */
const User = require('./models/user.model.js')
const verifyIsAuth = require('./middlewares/verifyIsAuth.js')
const rateLimit = require('./middlewares/rateLimit.js')
const Todo = require('./models/todo.model.js')

dotenv.config()
const app = express()
const PORT = process.env.PORT || 8000
const DB_NAME = 'session-based-authentication'
const MONGODB_URI = `${process.env.MONGODB_URI}/${DB_NAME}`
const store = new mongoDbSession({
	uri: MONGODB_URI,
	collection: 'sessions',
})
const task = cron.schedule(
	'* * 0 * * *',
	async () => {
		console.log('running a task at 12 am everyday')
		// const deletedTodos = await Todo.deleteMany({ isDeleted: true })
		// console.log(deletedTodos)

		const todos = await Todo.find({
			isDeleted: true,
		})

		const currTime = Date.now()
		// deleting todos older than 30 days
		const deletedTodos = todos
			.filter((todo) => {
				const daysElapsed = Math.floor(
					(currTime - todo.deletionTimestamp.getTime()) / (1000 * 60 * 60 * 24)
				)
				// console.log(todo.deletionTimestamp.toLocaleTimeString(), daysElapsed)
				return daysElapsed > 30
			})
			.map((todo) => todo._id)

		const ack = await Todo.deleteMany({ _id: { $in: deletedTodos } })
		console.log(ack)
	},
	{
		scheduled: false,
		timezone: 'Asia/Kolkata',
	}
)

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

// Rate Limiting is generally applied to post requests only
// https://expressjs.com/en/guide/routing.html#rate-limiting

app.get('/dashboard', verifyIsAuth, rateLimit, (req, res) => {
	// console.log(req.session)

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

app.use('/todo', verifyIsAuth)

app.get('/todo/', async (req, res) => {
	try {
		const todos = await Todo.find({ isDeleted: false })

		return res.status(200).json({
			success: true,
			message: 'Todos fetched successfully',
			todos,
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({
			success: false,
			message: 'Internal Server error',
		})
	}
})

app.post('/todo/create', async (req, res) => {
	try {
		const { todo } = req.body

		if (!todo || !todo.trim() || typeof todo !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Some Fields are not provided',
			})
		}

		const newTodo = await Todo.create({
			todo,
			owner: req.session.user._id,
		})

		return res.status(201).json({
			success: true,
			message: 'Todo created successfully',
			todo: newTodo,
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({
			success: false,
			message: 'Internal Server error',
		})
	}
})

app.delete('/todo/delete/:id', async (req, res) => {
	try {
		const { id } = req.params

		if (!id || !id.trim() || typeof id !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Some Fields are not provided',
			})
		}

		const existingTodo = await Todo.findById(id)

		if (!existingTodo) {
			return res.status(404).json({
				success: false,
				message: 'Todo not found',
			})
		}

		// if (existingTodo.owner.toString() !== req.session.user._id.toString()) {
		// 	return res.status(403).json({
		// 		success: false,
		// 		message: 'You are not authorized to delete this todo',
		// 	})
		// }

		if (!existingTodo.owner.equals(req.session.user._id)) {
			return res.status(403).json({
				success: false,
				message: 'You are not authorized to delete this todo',
			})
		}

		existingTodo.isDeleted = true
		existingTodo.deletionTimestamp = new Date()
		await existingTodo.save()

		// const deletedTodo = await Todo.findByIdAndDelete(id)

		return res.status(200).json({
			success: true,
			message: 'Todo deleted successfully',
			todo: existingTodo,
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
	.connect(MONGODB_URI)
	.then((connectionInstance) => {
		console.log('MongoDb connected :', connectionInstance.connections[0].name)
		app.listen(PORT, (err) => {
			if (err) {
				task.stop()
				console.error(err)
				process.exit(1)
			}
			console.log(`Server is listening on port:${PORT}`)
			task.start()
		})
	})
	.catch((err) => {
		if (err) {
			task.stop()
			console.error(err)
			process.exit(1)
		}
	})
