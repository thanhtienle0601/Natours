export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoidGhhbmh0aWVubGUwNjAxIiwiYSI6ImNtMGVvdGw3dDBwN2UybHMxamw0c2c0ODEifQ.8TyhC2MPUa76rCHXMOTA6g';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/thanhtienle0601/cm0es420u00wf01qs0ksec2kc',
    scrollZoom: false,
    // center: [-118.74138, 34.0206085],
    // zoom: 8,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    //add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
