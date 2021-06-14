
var http = require('http');
//var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var express = require('express');

var app;
app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
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

function getId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function geoTagObject(longitude, latitude, name, hashtag, id) {
    this.longitude = longitude;
    this.latitude = latitude;
    this.name = name;
    this.hashtag = hashtag;
    this.id = id;
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

        removeGeoTag : function (id) {
            geotags.filter(function (geotag){
                return geotag.id != id;
            });
        },

        getGeoTagById: function(id) {
            return geotags.filter(function(geoTag) {
                return geoTag.id === id;
            })[0];
        },

        changeGeoTag: function(toChangeGeoTag, id) {
            var i;
            for (i = 0; i < geotags.length; i++) {
                if (geoTags[i].id === id) {
                    geoTags[i].name = toChangeGeoTag.name;
                    geoTags[i].latitude = toChangeGeoTag.latitude;
                    geoTags[i].longitude = toChangeGeoTag.longitude;
                    geoTags[i].hashtag = toChangeGeoTag.hashtag;
                }
            }
        }
    };

})();

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 */


app.get('/', function(req, res) {
    res.render('gta', {
        taglist: geoTagModul.geotags.length > 0 ? geoTagModul.geotags : [],
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
    var newGeoTag = new geoTagObject(body.longitude, body.latitude, body.name, body.hashtag, body.id);
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

// 1. Route anlegen neuer ressourcen -> GET
app.post("/geotags", async function (req, res) {
    console.log(req.body);
    var body = req.body;
    var newGeoTag = new geoTagObject(body.longitude, body.latitude, body.name, body.hashtag, body.id);
    geoTagModul.addGeoTag(newGeoTag);


    var list = {
        taglist: geoTagModul.geotags,
        longitude: body.longitude,
        latitude: body.latitude,
        myLong: body.myLong,
        myLat: body.myLat
    }
    res.location(newGeoTag.id);
    res.status(201);
    res.send(list);
});

// 2. Route zur Suche von Ressourcen -> POST

app.get("/geotags", async function (req, res) {
    let searchTerm = req.query["searchterm"];
    let myLat = req.query["myLat"];
    let myLong = req.query["myLong"];
    console.log(searchTerm);
    var body = req.body;

    var tempList;
    if (searchTerm === undefined || searchTerm === "") {
        tempList = geoTagModul.searchByCoordinates(myLong, myLat, stdRadius)
    } else {
        tempList = geoTagModul.searchTerm(searchTerm);
    }
    var list = {
        taglist: tempList,
        longitude: body.longitude,
        latitude: body.latitude,
        myLong: myLong,
        myLat: myLat
    }

    res.send(list);
});

// 3. Route Lesen -> GET

app.get("/geotags/{id}", async function (req, res) {
    var id = req.id;
    res.send(geoTagModul.getGeoTagById(parseInt(id)));
});


// 4. Route Ändern -> PUT

app.put("/geotags/id", async function (req, res) {
    var id = req.id;
    var body = req.body;
    var toChangeGeoTag = new geoTagObject(body.longitude, body.latitude, body.name, body.hashtag, body.id);
    geoTagModul.changeGeoTag(toChangeGeoTag, id);
    res.send(toChangeGeoTag);
});

// 5. Route Löschen -> DELTE
app.delete("/geotags/{id}", async function (req, res) {
    var id = req.id;
    res.send(geoTagModul.removeGeoTag(parseInt(id)));
});



var port = 3000;
app.set('port', port);



var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);
