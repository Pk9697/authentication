const dotenv=require('dotenv')
const express = require('express')
const mongoose = require('mongoose')

dotenv.config()
const app = express()
const PORT = process.env.PORT || 8000
const DB_NAME= 'session-based-authentication'

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
