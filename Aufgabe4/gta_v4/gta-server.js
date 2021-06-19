
var http = require('http');
//var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var express = require('express');

var app;
app = express();
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Setze ejs als View Engine
app.set('view engine', 'ejs');

/**
 * Konfiguriere den Pfad für statische Dateien.
 * Teste das Ergebnis im Browser unter 'http://localhost:3000/'.
 */

app.use(express.static(__dirname + "/public"));

/**
 * Konstruktor für GeoTag Objekte.
 * GeoTag Objekte sollen min. alle Felder des 'tag-form' Formulars aufnehmen.
 */

function geoTagObject(longitude, latitude, name, hashtag) {
    this.longitude = longitude;
    this.latitude = latitude;
    this.name = name;
    this.hashtag = hashtag;

    }

/**
 * Modul für 'In-Memory'-Speicherung von GeoTags
 */

var geoTagModul = (function() {
    var geotags = [];

    //This function takes in latitude and longitude of two location and returns the distance between them (in km)
    function calcDistance(lat1, lon1, lat2, lon2)
    {
        var lat = 111.3 * Math.abs(lat1 -lat2);
        var lon = 71.5 * Math.abs(lon1-lon2);
        var distance = Math.sqrt((Math.pow(lat,2)) +(Math.pow(lon,2)));
        return distance;
    }

    return {

        geotags: geotags,


        searchByCoordinates : function (tempLong, tempLat, radius) {
            var returnGeoTags = [];
            geotags.forEach(function(tempObject) {
                if (tempObject !== undefined) {
                    var paramLong = tempObject.longitude;
                    var paramLat = tempObject.latitude;
                    if (calcDistance(paramLat, paramLong, tempLat, tempLong) <= radius) {
                        returnGeoTags.push(tempObject);
                    }
                }
            });
            console.log("search for GeoTags (Radius)")
            return returnGeoTags;
        },

        searchTerm : function (tempStr) {
            var returnGeoTags = [];
            geotags.forEach(function(tempObject) {
                if (tempObject !== undefined) {
                    var tempName = tempObject.name;
                    var tempHashtag = tempObject.hashtag;
                    if (tempName === tempStr || tempHashtag === tempStr) {
                        returnGeoTags.push(tempObject);
                    }
                }
            });
            console.log("search for GeoTags (Term: " + tempStr  +")")
            return returnGeoTags;
        },

        addGeoTag : function (tempGeoTag) {
            geotags.push(tempGeoTag);
            console.log("add GeoTag");
        },

        removeGeoTag : function (tempGeoTag) {
            var index = geotags.indexOf(tempGeoTag);
            if (index > -1) {
                geotags.splice(index, 1);
            }
            console.log("remove GeoTag")
        },
    };

})();

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 */
app.get('/', function(req, res) {
    res.render('gta');
});


/**
 * Route mit Pfad '/geotags' für HTTP 'GET' Requests über geotags-Route
 */

app.get('/geotags', function (req, res) {
    let body = req.query;
    let tempTags;

    if (body.term !== undefined && body.term !== "") {
        tempTags = geoTagModul.searchTerm(body.term);

    } else if (body.radius !== undefined && body.radius !== "") {
        tempTags = geoTagModul.searchByCoordinates(body.myLong, body.myLat, body.radius);
    } else {tempTags = geoTagModul.geotags;}

    res.send(JSON.stringify(tempTags));
});



/**
 * Route mit Pfad '/geotags' für HTTP 'POST' Requests.
 */

app.post('/geotags', function (req, res) {
    let body = req.body;
    geoTagModul.addGeoTag(JSON.parse(body.geotag));
    //res.location('/geotags/:' + geoTagModul.geotags.length - 1);
    res.status(201).json(geoTagModul.geotags);
});

app.get ("/geotags/:id", function (req, res) {
    let geotag = (geoTagModul.geotags)[req.params.id];
    if (geotag !== undefined) {
        res.json(geotag);
    } else {
        res.send(null);
    }
});

app.put('/geotags/:id', function (req, res) {
    let param = req.params.id;
    geoTagModul.geotags [param] = req.body;
});


app.delete('/geotags/:id', function (req, res) {
    let param = req.params.id;
    let geotag = geoTagModul.geotags [param-1];
    geoTagModul.geotags = geoTagModul.geotags.filter(function (del) {
        return del !== geotag;
    })
    res.json(null);
});

var port = 3000;
app.set('port', port);


var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);


