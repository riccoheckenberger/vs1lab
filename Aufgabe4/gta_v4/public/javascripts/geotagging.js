/**
 * "console.log" schreibt auf die Konsole des Browsers
 * Das Konsolenfenster muss im Browser explizit geöffnet werden.
 */
console.log("The script is going to start...");

var ajax = new XMLHttpRequest();
const radius = 500;

ajax.onreadystatechange = function() {
    if (ajax.readyState === 4) {
    console.log(JSON.parse(ajax.responseText));
    gtaLocator.updateLocation(JSON.parse(ajax.responseText));
    }
}

/* Constructor copied from gta-server.js script
  */

function geoTagObject(longitude, latitude, name, hashtag) {
    this.longitude = longitude;
    this.latitude = latitude;
    this.name = name;
    this.hashtag = hashtag;

}

function checkForEmptyFields (formID) {
    let bool = true;
    document.getElementById(formID).querySelectorAll("input").forEach(function(item) {
        if (!item.checkValidity()) bool = false;
    })
    return bool;
}

document.getElementById("submitTagging").addEventListener("click", function (event) {
    if (checkForEmptyFields("tag-form")) {
        const latInput = document.getElementById("latInput");
        const longInput = document.getElementById("longInput");
        const nameInput = document.getElementById("nameInput");
        const hashtagInput = document.getElementById("hashtagInput");

    const geotag = new geoTagObject (longInput.value,latInput.value,nameInput.value,hashtagInput.value);
    ajax.open("POST","/geotags",true);
    // setRequestHeader method posts data like an HTML form
    ajax.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    ajax.send("geotag=" + JSON.stringify(geotag));
    event.preventDefault();
}});

document.getElementById("submitDiscovery").addEventListener("click", function (event) {
    if (checkForEmptyFields("filter-form")) {
        let myLatInput = document.getElementById("myLatDiscovery");
        let myLongInput = document.getElementById("myLatDiscovery");
        let searchInput = document.getElementById("searchInput");

       // create the body to send back
        let body;
        if (searchInput.value === "") {
            body = "radius=" + radius;
        } else {

            body = "term=" + searchInput.value;
        }

    body += "&myLong=" + myLongInput.value + "&myLat=" + myLatInput.value ;
    //ajax Get request
    ajax.open("GET", "/geotags?" + body);
    console.log("test")
    ajax.send(null);
    event.preventDefault();
}})

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

    //update list of geotags on client-side after server returns new values
    function updateTagList(geotags) {
        //remove all li-elements
        let ul = document.getElementById("results");
        $(ul).empty();

        //add required li-elements
        geotags.forEach(function (item) {
            let li = document.createElement('li');
            li.innerText = "(" + item.latitude + "," + item.longitude + "," + item.name + ")";
            ul.appendChild(li);
        })
    }

    return { // Start öffentlicher Teil des Moduls ...

        // Public Member

        readme: "Dieses Objekt enthält 'öffentliche' Teile des Moduls.",

        /**
         *
         * @param geotags
         */

        updateLocation: function(geotags) {
            if (document.getElementById("myLatDiscovery").value === "" &&  document.getElementById("myLongDiscovery").value === "") {
                    tryLocate(function (position) {
                    const longitude =  getLongitude(position);
                    const latitude = getLatitude(position);

                    document.getElementById("myLatDiscovery").setAttribute("value", latitude);
                    document.getElementById("myLongDiscovery").setAttribute("value", longitude);
                    document.getElementById("latInput").setAttribute("value", latitude);
                    document.getElementById("longInput").setAttribute("value", longitude);
                    document.getElementById("result-img").setAttribute("src", getLocationMapSrc(latitude, longitude, geotags, 5));
                }, function (msg) {
                    alert(msg);
                });
            } else {
                // my location based on the already defined id's myLatDiscovery and myLongDiscovery
                let lat = document.getElementById("myLatDiscovery").value;
                let long = document.getElementById("myLongDiscovery").value;
                document.getElementById("result-img").setAttribute("src", getLocationMapSrc(lat, long, geotags, 5));
            }

            updateTagList (geotags);
        }

    }; // ... Ende öffentlicher Teil
})(GEOLOCATIONAPI);


/**
 * $(function(){...}) wartet, bis der DOM fertig aufgebaut wurde. Dann wird die
 * angegebene Funktion aufgerufen.
 */
$(function() {
    ajax.open("GET", "/geotags", true);
    ajax.send(null);
});