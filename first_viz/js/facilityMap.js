/**
 * Drawing a map using leaflet
 */

// Create the map, centered roughly on the North Meck are
var map; // = L.map("facilityMap-container").setView([35.48, -80.85], 11); //11 is the zoom level.  // Use var so the variable can be accessed in main.js

//Leaflet takes the id string directly; unlike d3 that uses a css selector i.e. d3.select("#facilityMap-container")



function initMap() {

if (map) return;

map = L.map("facilityMap-container").setView([35.48, -80.85], 11); //11 is the zoom level


// Add the OpenStreetMap tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors" //The attribution text is required by OpenStreetMap's usage policy (for credit)
}).addTo(map);



/**
 * Load facility data and add markers - before cleaning the data and having grouped facilities. 
 *
d3.csv("data/Cornelius_mh_su_facilities.csv").then(function(facilities) {

    facilities.forEach(function(facility) {
        const lat = +facility.latitude;
        const lng = +facility.longitude; 

        L.marker([lat, lng])
         .addTo(map)
         .bindPopup(`<strong>${facility.name1}</strong><br>${facility.street1}, ${facility.city}`);
         //bindPopup attaches a small info box that appears when you click the marker (in this case, it will show the facility name and address).
    });
});
*/



/**
 * Loading and Cleaning up the data a little bit (to account for facilities that are classified under multiple types of facilities 
 * and therefore have duplicated rows).
 */

// Creating grouped facilities logic --> Instead of having one entry per row which leads to duplicate values,
// we have one entry per physical location. That is, the goruped facilities is a list where the facilities appear once
// and any services it offers are bundled inside it e.g. type_facility: ["MH", "SU"]


d3.csv("data/mh_su_facilities.csv").then(function(facilities) {
    
    // Step 1: Group rows by location
    // Create a container to hold the list of facilities: 
    const facilityGroups = new Map();

    facilities.forEach(function(facility) {
        const lat = +facility.latitude;
        const lng = +facility.longitude;

        // check for missing lat and lng values.
        if (!lat || !lng){
            console.log("Missing coordinates for:", facility.name1, facility.latitude, facility.longitude);
            return; // For now, skips the row --> Eliminate the facilities without lat and lng (Will get back
            //to this and manually find the lat and lng then add it to the csv).
        }  

        const key = `${lat}, ${lng}`;


        if (!facilityGroups.has(key)) {
            facilityGroups.set(key, {
                name: facility.name1,
                address: `${facility.street1}, ${facility.city}`,
                lat: lat,
                lng: lng,
                types: [facility.type_facility]
            });
        } else{
            facilityGroups.get(key).types.push(facility.type_facility);
        }
    });

    const groupedFacilities = Array.from(facilityGroups.values());

    //console.log("Original rows:", facilities.length);
    //console.log("Grouped facilities:", groupedFacilities.length);

    // Create a reference point for the town of Cornelius
    const corneliusCenter = L.latLng(35.4806, -80.8606);

    // Create a variable that references the current center or address that the user inputs. 
    let activeCenter = corneliusCenter; 

    // Create an array to keep track of all the markers so we can filter them later
    const allMarkers = [];

    // Create a variable to track the user's address marker and the radius buffer circle so we can replace it when there are new searches
    let userMarker = null;
    let radiusCircle = null; 

    // Step 2: Create one marker per grouped facility for the map (We stored them in an array above for reference when filtering by radius)
    groupedFacilities.forEach(function(facility) {
        const marker = L.marker([facility.lat, facility.lng])
         .addTo(map)
         .bindPopup(`<strong>${facility.name}</strong><br>${facility.address}<br>Type: ${facility.types.join(", ")}`);

    // Calculate the facility's distance from Cornelius center point, in miles
    const facilityLatLng = L.latLng(facility.lat, facility.lng);
    const distanceInMeters = corneliusCenter.distanceTo(facilityLatLng);
    const distanceInMiles = distanceInMeters / 1609.34;

    // Store the marker along with its distance for later filtering
    allMarkers.push({
      marker: marker,
      distance: distanceInMiles
    }); 
  }); // Closes groupedFacilities.forEach ...


  // Reusable function to draw and update the radius buffer circle (around the user's address)
  function updateRadiusCircle (centerPoint, radiusMiles) {
    // Check if a previous circle exists and if so, remove it
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
        radiusCircle = null; // re-initialize it. 
    }

    // Condition: If "All" is selected, don't draw the circle at all
    if (radiusMiles == "All"){
        return; 
    }

    const radiusInMeters = radiusMiles * 1609.34; // Convert the radius to meters because the leaflet function that draws the circle (L.circle) expects the rad to be in meters not miles

    radiusCircle = L.circle(centerPoint, {
        radius: radiusInMeters, 
        color:  "#2a8000", //"#90C7E3",
        fillColor:"#2a8000", // "#90C7E3",
        fillOpacity: 0.13, 
        weight: 1.5
    }).addTo(map); 

    // Zoom/pan out the map so the whole circle is visible
    map.fitBounds(radiusCircle.getBounds());

  } // End of radius circle drawing function 

  // Radius filter button clicks
  document.querySelectorAll(".radius-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
        document.querySelectorAll(".radius-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");

        const selectedRadius = this.dataset.radius;

        // Add a line to update the radius circle based on the current status user address and the user's selected radius  
        updateRadiusCircle(activeCenter, selectedRadius);

        allMarkers.forEach(function(item) {
            if (selectedRadius === "all" || item.distance <= selectedRadius) {
                if (!map.hasLayer(item.marker)) {
                    item.marker.addTo(map);
                }
            }
            else{
                if(map.hasLayer(item.marker)) {
                    map.removeLayer(item.marker);
                }
            }
        });
    });
  }); // End of radius filter button clicks

  
  // Address search
  document.getElementById("address-submit").addEventListener("click", function() {
    const address = document.getElementById("address-input").value;

    if (!address) {
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    fetch(url)
      .then(response => response.json())
      .then(results => {
        if (results.length === 0) {
            alert("Address not found. Please try again.");
            return;
        }

        const userLat = parseFloat(results[0].lat);
        const userLng = parseFloat(results[0].lon);
        const userLocation = L.latLng(userLat, userLng);

        // Update the activeCenter so it matches the user's current search location/address
        activeCenter = userLocation; 


        // Remove the previous user marker if one exists
        if (userMarker) {
            map.removeLayer(userMarker);
        }

        // Add a new green circle marker to signal the user's address
        userMarker = L.circleMarker(userLocation, {
            radius: 10,
            color: "#2E8B57",  // circle border color
            fillColor: "#2E8B57", // fill color
            fillOpacity: 0.8
        }).addTo(map)
          .bindPopup("Your location");

        allMarkers.forEach(function(item) {
            const markerLatLng = item.marker.getLatLng();
            const distanceInMeters = userLocation.distanceTo(markerLatLng);
            item.distance = distanceInMeters / 1609.34;
        }); 

        map.setView(userLocation, 14);

        const activeBtn = document.querySelector(".radius-btn.active");
        const selectedRadius = activeBtn.dataset.radius;

        allMarkers.forEach(function(item) {
            if (selectedRadius === "all" || item.distance <= selectedRadius) {
                if (!map.hasLayer(item.marker)) {
                    item.marker.addTo(map); 
                }
            }
            else {
                if (map.hasLayer(item.marker)){
                    map.removeLayer(item.marker);
                }
            }
        });
      });

  }); // End of address search 


}); // closes d3.csv(...).then()


} // Closes the initMap() function