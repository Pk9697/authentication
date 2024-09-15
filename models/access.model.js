const mongoose = require('mongoose')
const { Schema } = mongoose

const accessSchema = new Schema(
	{
		sessionId: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
)

const Access = mongoose.model('Access', accessSchema)

module.exports = Access
