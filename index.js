const express = require('express')
const {engine}  = require('express-handlebars');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const moment = require('moment');

const db = require("./config/db")
const {ensureCustomer, authenticated} = require('./middleware/auth');
const auth = require('./middleware/auth');

const app = express()
const port = 3000

dotenv.config();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect('/profile')
})

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    let user = req.body;
    try {
        bcrypt.hash(user.password, 10, function(err, hash) {
            if (err) {
                res.render('register', {'msg': err});
                return;
            }
            let query = `INSERT INTO user ( username, password, name ) VALUES ( '${user.username}', '${hash}', '${user.name}' )`;
            db.query(query, function (error, results, fields) {
                if (error) {
                    res.render('register', {'msg':error["sqlMessage"]});
                    return;
                }
                res.redirect("/login")
            });
        });
    } catch (error) {
        res.render('register', {'msg': error});
        return;
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    let user = req.body;
    try {
        let query = `SELECT username, password FROM user WHERE username='${user.username}' LIMIT 1`;
        db.query(query, (error, results) => {
            if (error) {
                console.log(error);
                res.send(error)
                return;
            }
            console.log(results)
            if (results.length==0) {
                res.send("No username exists")
                return
            }
            bcrypt.compare(user.password, results[0].password, (err, result) => {
                if (err) {
                    console.log(err);
                    res.send(err)
                    return;
                }
                if (!result){
                    res.send("wrong password")
                    return;
                }
                const token = jwt.sign({
                    username: results[0].username,
                  }, "pumpkin", { expiresIn: '24h' });
                console.log(token, "login")
                res.cookie('token', token).redirect("/profile")
            });
        });
    } catch (error) {
        res.send(error)
        return;
    }
});

app.get("/profile", authenticated, (req, res) => {
    try {
        msg = req.cookies.msg;
        res.clearCookie('msg');
        movies_data = [];
        let query = `SELECT * from movie where username="${req.user.username}"`;
        db.query(query, async (error, results) => {
            if (error) {
                return res.send(error);
            }
            if (results.length>0) {
                for (let i=0; i<results.length; i++){
                    let query = `SELECT * from movies.cast where mid="${results[i].id}"`;
                    db.query(query, (error, results_cast) => {
                        if (error) {
                            return res.send(error);
                        }
                        let cast = [];
                        for (let j=0; j<results_cast.length; j++){
                            cast.push(results_cast[j]['cast_name'])
                        }
                        movie = JSON.parse(JSON.stringify(results[i]));
                        movie['cast'] = cast.join(",");
                        console.log(movie.release_date)
                        movie['release_date'] = moment(
                            movie.release_date,
                        ).format("MMM DD, YYYY");
                        console.log(movie['release_date'])
                        movies_data.push(movie);

                        if (i==results.length-1) {
                            // console.log(movies_data)
                            res.render('profile', {user : req.user, msg : msg, movie : movies_data});
                        }
                    })
                }
            } else {
                res.render('profile', {user : req.user, msg : msg, movie : movies_data});
            }
        })
    } catch (error) {
        return res.send(error); 
    }
})

app.get('/logout', (req, res) => {
    res.clearCookie("token").redirect("/login");
})

app.post("/profile", authenticated, async (req, res) => {
    try {
        movie = req.body;
        let release_date = moment(
            movie.release_date,
            "MMM DD, YYYY"
        ).format("YYYY-MM-DD HH:mm:ss");
        let query = `INSERT INTO movie ( name, username, rating, genre, release_date ) VALUES ( '${movie.name}', '${req.user.username}', '${movie.rating}', '${movie.genre}', '${release_date}' );`
        db.query(query, async (error, results) => {
            if (error) {
                res.cookie('msg', error['sqlMessage']).redirect("/profile");
                return;
            }
            let cast = movie.cast.split(",");
            for (let i = 0; i < cast.length; i++) {
                let query = `INSERT INTO movies.cast ( mid, cast_name ) VALUES ( '${results.insertId}', '${cast[i]}');`;
                db.query(query, (error) => {
                    if (error) {
                        res.cookie('msg', error['sqlMessage']).redirect("/profile");
                        return;
                    }
                });
            }
            res.redirect("/profile");
        });
    } catch (error) {
        res.cookie('msg', JSON.stringify(error)).redirect("/profile");
    }
})

app.post("/movie/edit/:id", authenticated, async (req, res) => {
    try {
        movie_id = req.params.id;
        console.log(movie_id);
        movie = req.body;
        console.log(movie.release_date)
        let release_date = moment(
            movie.release_date,
            "MMM DD, YYYY"
        ).format("YYYY-MM-DD HH:mm:ss");
        console.log(release_date)
        let query = `UPDATE movie SET name = '${movie.name}', rating = '${movie.rating}', genre = '${movie.genre}', release_date = '${release_date}' where id='${movie_id}' AND username='${req.user.username}';`
        db.query(query, async (error, results) => {
            if (error) {
                console.log(error)
                res.cookie('msg', error['sqlMessage']).redirect("/profile");
                return;
            }
            if (results.changedRows==1){
                let query = `DELETE from movies.cast where mid=${movie_id}`;
                db.query(query, async (error, results) => {
                    if (error) {
                        res.cookie('msg', error['sqlMessage']).redirect("/profile");
                        return;
                    }
                    let cast = movie.cast.split(",");
                    for (let i = 0; i < cast.length; i++) {
                        let query = `INSERT INTO movies.cast ( mid, cast_name ) VALUES ( '${movie_id}', '${cast[i]}');`;
                        db.query(query, (error) => {
                            if (error) {
                                console.log(error)
                                return res.cookie('msg', error['sqlMessage']).redirect("/profile");
                            }
                        });
                    }
                    res.redirect("/profile");
                })
            }
            else res.redirect("/profile");
        });
    } catch (error) {
        res.cookie('msg', JSON.stringify(error)).redirect("/profile");
    }
})

app.post("/movie/delete/:id", authenticated, async (req, res) => {
    try {
        let movie_id = req.params.id;
        let query = `SELECT * from movie where id='${movie_id}' AND username='${req.user.username}' LIMIT 1`;
        db.query(query, (error, results) => {
            if (error) {
                res.cookie('msg', error['sqlMessage']).redirect("/profile");
                return;
            }
            if (results.length == 1) {
                let query = `DELETE from movies.cast where mid=${movie_id}`;
                db.query(query, async (error, results) => {
                    if (error) {
                        res.cookie('msg', error['sqlMessage']).redirect("/profile");
                        return;
                    }
                    let query = `DELETE from movie where id='${movie_id}' AND username='${req.user.username}';`
                    db.query(query, async (error, results) => {
                        if (error) {
                            console.log(error)
                            res.cookie('msg', error['sqlMessage']).redirect("/profile");
                            return;
                        }
                        res.redirect("/profile");
                    });
                })
            }
            else res.redirect("/profile");
        })
    } catch (error) {
        res.cookie('msg', JSON.stringify(error)).redirect("/profile");
    }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})