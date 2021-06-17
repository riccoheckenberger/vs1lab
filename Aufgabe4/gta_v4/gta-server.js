
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

        geotags : function () {
            //deep copy -> no problems when using splice-function
            return JSON.parse(JSON.stringify(geotags));
        },

        getGeotags : function (lastID, numberOfGeotags) {
            let list =  spliceList(lastID + 1, lastID + numberOfGeotags + 1, geotags);
            return {geotags : list, index: lastID + list.length };
        },



        searchByCoordinates : function (tempLong, tempLat, radius, lastID, numberOfGeotags) {
            let returnGeoTags = [];
            let index;
            for (let i = lastID + 1; i < geotags.length && numberOfGeotags > 0; i++ ) {
                console.log(geotags[i]);
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

        searchTerm : function (tempStr, lastID, numberOfGeotags) {
            let returnGeoTags = [];
            let index;
            for (let i = lastID + 1; i < geotags.length && numberOfGeotags > 0; i++ ) {
                if (geotags[i] !== undefined) {
                    const tempName = geotags[i].name;
                    const tempHashtag = geotags[i].hashtag;
                    if (tempName === tempStr || tempHashtag === tempStr) {
                        returnGeoTags.push(geotags[i]);
                        index = i;
                        numberOfGeotags--;
                    }
                }
            }
            console.log("search for GeoTags (Term: " + tempStr  +")")
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
    res.location("/geotags/" + (geoTagModul.geotags().length - 1));
    //initialize session params
    req.session.query = {};
    req.session.lastID = -1;
    req.session.page = -1;
    //get items from route
    let responseObject = routes(req.session, 0);
    //save list in session.list cache
    req.session.list = responseObject.geotags;
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
        if (session.list.length <= query.page * PAGE_SIZE) {
            console.log("load new data in existing session");
            // not in session cash yet
            responseObject = routes(session, query.page);
            session.list = session.list.concat(responseObject.geotags);
        }
        //page has already been loaded at some point
        else {
            console.log("load data from cache");
            //cut page items from cache list
            const list = spliceList(PAGE_SIZE*query.page ,PAGE_SIZE + PAGE_SIZE * query.page + 1 ,session.list);
            responseObject = formatResponse(list, query.page);
        }
    }
    //new search
    else {
        if (query.page) res.json({geotags : [], page: 0, next: false}); //if the page query param is send, no new search is initialized
        console.log("create new search");
        //run query
        session.query = query;
        session.page = -1;
        session.lastID = -1;
        responseObject = routes(session, 0);
        session.list = responseObject.geotags;
    }
    res.json(responseObject);
});

/**
 * Route 0: search for term, if term in query exists
 * Route 1: search by radius, if radius in query exists
 * Route 2: get all items on page
 * @param session
 * @param page
 * @returns {{next: boolean, geotags: *[], page}}
 */

function routes (session, page) {
    let list;
    let lastID = session.lastID;
    let query = session.query;

    //Route 0: search for name
    if (query.term !== undefined &&  query.term !== "") {
        console.log("route: term");
        const numLoadingObject = (page*PAGE_SIZE) - (session.page*PAGE_SIZE) + 1;
        //search for term until [numLoadingObjects] geotags are found (upper limit)
        list = geoTagModul.searchTerm(query.term, lastID, numLoadingObject);
        console.log(list);
    }
    //Route 1: search by radius
    else if (query.radius !== undefined && query.radius !== "" && !isNaN(query.radius)) {
        console.log("route: radius");
        const numLoadingObject = (page*PAGE_SIZE) - (session.page*PAGE_SIZE) + 1;
        //search for radius until [numLoadingObjects] geotags are found (upper limit)
        list = geoTagModul.searchByCoordinates(query.myLong,query.myLat,query.radius, lastID, numLoadingObject);
    }
    //Route 2: get all geotags
    else {
        console.log("route: all");
        list = geoTagModul.getGeotags(session.lastID, PAGE_SIZE + 1);
    }

    const responseObject = formatResponse(list.geotags, page);
    //set session.lastID is the index of the last geotag in geotags[]; needs to be stored in session to know where to start searching again
    session.lastID = list.geotags.length > PAGE_SIZE ? list.index - 1 : list.index;
    //the last page stored in cache
    session.page = page;
    return  responseObject;
}


/**
 * response Structure: {geotags: [type : array], page : [type : number], next [type: boolean]}
 * @param list
 * @param page
 * @returns {{next: boolean, geotags: *[], page}}
 */

function formatResponse(list, page) {
    //check if a next page exists
    let nextBoolean = list.length > PAGE_SIZE;
    //format response object
    return  {geotags : (nextBoolean ? spliceList(0, PAGE_SIZE, list) : list), page : page , next : nextBoolean};
}

/**
 *
 * @param list
 * @param from
 * @param to of geotags
 * @returns {any[]} returns the [pageSize] amount of objects from [list] on the specified [page]
 */
function spliceList(from, to, list) {
    list = JSON.parse(JSON.stringify(list));
    return list.slice(from, to);
}

/**
 * URI geotags/<id>
 * @type {number}
 */

app.get ("/geotags/:id", function (req, res) {
    let geotag = (geoTagModul.geotags())[req.params.id];
    if (geotag !== undefined) {
        res.json(geotag);
    } else {
        res.send(null);
    }
});

app.put("/geotags/:id", function (req, res) {
    let body = req.body;
    (geoTagModul.geotags())[req.params.id] = JSON.parse(body.geotag);
    res.location("/geotags/" + req.params.id);
    res.status(201).send(null);
});

app.delete("/geotags/:id", function (req, res) {
    geoTagModul.geotags().splice(req.params.id, 1);
    res.send(null);
});

var port = 3000;
app.set('port', port);



var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);


