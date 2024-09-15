const Access = require('../models/access.model')

const rateLimit = async (req, res, next) => {
	try {
		const sessionId = req.session.id
		const existingAccess = await Access.findOne({ sessionId })

		if (!existingAccess) {
			await Access.create({ sessionId })
			next()
			return
		}

		const currDate = Date.now()
		const secondsBetweenRequest =
            (currDate - Date.parse(existingAccess.updatedAt)) / 1000
        
		// applying 1hit/min
		if (secondsBetweenRequest <= 60) {
			return res.status(429).json({
				success: false,
				message: 'Too many requests. Please try again later',
			})
		}

		// ! alternative approach is not working for some reason
        // existingAccess.sessionId = sessionId

		existingAccess.updatedAt = currDate
		await existingAccess.save()

		next()
	} catch (error) {
		console.error(error)
		return res.status(500).json({
			success: false,
			message: 'Internal Server Error',
		})
	}
}

module.exports = rateLimit
