/**
 * "console.log" schreibt auf die Konsole des Browsers
 * Das Konsolenfenster muss im Browser explizit geöffnet werden.
 */
console.log("The script is going to start...");


// Mock-Up
/*GEOLOCATIONAPI = {
    getCurrentPosition: function(onsuccess) {
        onsuccess({
            "coords": {
                "latitude": 49.013790,
                "longitude": 8.390071,
                "altitude": null,
                "accuracy": 39,
                "altitudeAccuracy": null,
                "heading": null,
                "speed": null
            },
            "timestamp": 1540282332239
        });
    }
};*/

function getId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function GeoTagObject(longitude, latitude, name, hashtag, myLat, mylong) {
    this.longitude = longitude;
    this.latitude = latitude;
    this.name = name;
    this.hashtag = hashtag;
    this.myLat = myLat;
    this.myLong = mylong;
    this.id = getId();
}

// Die echte API ist diese.
GEOLOCATIONAPI = navigator.geolocation;

/**
 * GeoTagApp Locator Modul
 */
var gtaLocator = (function GtaLocator(geoLocationApi) {

    // Private Member
    var pageIndex = 1;

    /**
     * Funktion spricht Geolocation API an.
     * Bei Erfolg Callback 'onsuccess' mit Position.
     * Bei Fehler Callback 'onerror' mit Meldung.
     * Callback Funktionen als Parameter übergeben.
     */
    var tryLocate = function(onsuccess, onerror) {
        if (geoLocationApi) {
            geoLocationApi.getCurrentPosition(onsuccess, function(error) {
                var msg;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        msg = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        msg = "An unknown error occurred.";
                        break;
                }
                onerror(msg);
            });
        } else {
            onerror("Geolocation is not supported by this browser.");
        }
    };

    // Auslesen Breitengrad aus der Position
    var getLatitude = function(position) {
        return position.coords.latitude;
    };

    // Auslesen Längengrad aus Position
    var getLongitude = function(position) {
        return position.coords.longitude;
    };

    // Hier API Key eintragen
    var apiKey = "SAu0OgVe2gHWkttxGUx4aLMaYWD8qmKw";

    /**
     * lat, lon : aktuelle Koordinaten (hier zentriert die Karte)
     * tags : Array mit Geotag Objekten, das auch leer bleiben kann
     * zoom: Zoomfaktor der Karte
     */
    var getLocationMapSrc = function(lat, lon, tags, zoom) {
        zoom = typeof zoom !== 'undefined' ? zoom : 10;

        if (apiKey === "YOUR_API_KEY_HERE") {
            console.log("No API key provided.");
            return "images/mapview.jpg";
        }

        var tagList = "&pois=You," + lat + "," + lon;
        if (tags !== undefined) tags.forEach(function(tag) {
            if(tag.name && tag.latitude && tag.longitude)
            tagList += "|" + tag.name + "," + tag.latitude + "," + tag.longitude;
        });

        var urlString = "https://www.mapquestapi.com/staticmap/v4/getmap?key=" +
            apiKey + "&size=600,400&zoom=" + zoom + "&center=" + lat + "," + lon + "&" + tagList;

        console.log("Generated Maps Url: " + urlString);
        return urlString;
    };

    function buildListWithPager(geotags, numberOfPages, module) {
        let html = [];
        let pagingHtml = [];
        geotags.forEach(function(gtag){
            html.push(`<li>${gtag.name} (${gtag.latitude}, ${gtag.longitude}) ${gtag.hashtag}</li>`);
        });

        if (numberOfPages != 0) {
            pagingHtml.push(`<button id="backward"><<</button>`);
            for(var i = 1; i < numberOfPages + 1; i++) {
                if (i == pageIndex) {
                    console.log("was in here");
                    pagingHtml.push(`<button style="background-color: #5bc0de" id = ${i} > ${i} </button>`);
                } else {
                    pagingHtml.push(`<button id = ${i} > ${i} </button>`);
                }
            }
            pagingHtml.push(`<button id="forward">>></button>`);
        }

        document.getElementById("paging").innerHTML = pagingHtml.join("");
        document.getElementById("results").innerHTML = html.join("");
        addEventListenerForBackward(numberOfPages);
        addEventListenerForForward(numberOfPages);
        addEventListenerForPager(numberOfPages);
    }

    function addEventListenerForBackward(numberOfPages) {
        let backwardButton = document.getElementById("backward");
        backwardButton.onclick = function () {
            if (pageIndex <= numberOfPages && pageIndex > 1) {
                pageIndex = pageIndex - 1;
                var ajax = new XMLHttpRequest();
                ajax.onreadystatechange = function () {
                    if (ajax.readyState == 4) {
                        let json = ajax.response;
                        let module = JSON.parse(json);
                        let geotags = module.taglist;
                        let numberOfPages = module.numberOfPages;
                        buildListWithPager(geotags, numberOfPages, module);
                    }
                }
                let myLong = document.getElementById("myLongTagging").value
                let myLat = document.getElementById("myLatTagging").value
                ajax.open("GET", "/geotags?pageIndex=" + pageIndex + "&myLat=" + myLat + "&myLong=" + myLong, true);
                ajax.send();
            }
        }
    }

    function addEventListenerForForward(numberOfPages) {
        let forwardButton = document.getElementById("forward");
        forwardButton.onclick = function() {
            if (pageIndex >= 1 && pageIndex < numberOfPages) {
                pageIndex = pageIndex + 1;
                var ajax = new XMLHttpRequest();
                ajax.onreadystatechange = function () {
                    if(ajax.readyState == 4) {
                        let json = ajax.response;
                        let module = JSON.parse(json);
                        let geotags = module.taglist;
                        let numberOfPages = module.numberOfPages;
                        buildListWithPager(geotags, numberOfPages, module);
                    }
                }
                let myLong = document.getElementById("myLongTagging").value
                let myLat = document.getElementById("myLatTagging").value
                ajax.open("GET", "/geotags?pageIndex="+pageIndex+"&myLat="+myLat+"&myLong="+myLong, true);
                ajax.send();
            }
        }
    }

    function addEventListenerForPager(numberOfPages) {
        var buttons = [];
        if (numberOfPages != 0) {
            for(var i = 1; i < numberOfPages + 1; i++) {
                let pagingButton = document.getElementById(i.toString());
                buttons.push(pagingButton);
            }
            buttons.forEach(function(button) {
                button.onclick = function() {
                    pageIndex = button.id;
                    var ajax = new XMLHttpRequest();
                    ajax.onreadystatechange = function () {
                        if(ajax.readyState == 4) {
                            let json = ajax.response;
                            let module = JSON.parse(json);
                            let geotags = module.taglist;
                            let numberOfPages = module.numberOfPages;
                            buildListWithPager(geotags, numberOfPages, module);
                        }
                    }
                    let myLong = document.getElementById("myLongTagging").value
                    let myLat = document.getElementById("myLatTagging").value
                    ajax.open("GET", "/geotags?pageIndex="+pageIndex+"&myLat="+myLat+"&myLong="+myLong, true);
                    ajax.send();
                }
            })
        }
    }

    return { // Start öffentlicher Teil des Moduls ...

        // Public Member

        readme: "Dieses Objekt enthält 'öffentliche' Teile des Moduls.",

        updateLocation: function() {
            var taglist_json = document.getElementById("result-img").getAttribute("data-tags");
            var taglist = JSON.parse(taglist_json);
            if (document.getElementById("myLongTagging").value === "" &&  document.getElementById("myLatTagging").value === "") {
                tryLocate(function (position) {
                    var longitude =  getLongitude(position);
                    var latitude = getLatitude(position);
                    document.getElementById("latInput").setAttribute("value", latitude);
                    document.getElementById("longInput").setAttribute("value", longitude);

                    document.getElementById("myLatTagging").setAttribute("value", latitude);
                    document.getElementById("myLongTagging").setAttribute("value", longitude);

                    document.getElementById("myLatDiscovery").setAttribute("value", latitude);
                    document.getElementById("myLongDiscovery").setAttribute("value", longitude);

                    document.getElementById("result-img").setAttribute("src", getLocationMapSrc(latitude, longitude, taglist, 5));
                }, function (msg) {
                    alert(msg);
                });
            } else {
                var lat = document.getElementById("myLatDiscovery").value;
                var long = document.getElementById("myLongDiscovery").value;
                document.getElementById("result-img").setAttribute("src", getLocationMapSrc(lat, long, taglist, 5));
            }
        },

        geoTagAdded: function(event) {
            //Prevent default Forumlar Post
            event.preventDefault();

            var ajax = new XMLHttpRequest();
            ajax.open("POST", "/geotags", true);

            ajax.onreadystatechange = function () {
                if(ajax.readyState == 4) {
                    let json = ajax.response;
                    let module = (JSON.parse(json));
                    let geotags = module.taglist;
                    let numberOfPages = module.numberOfPages;
                    buildListWithPager(geotags, numberOfPages, module);
                    document.getElementById("result-img").setAttribute("src", getLocationMapSrc(module.myLat, module.myLong, geotags, 5));
                }
            }

            // Create new geoTag
            var longitude = document.getElementById("longInput").value;
            var latitude = document.getElementById("latInput").value;
            var name = document.getElementById("nameInput").value;
            var hashtag = document.getElementById("hashtagInput").value;
            var myLong = document.getElementById("myLongTagging").value
            var myLat = document.getElementById("myLatTagging").value
            var geotagObject = new GeoTagObject(longitude, latitude, name, hashtag, myLat, myLong);

            // send Geotag with POST
            ajax.setRequestHeader("Content-Type", "application/json");
            ajax.send(JSON.stringify(geotagObject));
        },

        geoTagsFitlered: function(event) {
            //Prevent default Forumlar Post
            event.preventDefault();

            var ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if(ajax.readyState == 4) {
                    var json = ajax.response;
                    var module = JSON.parse(json);
                    var geotags = module.taglist;
                    let numberOfPages = module.numberOfPages;
                    buildListWithPager(geotags, numberOfPages, module);
                    document.getElementById("result-img").setAttribute("src", getLocationMapSrc(module.myLat, module.myLong, geotags, 5));
                }
            }
            var searchTerm = document.getElementById("searchInput").value;
            var myLong = document.getElementById("myLongTagging").value
            var myLat = document.getElementById("myLatTagging").value
            ajax.open("GET", "/geotags?searchterm="+searchTerm+"&myLat="+myLat+"&myLong="+myLong, true);
            ajax.send();
        },
    }; // ... Ende öffentlicher Teil
})(GEOLOCATIONAPI);

/**
 * $(function(){...}) wartet, bis der DOM fertig aufgebaut wurde. Dann wird die
 * angegebene Funktion aufgerufen.
 */
$(function() {
    gtaLocator.updateLocation(GEOLOCATIONAPI);

    // Add EventListener
    var addGeoTagButton = document.getElementById("submitTagging");
    var filterButton = document.getElementById("submitDiscovery");
    addGeoTagButton.addEventListener("click", gtaLocator.geoTagAdded);
    filterButton.addEventListener("click", gtaLocator.geoTagsFitlered);
});