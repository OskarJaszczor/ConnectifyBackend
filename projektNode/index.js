const express = require('express')
const path = require('path')
const app = express()
const port = 3000
const cors = require('cors')
const bodyparser = require('body-parser')
const mysql = require('mysql')
const fileupload = require("express-fileupload");
const uuid = require("uuid")


app.use(bodyparser.json())
app.use(cors())
app.use(express.json())
app.use(fileupload({createParentPath:true}))
app.use("/img", express.static('img'))



const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'projektnode',
})

connection.connect(err => {
	if (err) {
		console.error('Nie udało się połączyć z bazą danych:', err)
	} else {
		console.log('Połączono z bazą danych!')
	}
})

function getDatabase() {
	return Promise.all([
		new Promise((resolve, reject) => {
			connection.query('SELECT * FROM servers', (err, rows) => {
				if (err) {
					reject(err)
				} else {
					resolve({ servers: rows })
				}
			})
		}),
		new Promise((resolve, reject) => {
			connection.query('SELECT * FROM channels', (err, rows) => {
				if (err) {
					reject(err)
				} else {
					resolve({ channels: rows })
				}
			})
		}),
		new Promise((resolve, reject) => {
			connection.query('SELECT * FROM messages', (err, rows) => {
				if (err) {
					reject(err)
				} else {
					resolve({ messages: rows })
				}
			})
		}),
		new Promise((resolve, reject) => {
			connection.query('SELECT * FROM users', (err, rows) => {
				if (err) {
					reject(err)
				} else {
					resolve({ users: rows })
				}
			})
		}),
	]).then(results => {
		return Object.assign({}, ...results)
	})
}

app.get('/', async (req, res) => {
	const data = await getDatabase()
	res.json(data)
})



app.post('/register', (req, res) => {
	const { nick, login, password } = req.body

	connection.query('SELECT * FROM users WHERE username = ?', [nick], (err, results) => {
		if (err) return res.status(500).json({ error: err })
		if (results.length > 0) {
			return res.status(400).json({ message: 'Użytkownik już istnieje' })
		}

		connection.query('INSERT INTO users (username, login, password) VALUES (?, ?, ?)', [nick, login, password], err => {
			if (err) return res.status(500).json({ error: err })
			res.status(201).json({ message: 'Użytkownik zarejestrowany' })
		})
	})
})

app.post('/login', (req, res) => {
	const { login, password } = req.body

	connection.query('SELECT * FROM users WHERE login = ? AND password = ?', [login, password], (err, results) => {
		if (err) return res.status(500).json({ error: err })
		if (results.length === 0) {
			return res.status(401).json({ message: 'Nieprawidłowy login lub hasło' })
		}
		console.log()
		res.status(200).json({ username: results[0].username })
	})
})

app.post('/server', (req, res) => {
	console.log(req.body.server)
})

app.get('/x', async (req, res) => {
	const data = await getDatabase()

	//console.log(data)

	res.json(data)
})

let messages = []

app.post('/messages', async (req, res) => {
	const { content, author, channel, date, hour } = req.body

	console.log('Otrzymano wiadomość:', content)
	console.log('Autor:', author)
	console.log('Data:', date)
	console.log('Godzina:', hour)

	const query = `
  INSERT INTO messages (messageId, channelId, content, author, date, hour) 
  VALUES (NULL, ?, ?, ?, ?, ?)`

	//console.log(query);

	const values = [channel, content, author, date, hour]

	connection.query(query, values, (error, results) => {
		if (error) {
			console.error('Błąd przy dodawaniu do bazy:', error)
		}
		console.log('Wiadomość dodana:', { content, author, channel, date, hour })
	})

	res.sendStatus(200)
})

app.post('/addServer', async (req, res) => {
	const { name, admin, users } = req.body
	const {avatar} = req.files

	const filename = uuid.v4() +path.extname(avatar.name)

	avatar.mv(path.join('img', filename))

	const query = 'INSERT INTO servers (`serverId`, `serverName`, `serverImg`, `users`) VALUES (null,?,?,?)'
	const values = [name, filename, users]

	connection.query(query, values, (error, results) => {
		if (error) {
			console.error('Błąd przy dodawaniu do bazy:', error)
		}
		console.log('Server dodany:', { name, filename, users })
	})

	res.sendStatus(200)
})

app.post('/addChannel', async (req, res) => {
	const { char, name, server } = req.body

	const query = 'INSERT INTO channels (`channelId`, `serverId`, `channelName`, `channelChar`) VALUES (null,?,?,?)'
	const values = [server, name, char]

	connection.query(query, values, (error, results) => {
		if (error) {
			console.error('Błąd przy dodawaniu do bazy:', error)
		}
		console.log('Kanał dodany:', { name, char, server })
	})

	res.sendStatus(200)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
