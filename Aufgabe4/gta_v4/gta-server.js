
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

        /**
         *
         * @param list
         * @param from
         * @param to of geotags
         * @returns {any[]} returns the [pageSize] amount of objects from [list] on the specified [page]
         */
        spliceList: function (from, to, list) {
              list = JSON.parse(JSON.stringify(list));
              return list.slice(from, to);
        },

        searchByCoordinates : function (tempLong, tempLat, radius, lastID, pageSize) {
            let returnGeoTags = [];
            //check if there are going to be more pages by finding pageSize + 1 geotags
            pageSize++;
            for (let i = lastID + 1; i < geotags.length && pageSize > 0; i++ ) {
                if (geotags[i] !== undefined) {
                    const paramLong = geotags[i].longitude;
                    const paramLat = geotags[i].latitude;
                    if (calcDistance(paramLat, paramLong, tempLat, tempLong) <= radius) {
                        returnGeoTags.push(geotags[i]);
                        pageSize--;
                    }
                }
            }
            console.log("search for GeoTags (Radius)")
            return returnGeoTags;
        },

        searchTerm : function (tempStr, lastID, pageSize) {
            let returnGeoTags = [];
            pageSize++;
            for (let i = lastID + 1; i < geotags.length && pageSize > 0; i++ ) {
                if (geotags[i] !== undefined) {
                    const tempName = geotags[i].name;
                    const tempHashtag = geotags[i].hashtag;
                    if (tempName === tempStr || tempHashtag === tempStr) {
                        returnGeoTags.push(geotags[i]);
                        pageSize--;
                    }
                }
            }
            console.log("search for GeoTags (Term: " + tempStr  +")")
            return returnGeoTags;
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
    req.session.query = {};
    let responseObject = routes(req.session, 0);
    req.session.list = responseObject.geotags;
    res.json(responseObject);
});



/**
 * Route mit Pfad '/geotags' für HTTP 'GET' Requests.
 * uses sessions to manage cash of every current search of every user
 * if a session already exists, check if page has already been loaded.
 *
 * If this is the case: data will be extracted from the saved list in the session
 * If not, the routes() method is called to search for the next few objects of the table page
 *
 * If a session doesnt exist yet or a new search has been started, the routes() method is called with page 0
 * The query, page and list is saved in the session
 *
 * returns page 0 of the specified route if no session is activ
 * returns page [page] of the route already defined in the first search
 */

app.get("/geotags", function (req,res) {

    let body = req.query;
    let session = req.session;
    let responseObject;

    //search has already been searched defined through page-search
    if (body.page && session.query) {
        if (session.list.length <= body.page * PAGE_SIZE) {
            console.log("load new data in existing session");
            // not in session cash yet
            responseObject = routes(session, body.page);
            session.list = session.list.concat(responseObject.geotags);
        } else { // already loaded at some point
            console.log("load data from cash");
            responseObject = formatResponse(geoTagModul.spliceList(body.page*PAGE_SIZE, body.page*PAGE_SIZE+PAGE_SIZE + 1, session.list), body.page);
        }
    }
    //new search
    else {
        if (body.page) res.json({geotags : [], page: 0, next: false});
        console.log("create new search");
        //run query
        session.query = body;
        session.page = 0;
        responseObject = routes(session, 0);
        //save query results in session
        session.list = responseObject.geotags;
    }
    res.json(responseObject);
});


function routes (session, page) {
    let list;
    let lastID = session.lastID;
    let query = session.query;
    //Route 0: search for name
    if (query.term !== undefined &&  query.term !== "") {
        console.log("route: term");
        console.log(((page*PAGE_SIZE) + PAGE_SIZE) - (session.page*PAGE_SIZE));
        list = geoTagModul.searchTerm(query.term, lastID, ((page*PAGE_SIZE) + PAGE_SIZE) - (session.page*PAGE_SIZE));
        list = geoTagModul.spliceList(page*PAGE_SIZE,(page*PAGE_SIZE) +PAGE_SIZE + 1,list);
    }
    //Route 1: search by radius
    else if (query.radius !== undefined && query.radius !== "") {
        if (isNaN(query.radius)) {return undefined;}
        console.log("route: radius");
        list = geoTagModul.searchByCoordinates(query.myLong,query.myLat,query.radius, lastID, ((page*PAGE_SIZE) + PAGE_SIZE) - (session.page*PAGE_SIZE));
        list = geoTagModul.spliceList(page*PAGE_SIZE,(page*PAGE_SIZE) +PAGE_SIZE + 1,list);
    }
    //Route 2: get all geotags
    else {
        console.log("route: all");
        //get the first [pageSize + 1] amount of geotags for page 0
        list = geoTagModul.spliceList(page*PAGE_SIZE,(page*PAGE_SIZE) +PAGE_SIZE + 1,geoTagModul.geotags());
    }
    session.lastID = geoTagModul.geotags().indexOf(list[list.length - 1]);
    session.page = (page > session.page ? page : session.page);
    return  formatResponse(list, page);
}

/**
 * response Structure: {geotags: [type : array], page : [type : number], next [type: boolean]}
 * @param list
 * @param page
 * @returns {{next: boolean, geotags: *[], page}}
 */

function formatResponse(list, page) {
    let nextBoolean = list.length > PAGE_SIZE;
    return  {geotags : (nextBoolean ? geoTagModul.spliceList(0, PAGE_SIZE, list) : list), page : page , next : nextBoolean};
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


