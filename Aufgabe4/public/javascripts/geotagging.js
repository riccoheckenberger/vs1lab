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

function GeoTagObject(longitude, latitude, name, hashtag) {
    this.longitude = longitude;
    this.latitude = latitude;
    this.name = name;
    this.hashtag = hashtag;
}

// Die echte API ist diese.
GEOLOCATIONAPI = navigator.geolocation;

/**
 * GeoTagApp Locator Modul
 */
var gtaLocator = (function GtaLocator(geoLocationApi) {

    // Private Member

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
            tagList += "|" + tag.name + "," + tag.latitude + "," + tag.longitude;
        });

        var urlString = "https://www.mapquestapi.com/staticmap/v4/getmap?key=" +
            apiKey + "&size=600,400&zoom=" + zoom + "&center=" + lat + "," + lon + "&" + tagList;

        console.log("Generated Maps Url: " + urlString);
        return urlString;
    };

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
        updateDiscoveryWidget: function() {

        },

        geoTagAdded: function(event) {
            //Prevent default Forumlar Post
            event.preventDefault();

            var ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if(ajax.readyState == 4) {
                    this.updateLocation();
                }
            }
            var longitude = document.getElementById("longInput").value;
            var latitude = document.getElementById("latInput").value;
            var name = document.getElementById("nameInput").value;
            var hashtag = document.getElementById("hashtagInput").value;

            var geotagObject = GeoTagObject(longitude, latitude, name, hashtag);

            // send cotent with POST
            ajax.overrideMimeType("JSON");
            ajax.open("POST", "http://localhost:3000/", true);
            ajax.send(Json.parse(geotagObject));
        },

        geoTagsFitlered: function(event) {
            //Prevent default Forumlar Post
            event.preventDefault();

            var ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if(ajax.readyState == 4) {
                    this.updateLocation();
                }
            }
            var searchTerm = document.getElementById("searchInput").value;

            // send searchTerm with GET
            ajax.open("GET", "http://localhost:3000/?searchterm="+searchTerm, true);
            ajax.send(null);
        }
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