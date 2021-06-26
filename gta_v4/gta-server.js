
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
            let filteredGeotags = geotags.filter(function (geotag){
                return geotag.id != id;
            });
            this.geotags = filteredGeotags;
        },

        getGeoTagById: function(id) {
            let searchedGeoTags = geotags.filter(function(geoTag) {
                return geoTag.id === id;
            });
            return searchedGeoTags[0];
        },

        changeGeoTag: function(toChangeGeoTag, id) {
            var i;
            for (i = 0; i < geotags.length; i++) {
                if (geotags[i].id === id) {
                    geotags[i].name = toChangeGeoTag.name;
                    geotags[i].latitude = toChangeGeoTag.latitude;
                    geotags[i].longitude = toChangeGeoTag.longitude;
                    geotags[i].hashtag = toChangeGeoTag.hashtag;
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
        myLat: "",
        numberOfPages:  calculateNumberOfPages()
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
        taglist: geoTagsForPages(geoTagModul.geotags),
        longitude: body.longitude,
        latitude: body.latitude,
        myLong: body.myLong,
        myLat: body.myLat,
        numberOfPages:  calculateNumberOfPages()
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
        taglist: geoTagsForPages(tempList),
        longitude: body.longitude,
        latitude: body.latitude,
        myLong: body.myLong,
        myLat: body.myLat,
        numberOfPages:  calculateNumberOfPages()
    }

    console.log("return geoTagItems")
    res.render('gta', list);
});

// 1. Route anlegen neuer ressourcen -> GET
app.post("/geotags", async function (req, res) {
    var body = req.body;
    var newGeoTag = new geoTagObject(body.longitude, body.latitude, body.name, body.hashtag, body.id);
    geoTagModul.addGeoTag(newGeoTag);

    var list = {
        taglist: geoTagsForPages(geoTagModul.geotags),
        longitude: body.longitude,
        latitude: body.latitude,
        myLong: body.myLong,
        myLat: body.myLat,
        numberOfPages:  calculateNumberOfPages()
    }
    res.location(newGeoTag.id);
    res.status(201);
    res.send(list);
});

// 2. Route zur Suche und Paging von Ressourcen -> POST

function calculateNumberOfPages() {
    let numberOfElementsForPage = 2
    if (geoTagModul.geotags.length >= numberOfElementsForPage) {
        return Math.round(geoTagModul.geotags.length / numberOfElementsForPage);
    } else if (geoTagModul.geotags.length === 0) {
        return 0;
    } else {
        return 1;
    }
}

function geoTagsForPages(geoTags) {
    console.log("START FILTER");
    let numberOfElementsForPage = 2
    console.log(pageIndex);
    let startIndex = numberOfElementsForPage * pageIndex - numberOfElementsForPage;
    let endIndex =  numberOfElementsForPage * pageIndex;
    let slicedGeoTags = geoTags.slice(startIndex, endIndex);
    console.log(slicedGeoTags);
    console.log(startIndex, endIndex);
    return slicedGeoTags;
}

var pageIndex = 1;

app.get("/geotags", async function (req, res) {
    let searchTerm = req.query["searchterm"];
    let pageIndexQuery = req.query["pageIndex"];
    let myLat = req.query["myLat"];
    let myLong = req.query["myLong"];
    var body = req.body;

    var tempList;
    if ((searchTerm === undefined || searchTerm === "") && (pageIndexQuery === undefined)) {
        pageIndex = 1;
        if (searchTerm === undefined) {
            tempList = geoTagModul.geotags;
        } else {
            tempList = geoTagModul.searchByCoordinates(myLong, myLat, stdRadius);
        }
    } else if (pageIndexQuery) {
        pageIndex = parseInt(pageIndexQuery);
        tempList = geoTagModul.geotags;
    } else {
        pageIndex = 1;
        tempList = geoTagModul.searchTerm(searchTerm);
    }

    console.log(pageIndex);

    var list = {
        taglist: geoTagsForPages(tempList),
        longitude: body.longitude,
        latitude: body.latitude,
        myLong: myLong,
        myLat: myLat,
        numberOfPages:  calculateNumberOfPages()
    }

    res.send(list);
});

// 3. Route Lesen -> GET

app.get("/geotags/:id", async function (req, res) {
    var id = req.params.id;
    res.send(geoTagModul.getGeoTagById(id));
});

// 4. Route Ändern -> PUT

app.put("/geotags/:id", async function (req, res) {
    var id = req.params.id;
    var body = req.body;
    var toChangeGeoTag = new geoTagObject(body.longitude, body.latitude, body.name, body.hashtag, id);
    geoTagModul.changeGeoTag(toChangeGeoTag, id);
    res.send(toChangeGeoTag);
});

// 5. Route Löschen -> DELETE
app.delete("/geotags/:id", async function (req, res) {
    var id = req.params.id;
    geoTagModul.removeGeoTag(id);
    res.send(id+" was deleted.");
});



var port = 3000;
app.set('port', port);



var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);
