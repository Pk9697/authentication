const nodemailer = require('nodemailer')

const sendEmailVerificationMail = (email, emailJwtToken) => {
	const transporter = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 465,
		secure: true,
		service: 'gmail',
		auth: {
			user: process.env.NODEMAILER_EMAIL,
			pass: process.env.NODEMAILER_PASSWORD,
		},
	})

	var mailOptions = {
		from: process.env.NODEMAILER_EMAIL,
		to: email,
		subject: 'Email Verification',
		text: 'Please verify your email',
		html: `<h1>Please verify your email</h1>
            <p>Click on the link below to verify your email</p>
            <a href="http://localhost:5000/verify-email/${emailJwtToken}">Verify Email</a>`,
	}

	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error)
		} else {
			console.log('Email sent: ' + info.response)
		}
	})
}

module.exports = sendEmailVerificationMail
