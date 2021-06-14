
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
    res.render('gta', {
        taglist: geoTagModul.geotags,
        longitude : "",
        latitude: "",
        myLong: "",
        myLat: ""
    });
});


/**
 * Route mit Pfad '/tagging' für HTTP 'POST' Requests.
 */

app.post("/tagging", function (req, res) {
    var body = req.body;
    var newGeoTag = new geoTagObject(body.longitude, body.latitude, body.name, body.hashtag);
    geoTagModul.addGeoTag(newGeoTag);

    var list = {
        taglist: geoTagModul.geotags,
        longitude: body.longitude,
        latitude: body.latitude,
        myLong: body.myLong,
        myLat: body.myLat
    }
    console.log("return geoTagItems")
    res.render('gta', list);
});



/**
 * Route mit Pfad '/discovery' für HTTP 'POST' Requests.
 */

var stdRadius = 100; //km

app.post("/discovery", function (req,res) {
    var body = req.body;
    var tempList;
    if (body.term === undefined ||  body.term === "") {
        tempList = geoTagModul.searchByCoordinates(body.myLong,body.myLat,stdRadius)
    } else {
        tempList = geoTagModul.searchTerm(body.term);
    }

    var list = {
        taglist: tempList,
        longitude: body.longitude,
        latitude: body.latitude,
        myLong: body.myLong,
        myLat: body.myLat
    }

    console.log("return geoTagItems")
    res.render('gta', list);
});


var port = 3000;
app.set('port', port);



var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);


/*tl;dr Erstellen Sie eine komplette REST API für GeoTags. Realisieren Sie zwei Routen zum Anlegen
neuer Ressourcen und zur Suche auf einer Container Ressource mit URI geotags/ sowie drei Routen für
das Lesen, Ändern und Löschen einzelner Ressourcen mit URI geotags/<id>. Demonstrieren Sie alle Routen mit
einem generischen REST Client.
 */

/*In einer REST-konformen API besitzen Ressourcen eines Typs (also z.B. GeoTag) oft eine sog. Container-Ressource, die im
URI-Pfad nach dem Plural der Ressource benannt ist (also z.b. /geotags). Das Erzeugen einer neuen Ressourcen-Instanz
erfolgt dann per HTTP POST auf die Adresse der Container Ressource, wobei eine Beschreibung der neuen Ressource als
JSON mitgesendet wird. Das Auslesen aller Ressourcen-Instanzen als JSON Liste erfolgt durch HTTP GET auf die
Adresse der Container Ressource. Durch Übergabe eines Filters (z.B. Suchbegriff oder Radius) als URL-Parameter
kann eine Suche repräsentiert werden. Realisieren sie zwei entsprechende Routen.
 */