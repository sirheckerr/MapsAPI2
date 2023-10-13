let map;
let service;
let infoWindowRestaurant;
let infoWindowCurrentLocation;
let currentLocationMarker;
let radiusCircle;
let markers = [];
let currentRadius = 3000;
let directionsService;
let directionsRenderer;
let buttonPressed = false; // if button pressed "false" dnt do nothin
let initialCircleCenter;

function initializeMap() {
    const myLat = 48.4284;
    const myLong = -123.3656;
    const myLocation = new google.maps.LatLng(myLat, myLong);

    // circle center your location
    initialCircleCenter = myLocation;

    map = new google.maps.Map(document.getElementById("map"), {
        center: myLocation,
        zoom: 13,
    });

    infoWindowCurrentLocation = new google.maps.InfoWindow();
    infoWindowRestaurant = new google.maps.InfoWindow();

    // radius Circle
    radiusCircle = new google.maps.Circle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.3,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.1,
        map,
        center: initialCircleCenter,
        radius: currentRadius,
        visible: false,
    });

    const locationButton = document.createElement("button");
    locationButton.textContent = "Pan to Current Location";
    locationButton.classList.add("custom-map-control-button");

    map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);

    locationButton.addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    // make radius circle go to myLocation when button pressed
                    radiusCircle.setCenter(pos);

                    deleteMarkers();
                    clearDirections();

                    currentLocationMarker = new google.maps.Marker({
                        map,
                        position: pos,
                        title: "Your Location",
                        icon: {
                            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        },
                    });

                    map.setCenter(pos);

                    buttonPressed = true;

                    // Show the radius circle when the button is pressed
                    radiusCircle.setVisible(true);
                    searchForRestaurants(pos, currentRadius);
                },
                () => {
                    handleLocationError(true, infoWindowCurrentLocation, map.getCenter());
                }
            );
        } else {
            handleLocationError(false, infoWindowCurrentLocation, map.getCenter());
        }
    });

  
    // radius slider:
    const radiusSlider = document.createElement("input");
    radiusSlider.type = "range";
    radiusSlider.min = "100";
    radiusSlider.max = "5000";
    radiusSlider.value = currentRadius.toString();
    radiusSlider.classList.add("custom-map-control-slider");

  // circle
    const radiusCircleDiv = document.createElement("div");
    radiusCircleDiv.classList.add("radius-circle");

    map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(radiusSlider);
    map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(radiusCircleDiv);

    radiusSlider.addEventListener("input", () => {
        currentRadius = parseInt(radiusSlider.value);
        updateRadiusCircle();
        searchForRestaurants(currentLocationMarker.getPosition(), currentRadius);
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    directionsRenderer.setPanel(document.getElementById("directions-panel"));
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
        browserHasGeolocation
            ? "Error: The Geolocation service failed."
            : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}

function searchForRestaurants(location, radius) {
    if (buttonPressed) { //only show restaruants when the button pressed In your area
        const request = {
            location: location,
            radius: radius,
            query: "restaurant",
        };

        service = new google.maps.places.PlacesService(map);
        service.textSearch(request, processRestaurants);
    }
}

function processRestaurants(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        deleteMarkers();

        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        const topRatedRestaurants = results.slice(0, 3);

        for (let i = 0; i < results.length; i++) {
            let place = results[i];
            if (isRestaurantWithinRadius(place)) {
                if (topRatedRestaurants.includes(place)) {
                    createMarker(place, 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'); // if top rating in area mark blue
                } else {
                    createMarker(place, 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png');// else mark yellow
                }
            }
        }
    }
}


// radius circle if not within circle then dont show on map.
function isRestaurantWithinRadius(place) {
    if (!place.geometry || !place.geometry.location) return false;

    const restaurantLocation = place.geometry.location;
    const circleCenter = radiusCircle.getCenter();
    const circleRadius = radiusCircle.getRadius();

    const distance = google.maps.geometry.spherical.computeDistanceBetween(
        circleCenter,
        restaurantLocation
    );

    return distance <= circleRadius;
}




// Define a variable to keep track of the current selected marker
let selectedMarker = null;

// Function to show directions from the current location to a selected marker place
function showDirections(place) {
    const request = {
        origin: currentLocationMarker.getPosition(), // origin = your location marker
        destination: place.geometry.location, // destination = selected marker's location
        travelMode: google.maps.TravelMode.DRIVING, // travel mode = currently set to driving
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
        }
    });
}





// Function to create markers and set up their click event
function createMarker(place, customIcon = null) {
    if (!place.geometry || !place.geometry.location) return;

    const scaledIcon = customIcon
        ? {
            url: customIcon,
            scaledSize: new google.maps.Size(30, 30),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(0, 0),
        }
        : {
            url: place.icon,
            scaledSize: new google.maps.Size(30, 30),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(0, 0),
        };

    const marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
        icon: scaledIcon,
        title: place.name,
    });

    // Info when you click on icons includes buttons
    google.maps.event.addListener(marker, "click", () => {
        let contentString =
            "<h3>" +
            place.name +
            "</h3>" +
            "Rating: <b>" +
            place.rating +
            "</b> /5 <p>" +
            place.formatted_address +
            "</p>" +
            
            // direction buttons for driving / transit
            
            "<button class='show-directions-button' data-lat='" + place.geometry.location.lat() + "' data-lng='" + place.geometry.location.lng() + "'>Show Driving Directions</button>" + 
             "<button class='show-bus-directions-button' data-lat='" + place.geometry.location.lat() + "' data-lng='" + place.geometry.location.lng() + "'>Show Bus Route</button>";

      // the actual info content windows
        infoWindowRestaurant.setContent(contentString || "");
        infoWindowRestaurant.open(map, marker);

        // Add a click event listener to the "Show Directions" button
        document.querySelector('.show-directions-button').addEventListener('click', function() {
            const lat = parseFloat(this.getAttribute('data-lat'));
            const lng = parseFloat(this.getAttribute('data-lng'));
          

            const request = {
                origin: currentLocationMarker.getPosition(),// origin = your location marker
                destination: new google.maps.LatLng(lat, lng), // destination = selected marker's location
                travelMode: google.maps.TravelMode.DRIVING, // sets travel mode/directins to driving aka accesible roads only
            };

            directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    directionsRenderer.setDirections(result);
                }
            });
        });
      
      
       document.querySelector('.show-bus-directions-button').addEventListener('click', function() {
            const lat = parseFloat(this.getAttribute('data-lat'));
            const lng = parseFloat(this.getAttribute('data-lng'));
          

            const request = {
                origin: currentLocationMarker.getPosition(), // orgin = yur location marker
                destination: new google.maps.LatLng(lat, lng), // destination = selectected markers location (where you want to travel to)
                travelMode: google.maps.TravelMode.TRANSIT, // sets travel mode/directions to TRANSIT aka a bit of walking through anything to bus stops.
            };

            directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    directionsRenderer.setDirections(result);
                }
            });
        });
    });

    markers.push(marker);
}



function setMapOnAll(map) {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}

function hideMarkers() {
    setMapOnAll(null);
}

function showMarkers() {
    setMapOnAll(map);
}

function deleteMarkers() {
    hideMarkers();
    markers = [];
}


// idrk how this works, found on youtube
function updateRadiusCircle() {
    if (radiusCircle && buttonPressed) { // Only update the circle if the button has been pressed
        radiusCircle.setRadius(currentRadius);

        const radiusText = `${(currentRadius / 1000).toFixed(2)} km`;
        const circleCenter = radiusCircle.getCenter();

        const labels = document.getElementsByClassName("radius-label");
        for (let i = 0; i < labels.length; i++) {
            labels[i].remove();
        }

        const radiusLabel = document.createElement("div");
        radiusLabel.classList.add("radius-label");
        radiusLabel.textContent = radiusText;
        map.controls[google.maps.ControlPosition.CENTER].push(radiusLabel);
    }
}


// clear directions after closed
function clearDirections() {
    directionsRenderer.setDirections({ routes: [] });
}

window.onload = initializeMap;
