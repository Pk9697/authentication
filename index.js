const dotenv = require('dotenv')
const mongoose = require('mongoose')
const http = require('http')
const fs = require('fs')

dotenv.config()
const server = http.createServer()
const PORT = process.env.PORT || 8000
const DB_NAME = 'session-based-authentication'

server.on('request', (req, res) => {
	console.log(req.url, req.method)
	if (req.method === 'GET' && req.url === '/file') {
		fs.readFile('./file.txt', (err, data) => {
			if (err) {
				console.error(err)
				return res.end(err)
			}
			// console.log(data)
			return res.end(data)
		})
	} else if (req.method === 'GET' && req.url === '/form') {
		fs.readFile('./form.html', (err, data) => {
			if (err) {
				console.error(err)
				return res.end(err)
			}
			// console.log(data)
			return res.end(data)
		})
	} else if (req.method === 'GET' && req.url === '/write') {
		const data = 'overwritten file'
		fs.writeFile('./file.txt', data, (err) => {
			if (err) {
				console.error(err)
				return res.end(err)
			}
			return res.end(data)
		})
	} else if (req.method === 'GET' && req.url === '/append') {
		const data = 'append some data'
		fs.appendFile('./file.txt', data, (err) => {
			if (err) {
				console.error(err)
				return res.end(err)
			}
			return res.end(data)
		})
	} else if (req.method === 'GET' && req.url === '/rename') {
		// newFile is created then copied from file.txt and file.txt is deleted
		fs.rename('./file.txt', './newFile.txt', (err) => {
			if (err) {
				console.error(err)
				return res.end(err)
			}
			return res.end('rename complete')
		})
	} else if (req.method === 'GET' && req.url === '/delete') {
		if(!fs.existsSync('./file.txt')) {
			return res.end('File does not exist')
		}
		fs.unlink('./file.txt', (err) => {
			if (err) {
				console.error(err)
				return res.end(err)
			}
			return res.end('delete complete')
		})
	} else {
		return res.end('Invalid api')
	}

	// switch (req.method) {
	// 	case 'GET': {
	// 		switch (req.url) {
	// 			case '/': {
	// 				return res.end('Login get')
	// 			}
	// 			case '/form': {
	// 				return res.end('./form.html')
	// 			}
	// 			case '/file': {
	// 				console.log('here')
	// 				fs.readFile("./file.txt", (err, data) => {
	// 					if (err) {
	// 						console.error("Error",err)
	// 						return res.end(err)
	// 					}
	// 					console.log(data)
	// 					return res.end(data)
	// 				})
	// 				break;
	// 			}
	// 				default: {
	// 					return res.end('Invalid Api 404')
	// 				}
	// 		}
	// 	}
	// 	case 'POST': {
	// 		switch (req.url) {
	// 			case '/': {
	// 				return res.end('Login post')
	// 			}
	// 			default: {
	// 				return res.end('Invalid api')
	// 			}
	// 		}
	// 	}
	// 	default: {
	// 		return res.end('Invalid status method')
	// 	}
	// }
})

mongoose
	.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
	.then(() => {
		console.log('MongoDb connected')
		server.listen(PORT, (err) => {
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
