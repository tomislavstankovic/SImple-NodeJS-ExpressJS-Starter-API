var express = require('express');  // poziva express iz node_modules
var app = express();  // označava da naša aplikacija koristi express
var mysql = require('mysql');  // poziva mysql iz node_modules
var bodyParser = require('body-parser');  // poziva bodyParser iz node_modules
var multer  = require('multer'); // poziva multer iz node_modules
var upload = multer({ dest: './uploads' }); //definira mapu u kojoj će se nalaziti uploadane datoteke
var fs = require('fs'); // poziva fs iz node_modules

// označava da app koristi bodyParser() kako bi mogao dobiti podatke iz POST zahtjeva
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // definira port na kojemu će API raditi

// Spajanje s MySQL bazom
 var pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'korisniciapi'
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
    res.json({ message: 'API radi!' });   //ako je sve ispravno postavljeno kao odgovor ćemo dobiti ovu poruku
});

//Dodavanje korisnika
apiRoutes.post('/dodajkorisnika', upload.any(),function (req, res, next) {

  console.log(req.body);
  console.log(req.files);

   pool.getConnection(function(err, connection) {
 
        if (err) {
            console.error("Dogodila se greška: " + err);
        }

            var korisnik = { 
            k_ime: req.body.ime,
            k_prezime: req.body.prezime,
			k_slika: req.files[0].destination + "/" + req.files[0].filename,  
			k_dokument: req.files[1].destination + "/" + req.files[1].filename  
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
apiRoutes.delete('/korisnik/:k_id/:k_slika/:k_dokument', function(req, res, next){

console.log(req.params);

var slika =  req.params.k_slika;
var dokument =  req.params.k_dokument;

pool.getConnection(function(err, connection) {
 
        if (err) {
            console.error("Dogodila se greška: " + err);
        }
            connection.query('delete from korisnik where k_id = ?', [req.params.k_id], 
            function(err, rows) {
                if (err) {
                    return next(err);
                } else {
				    fs.unlinkSync('./uploads/' + slika);
					fs.unlinkSync('./uploads/' + dokument);
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

// ostale GET, POST, PUT, DELETE biti će definirane ovdje

// sve rute sadržavati će /api
app.use('/api', apiRoutes);

// pokretanje API-ja
app.listen(port);
console.log('API je pokrenut i koristi port:' + ' ' + port);