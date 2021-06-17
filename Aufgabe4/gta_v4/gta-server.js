
let http = require('http');
//var path = require('path');
let logger = require('morgan');
let bodyParser = require('body-parser');
let express = require('express');
let sessions = require("express-session");
let app;


app = express();
app.use(logger('dev'));
app.use(sessions({
    secret: "cookie_secret",
    name: "cookie_name",
    proxy: true,
    resave: true,
    saveUninitialized: true
}));
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
 * Modul für 'In-Memory'-Speicherung von GeoTags
 */

var geoTagModul = (function() {
    let geotags = [];

    //This function takes in latitude and longitude of two location and returns the distance between them (in km)
    function calcDistance(lat1, lon1, lat2, lon2)
    {
        var lat = 111.3 * Math.abs(lat1 -lat2);
        var lon = 71.5 * Math.abs(lon1-lon2);
        return Math.sqrt((Math.pow(lat,2)) +(Math.pow(lon,2)));
    }

    return {

        geotags : geotags,


        /**
         * Route 2:
         * get all geotags starting at index [lastID] all geotag's in geotags were checked or [numberOfGeotags] geotag's are found
         *
         * @param lastID lastID the index + 1 in geotags where the search starts
         * @param numberOfGeotags the max amount of geotags that will be found (normally PAGE_SIZE + 1)
         * @returns {{geotags: [], index: number}} Object with the result array and the index of the last geotag
         */
        getGeotags : function (lastID, numberOfGeotags) {
            let list = [];
            let index = lastID;
            for (let i = lastID + 1; i < geotags.length && numberOfGeotags > 0; i++) {
                list.push(geotags[i]);
                index = i;
                numberOfGeotags--;
            }
            return {geotags : list, index: index };
        },


        /**
         * Route 1
         * searches for geotags in a radius of [radius] around the position [tempLong, tempLat]
         * starts at index [lastID] and iterates until all geotags have been checked or there are [numberOfGeotags] amount of tags found
         * returns an Object with the result array and the index of the last geotag
         *
         * @param tempLong longitude
         * @param tempLat latitude
         * @param radius radius in km
         * @param lastID the index + 1 in geotags where the search starts
         * @param numberOfGeotags the max amount of geotags that will be found (normally PAGE_SIZE + 1)
         * @returns {{geotags: [], index}} Object with the result array and the index of the last geotag
         */
        searchByCoordinates : function (tempLong, tempLat, radius, lastID, numberOfGeotags) {
            let returnGeoTags = [];
            let index;
            for (let i = lastID + 1; i < geotags.length && numberOfGeotags > 0; i++ ) {
                if (geotags[i] !== undefined) {
                    const paramLong = geotags[i].longitude;
                    const paramLat = geotags[i].latitude;
                    if (calcDistance(paramLat, paramLong, tempLat, tempLong) <= radius) {
                        returnGeoTags.push(geotags[i]);
                        index = i;
                        numberOfGeotags--;
                    }
                }
            }
            console.log("search for GeoTags (Radius)")
            return {geotags : returnGeoTags, index : index};
        },

        /**
         * Route 0:
         * searches for geotag in geotags where name = term or hashtag = term
         * starts at index [lastID] and iterates until all geotags have been checked or there are [numberOfGeotags] amount of tags found
         * returns an Object with the result array and the index of the last geotag
         *
         * @param term string that is searched for
         * @param lastID the index + 1 in geotags where the search starts
         * @param numberOfGeotags the max amount of geotags that will be found (normally PAGE_SIZE + 1)
         * @returns {{geotags: [], index}} Object with the result array and the index of the last geotag
         */

        searchTerm : function (term, lastID, numberOfGeotags) {
            let returnGeoTags = [];
            let index;
            for (let i = lastID + 1; i < geotags.length && numberOfGeotags > 0; i++ ) {
                if (geotags[i] !== undefined) {
                    const tempName = geotags[i].name;
                    const tempHashtag = geotags[i].hashtag;
                    if (tempName === term || tempHashtag === term) {
                        returnGeoTags.push(geotags[i]);
                        index = i;
                        numberOfGeotags--;
                    }
                }
            }
            console.log("search for GeoTags (Term: " + term  +")")
            return {geotags : returnGeoTags, index : index};
        },


        addGeoTag : function (tempGeoTag) {
            geotags.push(tempGeoTag);
            console.log("add GeoTag");
        },

        removeGeoTag : function (tempGeoTag) {
            let index = geotags.indexOf(tempGeoTag);
            if (index > -1) {
                geotags.splice(index, 1);
            }
            console.log("remove GeoTag")
        },
    };

})();
/**
 * page Size
 */

const PAGE_SIZE = 5;

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 */


app.get('/', function(req, res) {
    res.render('gta');
});


/**
 * Route mit Pfad '/geotags' für HTTP 'POST' Requests.
 * initialises a new session
 * the routes() method is called to get all geotags from the first page
 * returns page 0 to the user
 */

app.post("/geotags", function (req, res) {
    let body = req.body;
    geoTagModul.addGeoTag(JSON.parse(body.geotag));
    res.location("/geotags/" + (geoTagModul.geotags.length - 1));
    //initialize session params
    req.session.query = {};
    req.session.lastID = -1;
    req.session.list = [];
    //get items from route
    let responseObject = routes(req.session, 0);
    res.json(responseObject);
});



/**
 * Route mit Pfad '/geotags' für HTTP 'GET' Requests.
 * Uses sessions to manage search [list] of every current search of every user
 * A search has been initialized if a query has already been stored in the session and the url query params include a page [page] field
 *
 * If this is the case: data will be extracted from the saved 'session.list' in the session
 * If not, the routes() method is called to search for the next [PAGE_SIZE] objects of the table page
 *
 * If a session doesnt exist yet or a new search is called, the routes() method is called with starting page '0'
 * The query, page and list is saved in the session
 *
 * returns page 0 of the specified route if no session is active
 * returns page [page] of the route already defined in the first search, stored in 'session.query'
 */

app.get("/geotags", function (req,res) {

    const query = req.query;
    const session = req.session;
    let responseObject;

    //search has already been searched defined through page-search
    if (query.page && session.query) {
        const page = parseInt(query.page);
        if (Math.floor(session.list.length/ PAGE_SIZE)  <= page) {
            console.log("load new data in existing session");
            // not in session cash yet
            responseObject = routes(session, page);

        }
        //page has already been loaded at some point
        else {
            console.log("load data from cache");
            //cut page items from cache list
            responseObject = formatResponse(session, page);
        }
    }
    //new search
    else {
        if (query.page) res.json({geotags : [], page: 0, next: false}); //if the page query param is send, no new search is initialized
        console.log("create new search");
        //setup session for routes()
        session.query = query;
        session.lastID = -1;
        session.list = [];
        //run routes()
        responseObject = routes(session, 0);
        //set session.list cache
    }
    res.json(responseObject);
});

/**
 * Route 0: search for term, if term in query exists
 * Route 1: search by radius, if radius in query exists
 * Route 2: get all items on page
 * @param session session
 * @param page page
 * @returns {{next: boolean, geotags: *[], page}}
 */

function routes (session, page) {
    let list;
    let lastID = session.lastID;
    let query = session.query;
    const numLoadingObject = (page+1) * PAGE_SIZE - session.list.length + 1;

    //Route 0: search for name
    if (query.term !== undefined &&  query.term !== "") {
        console.log("route: term");
        //search for term until [numLoadingObjects] geotags are found (upper limit)
        list = geoTagModul.searchTerm(query.term, lastID, numLoadingObject);
    }
    //Route 1: search by radius
    else if (query.radius !== undefined && query.radius !== "" && !isNaN(query.radius)) {
        console.log("route: radius");
        //search for radius until [numLoadingObjects] geotags are found (upper limit)
        list = geoTagModul.searchByCoordinates(query.myLong,query.myLat,query.radius, lastID, numLoadingObject);
    }
    //Route 2: get all geotags
    else {
        console.log("route: all");
        //search for all geotag's in geotags
        list = geoTagModul.getGeotags(session.lastID, numLoadingObject);
    }

    //save list in cache
    session.list = session.list.concat(list.geotags);
    const responseObject = formatResponse(session, page);
    //set session.lastID is the index of the last geotag in geotags[]; needs to be stored in session to know where to start searching again
    session.lastID = (list.index > session.lastID ? list.index : session.lastID);
    return  responseObject;
}


/**
 * response Structure: {geotags: [type : array], page : [type : number], next [type: boolean]}
 * @param session
 * @param page
 * @returns {{next: boolean, geotags: *[], page}}
 */

function formatResponse(session, page) {
    //check if a next page exists
    let nextBoolean = session.list[(page+1)*PAGE_SIZE] !== undefined;
    //format response object
    return  {geotags : spliceList(page*PAGE_SIZE, (page + 1) * PAGE_SIZE, session.list), page : page , next : nextBoolean};
}

/**
 *
 * @param list
 * @param from
 * @param to
 * @returns {any[]} returns the [pageSize] amount of objects from [list] on the specified [page]
 */
function spliceList(from, to, list) {
    return list.slice(from, to);
}

/**
 * URI geotags/<id>
 * @type {number}
 */

app.get ("/geotags/:id", function (req, res) {
    let geotag = (geoTagModul.geotags)[req.params.id];
    if (geotag !== undefined) {
        res.json(geotag);
    } else {
        res.send(null);
    }
});

app.put("/geotags/:id", function (req, res) {
    let body = req.body;
    (geoTagModul.geotags)[req.params.id] = JSON.parse(body.geotag);
    res.location("/geotags/" + req.params.id);
    res.status(201).send(null);
});

app.delete("/geotags/:id", function (req, res) {
    geoTagModul.geotags.splice(req.params.id, 1);
    res.send(null);
});

var port = 3000;
app.set('port', port);



var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);


