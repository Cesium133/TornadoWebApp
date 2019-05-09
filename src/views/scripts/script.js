require([
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/BasemapToggle",
    "esri/layers/FeatureLayer",
    "esri/widgets/Legend",
    "esri/layers/GraphicsLayer",
    "esri/Graphic"
  ], function(Map, MapView, BasemapToggle, FeatureLayer, Legend, GraphicsLayer, Graphic) {
    
  // GraphicsLayer for displaying results
  var resultsLayer = new GraphicsLayer();

  var map = new Map({
    basemap: "dark-gray-vector",
    // layers: [tornadoLayer, resultsLayer]
  });

  var view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-90.049, 35.1495],
      zoom: 4.75
  });

  var basemapToggle = new BasemapToggle({
      view: view,
      secondMap: "satellite"
  });

    // add querySelectors for input elements
  var state = document.querySelector("#state");
  var efNum = document.querySelector("#efNum");
  var fatal = document.querySelector("#fatal");
  var injury = document.querySelector("#injury");
  var loss = document.querySelector("#loss");
  var count = document.querySelector("#torCount");

  fatal.addEventListener("input", function() {
    document.querySelector("#fatal-val").innerText = fatal.value;
    queryTornadoes().then(displayResults);
  });

  injury.addEventListener("input", function() {
    document.querySelector("#injury-val").innerText = injury.value;
    queryTornadoes().then(displayResults);
  });

  loss.addEventListener("input", function() {
    document.querySelector("#loss-val").innerText = loss.value;
    queryTornadoes().then(displayResults);
  });

  state.addEventListener("change", function() {
    var type = event.target.value;
    if (type === "United States") {
      tornadoLayer.visible = true;
    }
    setTornadoInStateExpression(type);
    document.querySelector("#state-val").innerHTML = type;
    queryTornadoes().then(displayResults);
  });

  

  
  var ef0 = {
    type: "simple-line",
    color: [254,240,217],
    width: 1,
    style: "solid"
  };

  var ef1 = {
    type: "simple-line",
    color: [253,204,138],
    width: 1,
    style: "solid"
  };

  var ef2 = {
    type: "simple-line",
    color: [252,141,89],
    width: 1,
    style: "solid"
  };

  var ef3 = {
    type: "simple-line",
    color: [227,74,51],
    width: 1,
    style: "solid"
  };

  var ef4 = {
    type: "simple-line",
    color: [179,0,0],
    width: 1,
    style: "solid"
  };

  var other = {
    type: "simple-line",
    color: [150, 150, 150],
    width: 1,
    style: "solid"
  };



  var tornadoRenderer = {
    type: "unique-value",
    field: "MAG",
    defaultSymbol: other,
    defaultLabel: "Unclassified EF score (-9)",
    uniqueValueInfos: [
    {
      value: 0,
      symbol: ef0,
      label: "EF 0"
    },
    {
      value: 1,
      symbol: ef1,
      label: "EF 1"
    },
    {
      value: 2,
      symbol: ef2,
      label: "EF 2"
    },
    {
      value: 3,
      symbol: ef3,
      label: "EF 3"
    },
    {
      value: 4,
      symbol: ef4,
      label: "EF 4"
    }
  ]
};

  var tornadoPopups = {
    "title": "2017 Tornado information", 
    "content": "<b>Date: </b> {Date} <br> <b>EF (Fujita) Scale Number: </b> {mag} <br> <b> Injuries: </b> {inj} <br> <b> Fatalities: </b> {fat} <br> <b>Estimated Property Loss ($): </b> {loss}"
  };

  var tornadoLayer = new FeatureLayer({
    url: "https://services5.arcgis.com/njRHYVhl2CMXMsap/arcgis/rest/services/2017_Tornado_paths_in_the_US/FeatureServer",
    renderer: tornadoRenderer,
    popupTemplate: tornadoPopups
  });

map.addMany([tornadoLayer, resultsLayer]);

view.ui.add(basemapToggle, "top-left");

const legend = new Legend({
  view: view, 
  layerInfos: [
    {
      layer:tornadoLayer
    }
  ]
});

view.ui.add(legend, "bottom-left");

// query all features from the tornado layer
view.when(function() {
  return tornadoLayer.when(function() {
    var query = tornadoLayer.createQuery();
    return tornadoLayer.queryFeatures(query);
  });
})
  .then(getValues)
  .then(getUniqueValues)
  .then(addToSelect);

// return an array of all the values in the State field of the tornado layer
function getValues(response) {
  var features = response.features;
  var values = features.map(function(feature) {
    return feature.attributes.st;
  });
  return values;
}

// return an array of all unique values in the State field of the tornado layer
function getUniqueValues(values) {
  var uniqueValues = [];
  values.forEach(function(item, i) {
    if ((uniqueValues.length < 1 || uniqueValues.indexOf(item) === -1) && item !== "") {
      uniqueValues.push(item);
    }
  });
  return uniqueValues;
};

// add the unique values to the states select element. Allows user to filter by state.
function addToSelect(values) {
  values.sort();
  values.forEach(function(value) {
    var option = document.createElement("option");
    option.text = value;
    state.add(option);
  });
  return setTornadoInStateExpression(state.value);
}

// set the definition expression on the tornado layer to reflect user choice for state

function setTornadoInStateExpression(newValue) {
  if (newValue !== "United States") {
    tornadoLayer.definitionExpression = "st = '" + newValue + "'";
  } else {
    tornadoLayer.definitionExpression = "st LIKE '%'";
  }
  tornadoLayer.visible = true;  
  return queryforTornadoGeometries();
}

// get all the geometries of the tornado layer. The createQuery() method creates a query object that respects the definitionExpression of the layer
function queryforTornadoGeometries() {
  var tornadoQuery = tornadoLayer.createQuery();

  return tornadoLayer.queryFeatures(tornadoQuery).then(function(response) {
    tornadoGeometries = response.features.map(function(feature) {
      return feature.geometry;
    });
    return tornadoGeometries;
  });
}

// functions that query the tornado layer. 
// received some help refactoring three different query functions into one queryTornadoes() and combining queries

// function queryFatalities() {
//   var query = tornadoLayer.createQuery();
//   query.where = "fat >=" + fatal.value;
//   console.log(query.where)
//   return tornadoLayer.queryFeatures(query);
// }

// function queryInjuries() {
//   var query = tornadoLayer.createQuery();
//   query.where = "inj >=" + injury.value;
//   console.log(query.where)
//   return tornadoLayer.queryFeatures(query);
// }

// function queryLoss() {
//   var query = tornadoLayer.createQuery();
//   query.where = "loss <=" + loss.value;
//   console.log(query.where)
//   return tornadoLayer.queryFeatures(query);
// }

function queryTornadoes() {
  var query = tornadoLayer.createQuery();
  query.where = "fat >=" + fatal.value;
  query.where += " AND inj >=" + injury.value;
  query.where += " AND loss >=" + loss.value;
  if (tornadoLayer.definitionExpression) {
    query.where += " AND " + tornadoLayer.definitionExpression;
  }
  console.log(query.where)
  return tornadoLayer.queryFeatures(query);
}

function displayResults(results) {
  resultsLayer.removeAll();
  var features = results.features.map(function(graphic) {
    graphic.symbol = {
      type: "simple-line",
      width: 3,
      color: "#68f97e"
    };
  var count = results.features.length
  console.log(count + " features ");
  
  document.querySelector("#torCount").innerHTML = results.features.length;
  return graphic;
  });
  resultsLayer.addMany(features);
}


});
