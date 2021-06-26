/**
 * "console.log" schreibt auf die Konsole des Browsers
 * Das Konsolenfenster muss im Browser explizit geöffnet werden.
 */
console.log("The script is going to start...");

const RADIUS = 500; //km
let zoom = 10;

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
        const response = JSON.parse(ajax.responseText);
        console.log(response);
        gtaLocator.updateLocation(response.geotags);
        updateList(response.geotags, response.page, response.next);
    }
};

/**
 * checks if all required form fields are filled
 * @param formID
 * @returns {boolean}
 */
function checkValidity(formID) {
    let bool = true;
    document.getElementById(formID).querySelectorAll("input").forEach(function (item) {
        if (!item.checkValidity()) bool = false;
    });
    return bool;
}

/**
 * click listener for tag-form
 */
document.getElementById("submitTagging").addEventListener("click",function (event) {
    if  (checkValidity("tag-form")) {
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



document.getElementById("submitDiscovery").addEventListener("click",function (event) {
    if (checkValidity("filter-form")) {
        //DOM objects
        const myLong = document.getElementById("myLongDiscovery");
        const myLat = document.getElementById("myLatDiscovery");
        const searchInput = document.getElementById("searchInput");
        //create body

        //radius or term
        let body;
        if (searchInput.value === "") {
            body = "radius=" + RADIUS;
        } else {
            //if search by # use %23 as #
            body = "term="
            if (searchInput.value.substring(0,1) === "#"){
                body += "%23" + searchInput.value.substring(1);
            } else {
                body += searchInput.value;
            }
        }
        body += "&myLong=" + myLong.value + "&myLat=" + myLat.value ;
        //ajax post request
        ajax.open("GET", "/geotags?" + body);
        ajax.send(null);
        event.preventDefault();
    }
});

document.getElementById("firstPage").addEventListener("click", function () {
    ajax.open("GET", "/geotags?page=" + (document.getElementById("firstPage").value - 1));
    ajax.send(null);
});

document.getElementById("thirdPage").addEventListener("click", function () {
    ajax.open("GET", "/geotags?page=" + (document.getElementById("thirdPage").value - 1));
    ajax.send(null);
});

document.getElementById("backwards").addEventListener("click", function () {
    if (!document.getElementById("firstPage").hidden) {
        ajax.open("GET", "/geotags?page=" + (document.getElementById("firstPage").value - 1));
        ajax.send(null);
    }
});

document.getElementById("forwards").addEventListener("click", function () {
    if (!document.getElementById("thirdPage").hidden) {
        ajax.open("GET", "/geotags?page=" + (document.getElementById("thirdPage").value - 1));
        ajax.send(null);
    }
});

document.getElementById("plus").addEventListener("click", function (){
   if (zoom < 18) {
       zoom++;
       gtaLocator.updateLocation(JSON.parse(document.getElementById("result-img").getAttribute("data-taglist")));
   }
});

document.getElementById("minus").addEventListener("click", function (){
    if (zoom >  0) {
        zoom--;
        gtaLocator.updateLocation(JSON.parse(document.getElementById("result-img").getAttribute("data-taglist")));
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
            document.getElementById("result-img").setAttribute("data-taglist", JSON.stringify(taglist));
            if (document.getElementById("myLongDiscovery").value === "" &&  document.getElementById("myLatDiscovery").value === "") {
                tryLocate(function (position) {
                    let longitude =  getLongitude(position);
                    let latitude = getLatitude(position);

                    document.getElementById("latInput").setAttribute("value", latitude);
                    document.getElementById("longInput").setAttribute("value", longitude);
                    document.getElementById("myLatDiscovery").setAttribute("value", latitude);
                    document.getElementById("myLongDiscovery").setAttribute("value", longitude);

                    document.getElementById("result-img").setAttribute("src", getLocationMapSrc(latitude, longitude, taglist, zoom));
                }, function (msg) {
                    alert(msg);
                });
            } else {
                let lat = document.getElementById("myLatDiscovery").value;
                let long = document.getElementById("myLongDiscovery").value;
                document.getElementById("result-img").setAttribute("src", getLocationMapSrc(lat, long, taglist, zoom));
                let canvas = document.createElement("canvas");
                canvas.setAttribute("id", "game");
                document.querySelector("h1")
                document.body.appendChild(canvas);
            }
        }

    }; // ... Ende öffentlicher Teil
})(GEOLOCATIONAPI);

/**
 * List attributes:
 * Number of Elements per page: 5
 *
 * @param taglist
 * @param page
 * @param next
 */

function updateList(taglist, page, next) {
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
    //reset display
    document.getElementById("firstPage").hidden = true;
    document.getElementById("thirdPage").hidden = true;
    //convert from string to int
    page = parseInt(page);
    //set page numbers and hide buttons if needed
    document.getElementById("secondPage").value = page + 1;
    if (next) {
        document.getElementById("thirdPage").value = page + 2;
        document.getElementById("thirdPage").hidden = false;
    }
    if (page > 0) {
        document.getElementById("firstPage").value = page;
        document.getElementById("firstPage").hidden = false;
    }
    if (page === 0) {
        document.getElementById("firstPage").hidden = true;
    }
}


/**
 * $(function(){...}) wartet, bis der DOM fertig aufgebaut wurde. Dann wird die
 * angegebene Funktion aufgerufen.
 */
$(function() {
    ajax.open("GET", "/geotags", true);
    ajax.send(null);
});