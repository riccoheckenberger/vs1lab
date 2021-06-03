/**
 * Template für Übungsaufgabe VS1lab/Aufgabe3
 * Das Skript soll die Serverseite der gegebenen Client Komponenten im
 * Verzeichnisbaum implementieren. Dazu müssen die TODOs erledigt werden.
 */

/**
 * Definiere Modul Abhängigkeiten und erzeuge Express app.
 */

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

    this.getParams = function() {
        return {
            longitude : this.latitude,
            latitude : this.latitude,
            name : this.name,
            hashtag : this.hashtag
        }
    }
}


/**
 * Modul für 'In-Memory'-Speicherung von GeoTags mit folgenden Komponenten:
 * - Array als Speicher für Geo Tags.
 * - Funktion zur Suche von Geo Tags in einem Radius um eine Koordinate.
 * - Funktion zur Suche von Geo Tags nach Suchbegriff.
 * - Funktion zum hinzufügen eines Geo Tags.
 * - Funktion zum Löschen eines Geo Tags.
 */

var inMemory = (function() {
    var geotags = [];

    //This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
    function calcDistance(lat1, lon1, lat2, lon2)
    {
        var R = 6371; // km
        var dLat = toRad(lat2-lat1);
        var dLon = toRad(lon2-lon1);
        lat1 = toRad(lat1);
        lat2 = toRad(lat2);

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Converts numeric degrees to radians
    function toRad(Value)
    {
        return Value * Math.PI / 180;
    }

    return {
        geotags: geotags,

        searchRadios : function (tempLong, tempLat, radius) {
            var returnGeoTags = [];
            geotags.forEach(function(tempObject) {
                if (tempObject !== undefined) {
                    var params = tempObject.getParams();
                    var paramLong = params.longitude;
                    var paramLat = params.latitude;
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
        }
    };



})();

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 * (http://expressjs.com/de/4x/api.html#app.get.method)
 *
 * Requests enthalten keine Parameter
 *
 * Als Response wird das ejs-Template ohne Geo Tag Objekte gerendert.
 */

app.get('/', function(req, res) {
    res.render('gta', {
        taglist: inMemory.geotags,
        longitude: null,
        latitude: null,
        myLong : null,
        myLat : null,
        jsonTagList : JSON.stringify(inMemory.geotags)
    });
});

/**
 * Route mit Pfad '/tagging' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'tag-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Mit den Formulardaten wird ein neuer Geo Tag erstellt und gespeichert.
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 */

app.post("/tagging", function(req,res,next) {
    var body = req.body;
    var newGeoTag = new geoTagObject(body.longitude, body.latitude, body.name, body.hashtag);
    inMemory.addGeoTag(newGeoTag);
    var tempList = inMemory.searchRadios(body.longitude, body.latitude, stdRadius);
    var list = {
        taglist: tempList,
        longitude: body.longitude,
        latitude: body.latitude,
        myLong : body.myLong,
        myLat : body.myLat,
        jsonTagList : JSON.stringify(tempList)
    }
    console.log("return geoTagItems")
    res.render('gta', list);
});

/**
 * Route mit Pfad '/discovery' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'filter-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 * Falls 'term' vorhanden ist, wird nach Suchwort gefiltert.
 */
var stdRadius = 5; //km

app.post("/discovery", function (req,res,next) {
    var body = req.body;
    var tempList;
    if (body.term !== undefined ||  body.term !== "") {
        tempList = inMemory.searchTerm(body.term);
    } else {
        tempList = inMemory.searchRadios(body.myLong, body.myLat, stdRadius);
    }

    var list = {
        taglist: tempList,
        longitude: body.longitude,
        latitude: body.latitude,
        myLong : body.myLong,
        myLat : body.myLat,
        jsonTagList : JSON.stringify(tempList)
    }
    console.log("return geoTagItems")
    res.render('gta', list);
});

/**
 * Setze Port und speichere in Express.
 */

var port = 3000;
app.set('port', port);

/**
 * Erstelle HTTP Server
 */

var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);
