const mongoose = require('mongoose')
const { Schema, model } = mongoose

const todoSchema = new Schema(
	{
		todo: {
			type: String,
			required: true,
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
		deletionTimestamp: {
			type: Date,
		},
	},
	{
		timestamps: true,
	}
)

const Todo = model('Todo', todoSchema)
module.exports = Todo
