var express = require('express');  // poziva express iz node_modules
var app = express();  // označava da naša aplikacija koristi express
var mysql = require('mysql');  // poziva mysql iz node_modules
var bodyParser = require('body-parser');  // poziva bodyParser iz node_modules
var multer  = require('multer'); // poziva multer iz node_modules
var upload = multer({ dest: './uploads' }); //definira mapu u kojoj će se nalaziti uploadane datoteke
var fs = require('fs'); // poziva fs iz node_modules
var gcm = require('node-gcm'); // poziva gcm iz node_modules
var gcmApiKey = 'AAAAUEKeGco:APA91bFbgLqCdxN019scRTL0Gw8CqqVETUfNj5eHyc7queYz-ldFh1QT8E4--Du7wPCdXF2n5Q9qTQyjaFZj2Ic7AUwukRqN-P7DSXlkBFA39gKAJIxZ-WLMnqlfD5ZIgOfIWBPaQ-X7';

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

//Spremanje DEVICE_ID za push notifikacije
apiRoutes.post('/device-token', function (req, res, next) {

   //console.log(req.body);
   
   var token = req.body.token;
   console.log(token);

   pool.getConnection(function(err, connection) {
 
        if (err) {
            console.error("Dogodila se greška: " + err);
        }
            
			var uredjaj = { 
            dev_token: token  
            };   

            connection.query('INSERT INTO device SET ?', uredjaj,
            function(err, rows) {
                if (err) {
                    throw err;
                } else {
                    var result = {
                        success: true,
                        detail: rows
                    }
                }
            });
    }); 
})

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
			
        //SELECT svih tokena i slanje push notifikacije
        pool.getConnection(function(err, connection) {
 
        if (err) {
            console.error("Dogodila se greška: " + err);
        }
       var query = "SELECT * FROM device ORDER BY iddevice ASC";
        query = mysql.format(query);
        connection.query(query,function(err,rows){
           connection.release();
            if (err) {               
               return next(err);
            } else {
                 var SviTokeni = [];
                 rows.forEach(function(a) {
                        var jedanToken = {
                             dev_token: a.dev_token
                            }
                            SviTokeni.push(jedanToken.dev_token);
                        });
            //Push
            var device_tokens = SviTokeni; // array jedinstvenih tokena uređaja
    var retry_times = 4; // broj puta koliko će se push notifikacija pokušati poslati ako ne uspije prvi put
    var sender = new gcm.Sender(gcmApiKey); // pošiljatelj
    var message = new gcm.Message(); // nova poruka
    message.addData('title', 'Dodan novi korisnik:');
    message.addData('message', korisnik.k_ime + ' ' + korisnik.k_prezime);
    message.addData('sound', 'default');
    message.collapseKey = 'Testing Push'; // grupa push notifikacija
    message.delayWhileIdle = true; //odgoditi slanje push notifikacije ako je uređaj offline
    message.timeToLive = 3; //broj sekundi koliko push notifikaciju držati na serveru ako je uređaj offline
    sender.send(message, device_tokens[0], retry_times, function (result) {
        console.log('Push poslan na: ' + device_tokens);
      //  res.status(200).send('Push notifikacija poslana na uređaj: ' + device_tokens);
    }, function (err) {
      //  res.status(500).send('Neuspješno poslana push notifikacija');
    });
            }
        });  
        
    })
			
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