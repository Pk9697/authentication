const jwt = require('jsonwebtoken')

const verifyJwt = async (req, res, next) => {
	try {
		const token =
			req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '')

		if (!token) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			})
		}

		const user = jwt.verify(token, process.env.SECRET_KEY)
		req.user = user
		next()
	} catch (err) {
		console.error(err)
		return res.status(500).json({
			success: false,
			message: 'Internal Server error',
		})
	}
}

module.exports = verifyJwt
