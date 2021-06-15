/**
 * "console.log" schreibt auf die Konsole des Browsers
 * Das Konsolenfenster muss im Browser explizit geöffnet werden.
 */
console.log("The script is going to start...");

/**
 * Geotag Constructor
 */
function GeoTagObject(longitude, latitude, name, hashtag) {
    this.longitude = longitude;
    this.latitude = latitude;
    this.name = name;
    this.hashtag = hashtag;
}


/**
 * creates ajax object
 * @type {XMLHttpRequest}
 */
const ajax = new XMLHttpRequest();

/**
 * ajax response listener
 */

ajax.onreadystatechange = function() {
    if (ajax.readyState === 4) {
        console.log(JSON.parse(ajax.responseText));
        gtaLocator.updateLocation(JSON.parse(ajax.responseText));
    }
};

/**
 * checks if all required form fields are filled
 * @param formID
 * @returns {boolean}
 */
function checkRequired(formID) {
    let bool = true;
    document.getElementById(formID).querySelectorAll("[required]").forEach(function (item) {
        if (item.value.length === 0) bool = false;
    });
    return bool;
}

/**
 * click listener for tag-form
 */
document.getElementById("submitTagging").addEventListener("click",function (event) {
    if  (checkRequired("tag-form")) {
        //DOM objects
        const latInput = document.getElementById("latInput");
        const longInput = document.getElementById("longInput");
        const nameInput = document.getElementById("nameInput");
        const hashtagInput = document.getElementById("hashtagInput");
        //create body
        let geotag = new GeoTagObject(longInput.value, latInput.value, nameInput.value, hashtagInput.value);
        //Ajax Post request
        ajax.open("POST", "/geotags", true);
        ajax.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        ajax.send("geotag=" + JSON.stringify(geotag));
        event.preventDefault();
    }

});

/**
 * click listener for filter-form
 * @type {number}
 */

const RADIUS = 500; //km

document.getElementById("submitDiscovery").addEventListener("click",function (event) {
    if (checkRequired("filter-form")) {
        //DOM objects
        const myLong = document.getElementById("myLongDiscovery");
        const myLat = document.getElementById("myLatDiscovery");
        const searchInput = document.getElementById("searchInput");
        //create body
        let body = (searchInput.value === "" ?  "radius=" + RADIUS : "term=" + searchInput.value ) + "&myLong=" + myLong.value + "&myLat=" + myLat.value ;
        //ajax post request
        ajax.open("GET", "/geotags?" + body);
        ajax.send(null);
        event.preventDefault();
    }
});


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

        updateLocation: function(taglist) {
            if (document.getElementById("myLongDiscovery").value === "" &&  document.getElementById("myLatDiscovery").value === "") {
                tryLocate(function (position) {
                    let longitude =  getLongitude(position);
                    let latitude = getLatitude(position);

                    document.getElementById("latInput").setAttribute("value", latitude);
                    document.getElementById("longInput").setAttribute("value", longitude);
                    document.getElementById("myLatDiscovery").setAttribute("value", latitude);
                    document.getElementById("myLongDiscovery").setAttribute("value", longitude);

                    document.getElementById("result-img").setAttribute("src", getLocationMapSrc(latitude, longitude, taglist, 5));
                }, function (msg) {
                    alert(msg);
                });
            } else {
                let lat = document.getElementById("myLatDiscovery").value;
                let long = document.getElementById("myLongDiscovery").value;
                document.getElementById("result-img").setAttribute("src", getLocationMapSrc(lat, long, taglist, 5));
            }
            updateList(taglist);
        }

    }; // ... Ende öffentlicher Teil
})(GEOLOCATIONAPI);


function updateList(taglist) {
    let ul = document.getElementById("results");
    //remove all children
    while (ul.lastElementChild) {
        ul.removeChild(ul.lastElementChild);
    }
    //add new children
    taglist.forEach(function(item){
        let li = document.createElement("li");
        li.innerText = item.name + " (" + item.latitude + ", " + item.longitude + ") " + item.hashtag;
        ul.appendChild(li);
    });
}


/**
 * $(function(){...}) wartet, bis der DOM fertig aufgebaut wurde. Dann wird die
 * angegebene Funktion aufgerufen.
 */
$(function() {
    ajax.open("GET", "/geotags", true);
    ajax.send(null);
});