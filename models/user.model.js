const mongoose = require('mongoose')
const { Schema } = mongoose

// Schema Creates a structure or blueprint for each document in a collection (User),
// so that every field of the document is uniform
// same as we create class to give structure or blueprint to each instance of an object of this class

const userSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
)

// to apply crud operations or perform a query on db we need to build Model from Schema
// where 1st argument we provide is the ModelName which would be stored in db as collection 'users'

const User = mongoose.model('User', userSchema)

module.exports = User
