const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');

let mongoose = require('mongoose');
const { Schema } = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const port = 3000
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

const logSchema = new Schema({
	username: {
		type: String,
		required: true
	},
	count: Number,
	log:
		[
			{
				description: String,
				duration: Number,
				date: String,
			}
		]
})

const LOG = mongoose.model("Log", logSchema)

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
});

app.route("/api/users")
	.post(function (req, res) {
		const username = req.body.username;

		let newUser = new LOG({
			username: username,
			count: 0,
			log: []
		})

		newUser.save(function (err, data) {
			if (err) return console.error(err);
			res.json({ username: data.username, _id: data._id });
		})
	})
	.get(function (req, res) {
		LOG.find(function (err, data) {
			if (data)
				res.json(data);
		}).select({ count: 0, log: 0, __v: 0 });
	});

app.post("/api/users/:_id/exercises", function (req, res) {
	if (!req.params._id || !req.body.description || !req.body.duration) {
		res.json({ error: "missing argument" })
		return console.error("missing argument")
	}
	const id = req.params._id;

	LOG.findById({ _id: id }, function (err, found) {
		if (err) return console.error(err)
		if (found) {
			found.count += 1;
			const description = req.body.description;
			if (isNaN(Number(req.body.duration))) {
				res.json({ error: "duration should be a number." });
				return console.error("duration should be a number.");
			}
			const duration = Number(req.body.duration);

			let date;
			if (req.body.date) {
				date = req.body.date;
				if ((/^\d{4}-\d(\d)?-\d(\d)?$/).test(req.body.date)) {
					try {
						date = new Date(date);
					} catch (err) {
						return console.error(err);
					}
				}
			} else {
				date = new Date();
			}
			date = date.toDateString()
			found.log.unshift({
				description,
				duration,
				date
			});
			found.save(function (err, updated) {
				if (err) return console.error(err)
				res.json({
					username: found.username,
					_id: id,
					description, duration,
					date: date
				})
			});
		} else {
			res.json({ error: "no user found." })
			return console.error("no user found.")
		}
	})
})

app.get("/api/users/:id/logs", function (req, res) {
	const id = req.params.id;
	let { from, to, limit } = req.query;

	LOG.findById(id, function (err, data) {
		if (err) console.error(err);
		let newLog = [];
		if (data) {
			let newData = {};
			if (from) {
				from = (new Date(from)).getTime();
				newData['from'] = (new Date(from)).toDateString();
			} else from = 0
			if (to) {
				to = (new Date(to)).getTime();
				newData['to'] = (new Date(to)).toDateString();
			} else to = (new Date()).getTime();
			if (limit) {
				limit = Number(limit)
			} else limit = -1;

			let temp = limit;
			for (let obj of data.log) {
				if (temp === 0) break;
				temp -= 1;
				let newDate = (new Date(obj.date)).getTime()
				if (newDate >= from && newDate <= to) {
					newLog.push(obj)
				}
			}
			newData['username'] = data.username;
			newData['_id'] = id;
			newData['count'] = newLog.length;
			newData['log'] = newLog;
			res.json(newData)
		}
	}).select('-log._id')
})

const listener = app.listen(port, () => {
	console.log('Your app is listening on port ' + listener.address().port)
})
