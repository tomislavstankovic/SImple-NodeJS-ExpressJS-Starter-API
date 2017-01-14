var express = require('express');  // poziva express iz node_modules
var app = express();  // označava da naša aplikacija koristi express
var mysql = require('mysql');  // poziva mysql iz node_modules
var bodyParser = require('body-parser');  // poziva bodyParser iz node_modules

// označava da app koristi bodyParser() kako bi mogao dobiti podatke iz POST zahtjeva
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

 // definira port na kojemu će API raditi
var port = process.env.PORT || 8080;       

// Spajanje s MySQL bazom
 var pool = mysql.createPool({
        host: 'localhost',
        user: '',
        password: '',
        database: ''
    }); 

// definiranje zadane (defaultne) rute za naš API
var apiRoutes = express.Router();

// middleware
apiRoutes.use(function(req, res, next) {
    // provjera korisničkih podataka prilikom logirana/prijave
    console.log('Nešto se događa.');
    next(); // idi na sljedeću rutu
});

// testiranje rute (GET http://localhost:8080/api)
apiRoutes.get('/', function(req, res) {
    //ako je sve ispravno postavljeno kao odgovor ćemo dobiti ovu poruku
    res.json({ message: 'API radi!' });   
});

//Dodavanje korisnika
apiRoutes.post('/dodajkorisnika', function (req, res, next) {

   pool.getConnection(function(err, connection) {
 
        if (err) {
            console.error("Dogodila se greška: " + err);
        }

            var korisnik = { 
            k_ime: req.body.ime,
            k_prezime: req.body.prezime
            };      
			
            connection.query('INSERT INTO korisnik SET ?', korisnik,
            function(err, rows) {
                if (err) {
                    throw err;
                } else {
	            res.json("Uspješno dodan korisnik!");
                    res.end();
                }
                connection.release();
            });
    });
})

//Dohvaćanje svih korisnika
apiRoutes.get('/pregledkorisnika', function(req, res,next){

pool.getConnection(function(err, connection) {

        if (err) {
            console.error("Dogodila se greška: " + err);
        }

       var query = "SELECT * FROM korisnik ORDER BY k_id ASC";
       
       var table = ["korisniciapi"];
        
        query = mysql.format(query,table);

        connection.query(query,function(err,rows){
           connection.release();
            if (err) {               
               return next(err);
            } else {
                res.json({
                    success: true,
                    popis_korisnika: rows
                });
            }
        });
    });
});

//Uređivanje korisnika
apiRoutes.put('/korisnik/:k_id', function(req, res, next){

pool.getConnection(function(err, connection) {
 
        if (err) {
            console.error("Dogodila se greška: " + err);
        }
	
           var korisnik = { 
            k_ime: req.body.ime,
            k_prezime: req.body.prezime
            };    

            connection.query('update korisnik SET ? where k_id = ?', [korisnik,  req.params.k_id],
            function(err, rows) {
                if (err) {
                   return next(err);
                } else {
                    res.writeHead(200, {
                        "Content-Type": "application/json"
                    });
                    var result = {
                        success: true,
                        detail: rows
                    }
                    res.write(JSON.stringify(result));
                    res.end();
                }
            });
    });
});

//Brisanje korisnika
apiRoutes.delete('/korisnik/:k_id', function(req, res, next){

pool.getConnection(function(err, connection) {
 
        if (err) {
            console.error("Dogodila se greška: " + err);
        }

            connection.query('delete from korisnik where k_id = ?', [req.params.k_id], 

            function(err, rows) {
                if (err) {
                    return next(err);
                } else {
                    res.writeHead(200, {
                        "Content-Type": "application/json"
                    });
                    var result = {
                        success: true
                    }
                    res.write(JSON.stringify(result));
                    res.end();
                }
            });
    });
});

// sve rute sadržavati će /api
app.use('/api', apiRoutes);

// pokretanje API-ja
app.listen(port);
console.log('API je pokrenut i koristi port:' + ' ' + port);
