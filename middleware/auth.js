const jwt = require('jsonwebtoken');

const db = require('../config/db');

module.exports = {
    authenticated: (req, res, next) => {
        console.log(req.cookies)
        const token = req.cookies.token;
        if (!token) return res.redirect("/login")
        try {
            jwt.verify(token, "pumpkin", (err, decoded) => {
                if (err) {
                    console.log(err);
                    res.redirect("/login")
                    return;
                }
                console.log(decoded) // bar
                let query = `SELECT * FROM user WHERE username='${decoded.username}' LIMIT 1`;
                db.query(query, (error, results) => {
                    if (error) {
                        console.log(error);
                        res.redirect("/login")
                        return;
                    }
                    if (results.length==0){
                        console.log(results)
                        res.redirect("/login")
                        return;
                    }
                    req.user = results[0];
                    console.log(results)
                    next() 
                });
            })
        } catch(err) {
            res.redirect("/login")
        }
    }
}