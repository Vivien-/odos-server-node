var express = require('express');
var iconv = require('iconv-lite');
var app = express();
var parseString = require('xml2js').parseString;
var proj = require("proj4");
var cron = require("node-cron");

var http = require('http');

const server = http.createServer(app);
var io = require('socket.io')(server);


io.on('connection', function(socket){
    socket.on('truc', function(msg){
	console.log('message: ' + msg);
    });

});

server.listen(8081, function listening() {
    console.log('Socket listening on %d', server.address().port);
});


app.listen(8089, function () {
    console.log('Server data  listening on 8089');
});

lines = [];
polylines = [];
stations = [];
transports = [];
ws = []
var modelNexPos = [];

function rgf93tomercator(point) {
    var firstProjection = '+proj=lcc +lat_1=44.25 +lat_2=45.75 +lat_0=45 +lon_0=3 +x_0=1700000 +y_0=4200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs ';
    var secondProjection = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';
    var res = proj(firstProjection, secondProjection, point);
    return {lat: res[1], lng: res[0]}
}

try {
    http.get({
	host: 'data.bordeaux-metropole.fr',
	path: '/wps?key=7UN9Z1GXMD&service=WPS&version=1.0.0&request=Execute&Identifier=SV_LIGNE_A'
    },
	     function(response) {
		 response.setEncoding('binary');
		 // Continuously update stream with data
		 var body = '';
		 response.on('data', function(d) {
		     body += d;
		 });
		 response.on('end', function() {
		     body = iconv.decode(body, 'iso-8859-15');
		     parseString(body, function (err, result) {
			 //Filling lines
			 var array = result['wps:ExecuteResponse']['wps:ProcessOutputs'][0]['wps:Output'];
			 for(var i = 0; i < array.length; i++){
			     var tmp = array[i]['wps:Data'][0]['wps:ComplexData'][0]['gml:featureMember'][0]['bm:SV_LIGNE_A'][0];
			     if(tmp['bm:ACTIVE'][0] == 1) {
				 if(typeof tmp['bm:GID'][0] != 'undefined') {
				     // TODO
				     /*ws[tmp['bm:GID'][0]] = new WebSocket.Server({
					 port: '8081',
					 path:  'ws://localhost:8089/ws/'+tmp['bm:GID'][0]
				     });*/
				     lines.push({id:tmp['bm:GID'][0], text:tmp['bm:LIBELLE'][0]});
				 }
			     }
			 }

			 //Filling stations
	    		 for(var i = 0; i < lines.length; i++){

	    		     (function(k){
	    			 http.get({
	    			     host: 'data.bordeaux-metropole.fr',
	    			     path: '/wps?key=7UN9Z1GXMD&service=WPS&version=1.0.0&request=Execute&Identifier=saeiv_arrets_sens&DataInputs=gid='+lines[k].id+';srsname=EPSG:4326'
	    			 },
	    				  function(response) {
	    				      response.setEncoding('binary');
	    				      var body = '';
	    				      response.on('data', function(d) {
	    					  body += d;
	    				      });
	    				      response.on('end', function() {
	    					  body = iconv.decode(body, 'iso-8859-15');
	    					  parseString(body, function(err, result){
	    					      if(typeof result['wps:ExecuteResponse'] != 'undefined') {
	    						  var array = result['wps:ExecuteResponse']['wps:ProcessOutputs'][0]['wps:Output'];
	    						  if(typeof array !== 'undefined') {
	    						      for(var j = 0; j < array.length; j++){
								  var tmp = array[j]['wps:Data'][0]['wps:ComplexData'][0]['gml:featureMember'][0]['bm:SV_ARRET_P'][0];
								  if(typeof stations[lines[k].id] == 'undefined')
								      stations[lines[k].id] = [];
								  stations[lines[k].id].push({id:tmp['bm:GID'][0], name:tmp['bm:LIBELLE'][0], lat:tmp['bm:geometry'][0]['gml:Point'][0]['gml:pos'][0].split(" ")[1], lng:tmp['bm:geometry'][0]['gml:Point'][0]['gml:pos'][0].split(" ")[0]});
	    						      }
	    						  } else {
	    						      console.log("Can't fill station info 1.");
	    						  }
	    					      } else {
	    						  console.log("Can't fill station info 2.");
	    					      }
	    					  });
	    				      });
	    				      response.on('error', function(err) {
	    					  //console.error(err.stack);
	    				      });
	    				  }
	    				 );
	    		     }(i));
	    		 }
			 
	    		 //Filling directions
	    		 /* for(var i = 0; i < lines.length; i++){ */
	    		 /* 	(function(k){ */
	    		 /* 		http.get({ */
	    		 /* 			host: 'data.bordeaux-metropole.fr', */
	    		 /* 			path: '/wfs?key=7UN9Z1GXMD&service=WFS&version=1.0.0&request=GetFeature&typename=TB_CHEM_L&SRSNAME=EPSG:3945&FILTER=<Filter><And><PropertyIsEqualTo><PropertyName>NUMEXPLO</PropertyName><Literal>'+lines[k].id+'</Literal></PropertyIsEqualTo><PropertyIsEqualTo><PropertyName>SENS</PropertyName><Literal>Retour</Literal></PropertyIsEqualTo></And></Filter>' */
	    		 /* 		}, */
	    		 /* 		function(response) { */
	    		 /* 			response.setEncoding('binary'); */
	    		 /* 			var body = ''; */
	    		 /* 			response.on('data', function(d) { */
	    		 /* 				body += d; */
	    		 /* 			}); */
	    		 /* 			response.on('end', function() { */
	    		 /* 				body = iconv.decode(body, 'iso-8859-15'); */
	    		 /* 				parseString(body, function(err, result){ */
	    		 /* 					var array = result['wfs:FeatureCollection']["gml:featureMember"]; */
	    		 /* 					var allerArray = []; */
	    		 /* 					var retourArray = []; */
	    		 /* 					var aller = ""; */
	    		 /* 					var retour = ""; */
	    		 /* 					if(typeof array != "undefined"){ */
	    		 /* 						for(var j = 0; j < array.length; j++){ */
	    		 /* 							if(allerArray.indexOf(array[j]['bm:TB_CHEM_L'][0]['bm:NOMCOMCH'][0].split("/")[0]) == -1){ */
	    		 /* 								aller += array[j]['bm:TB_CHEM_L'][0]['bm:NOMCOMCH'][0].split("/")[0]+"/"; */
	    		 /* 								allerArray.push(array[j]['bm:TB_CHEM_L'][0]['bm:NOMCOMCH'][0].split("/")[0]); */
	    		 /* 							} */
	    		 /* 							if(retourArray.indexOf(array[j]['bm:TB_CHEM_L'][0]['bm:NOMCOMCH'][0].split("/")[1]) == -1){ */
	    		 /* 								retour += array[j]['bm:TB_CHEM_L'][0]['bm:NOMCOMCH'][0].split("/")[1]+"/"; */
	    		 /* 								retourArray.push(array[j]['bm:TB_CHEM_L'][0]['bm:NOMCOMCH'][0].split("/")[1]); */
	    		 /* 							} */
	    		 /* 						} */
	    		 /* 						if(aller.slice(-1) == "/") */
	    		 /* 							aller = aller.substring(0, aller.length - 1); */
	    		 /* 						if(retour.slice(-1) == "/") */
	    		 /* 							retour = retour.substring(0, retour.length - 1); */
	    		 /* 						lines[k].dir.push({sens:"ALLER", name:aller, vehicules:[]}); */
	    		 /* 						lines[k].dir.push({sens:"RETOUR", name:retour, vehicules:[]}); */
	    		 /* 					} else { */
	    		 /* 						console.log("Can't fill direction info for line " + lines[k].name + "["+lines[k].id+"]"); */
	    		 /* 					} */
	    		 /* 				}); */
	    		 /* 			}); */
	    		 /* 			response.on('error', function(err) { */
	    		 /* 				//console.error(err.stack); */
	    		 /* 			}); */
	    		 /* 		} */
	    		 /* 		); */
	    		 /* 	}(i)); */
	    		 /* } */

	    		 //Filling paths
	    		 for(var i = 0; i < lines.length; i++){
	    		     (function(k){
	    			 http.get({
	    			     host: 'data.bordeaux-metropole.fr',
	    			     path: '/wps?key=7UN9Z1GXMD&REQUEST=Execute&SERVICE=WPS&VERSION=1.0.0&Identifier=saeiv_troncons_sens&DataInputs=gid='+lines[k].id
	    			 },
	    				  function(response) {
	    				      response.setEncoding('binary');
	    				      var body = '';
	    				      response.on('data', function(d) {
	    					  body += d;
	    				      });
	    				      response.on('end', function() {
	    					  body = iconv.decode(body, 'iso-8859-15');
	    					  parseString(body, function(err, result){
	    					      var array = result['wps:ExecuteResponse']['wps:ProcessOutputs'][0]['wps:Output'];
	    					      if(typeof result['wps:ExecuteResponse'] != 'undefined' && typeof result['wps:ExecuteResponse']['wps:ProcessOutputs'] != 'undefined' && typeof result['wps:ExecuteResponse']['wps:ProcessOutputs'][0]['wps:Output'] != 'undefined') {
	    						  if(typeof array !== 'undefined') {
	    						      for(var l = 0; l < array.length; l++){
	    							  var tmp = array[l]['wps:Data'][0]['wps:ComplexData'][0]['gml:featureMember'][0]['bm:SV_TRONC_L'][0]['bm:geometry'][0]['gml:LineString'][0]['gml:posList'][0]['_'].split(" ");
	    							  var currArray = [];
	    							  if(tmp != undefined){
	    							      for(var j = 0; j < tmp.length; j++){
	    								  var curObj = {lat:'', lng:''};
	    								  var lat;
	    								  var lng;
	    								  if(j%2 == 0){
	    								      lat = tmp[j];
	    								  }
	    								  else{
	    								      lng = tmp[j];
	    								      curObj.lat = rgf93tomercator([lat,lng]).lat;
	    								      curObj.lng = rgf93tomercator([lat,lng]).lng;
	    								      currArray.push(curObj);
	    								  }
	    							      }
	    							  } else {
	    							      console.log("Can't fill paths info");
	    							  }
								  if(typeof polylines[lines[k].id] == 'undefined')
								      polylines[lines[k].id] = []
	    							  polylines[lines[k].id].push(currArray);
	    						      }
	    						  }
	    					      }
	    					  });
	    				      });
	    				      response.on('error', function(err) {
	    					  //console.error(err.stack);
	    				      });
	    				  }
	    				 );
	    		     }(i));
	    		 }
	    	     });
		 });
		 response.on('error', function(err) {
		     // This prints the error message and stack trace to `stderr`.
		     //console.error(err.stack);
		 });
	     }
	    ).on('error', function(e) {
		// Call callback function with the error object which comes from the request
		//console.error(e);
	    });
} catch(err) {
    //console.error("Error at getting first datas from catch l178. Msg: " + err);
}

var job = cron.schedule('*\/30 * * * * *', function(){
    console.log("Fetching Vehicle data");
    for(var i = 0; i < lines.length; i++){
	(function(k){
	    http.get({
		host: 'data.bordeaux-metropole.fr',
		path: '/wfs?key=7UN9Z1GXMD&Service=wfs&request=GetFeature&version=1.0.0&TYPENAME=SV_VEHIC_P&FILTER=<Filter><PropertyIsEqualTo><PropertyName>RS_SV_LIGNE_A</PropertyName><Literal>'+lines[k].id+'</Literal></PropertyIsEqualTo></Filter>'
	    },
		     function(response) {
			 response.setEncoding('binary');
			 var body = '';
			 response.on('data', function(d) {
			     body += d;
			 });
			 response.on('end', function() {
			     body = iconv.decode(body, 'iso-8859-15');
			     try{
				 parseString(body, function(err, result){
				     if(result['wfs:FeatureCollection'] != null && typeof result['wfs:FeatureCollection'] != 'undefined' && typeof result['wfs:FeatureCollection']["gml:featureMember"] != 'undefined') {
					 var array = result['wfs:FeatureCollection']["gml:featureMember"];
//					 if(typeof lines[k] == 'undefined') {
//					     if(typeof lines[k].dir[0] === 'undefined') {
//						 lines[k].dir[0] = {sens:"ALLER", name:"aller", vehicules:[]}
//					     }
//					 }
					 vehiclesArr = [];
//					 lines[k].dir[0].vehicules = [];
					 // console.log("For line " + lines[k].id);
					 // console.log(array);
					 for(var l = 0; l < array.length; l++){
					     var tmp = array[l]['bm:SV_VEHIC_P'][0];
					     var lat = tmp['bm:geometry'][0]['gml:Point'][0]['gml:coordinates'][0].split(",")[0];
					     var lng = tmp['bm:geometry'][0]['gml:Point'][0]['gml:coordinates'][0].split(",")[1];
					     var converted = rgf93tomercator([lat,lng]);
					     var orientation = tmp['bm:GEOM_O'][0];
//					     if(lines[k].dir[0] != undefined){
						 vehiclesArr.push({id:tmp['bm:GID'][0], state:tmp['bm:ETAT'][0], timing:tmp['bm:RETARD'][0], type:tmp['bm:TYPE'][0], speed:tmp['bm:VITESSE'][0], lat:converted.lat, lng:converted.lng, cur:tmp['bm:RS_SV_ARRET_P_ACTU'][0], next:tmp['bm:RS_SV_ARRET_P_SUIV'][0], terminus: tmp['bm:TERMINUS'][0], current: tmp['bm:RS_SV_ARRET_P_ACTU'][0], orientation: orientation});
//					     } else {
//						 console.log("Can't fill vehicules info 1.");
//					     }
					 }
					 /*io.on('connection', function(socket){
					     socket.on('chat message', function(msg){
						 io.emit('transports'+lines[k].id, vehiclesArr);
					     });
					     });*/
					 io.emit('transports'+lines[k].id, vehiclesArr);
					 transports[lines[k].id] = vehiclesArr;
					 //ws[lines[k].id].send(vehiclesArr); TODO
				     } else {
					 console.log("No data to fill vehicle info for line " + lines[k].id + " in sens ALLER");
				     }
				 });
			     }
			     catch(err){
				 throw err;
			     }

			 });
			 response.on('error', function(err) {
			     throw err;
			 });
		     }
		    );
/*	    http.get({
		host: 'data.bordeaux-metropole.fr',
		path: '/wfs?key=7UN9Z1GXMD&Service=wfs&request=GetFeature&version=1.0.0&TYPENAME=SV_VEHIC_P&FILTER=<Filter><AND><PropertyIsEqualTo><PropertyName>RS_SV_LIGNE_A</PropertyName><Literal>'+lines[k].id+'</Literal></PropertyIsEqualTo><PropertyIsEqualTo><PropertyName>SENS</PropertyName><Literal>RETOUR</Literal></PropertyIsEqualTo></AND></Filter>'
	    },
		     function(response) {
			 response.setEncoding('binary');
			 var body = '';
			 response.on('data', function(d) {
			     body += d;
			 });
			 response.on('end', function() {
			     body = iconv.decode(body, 'iso-8859-15');
			     try{
				 parseString(body, function(err, result){
				     if(typeof result['wfs:FeatureCollection'] != 'undefined' && result['wfs:FeatureCollection']["gml:featureMember"] != 'undefined') {
					 var array = result['wfs:FeatureCollection']["gml:featureMember"];
					 if(typeof array != 'undefined') {
					     if(typeof lines[k].dir[1] === 'undefined') {
						 lines[k].dir[1] = {sens:"RETOUR", name:"retour", vehicules:[]}
					     }
					     lines[k].dir[1].vehicules = [];
					     for(var l = 0; l < array.length; l++){
						 var tmp = array[l]['bm:SV_VEHIC_P'][0];
						 var lat = tmp['bm:geometry'][0]['gml:Point'][0]['gml:coordinates'][0].split(",")[0];
						 var lng = tmp['bm:geometry'][0]['gml:Point'][0]['gml:coordinates'][0].split(",")[1];
						 var converted = rgf93tomercator([lat,lng]);
						 var orientation = tmp['bm:GEOM_O'][0];
						 lines[k].dir[1].vehicules.push({id:tmp['bm:GID'][0], state:tmp['bm:ETAT'][0], timing:tmp['bm:RETARD'][0], type:tmp['bm:TYPE'][0], speed:tmp['bm:VITESSE'][0], lat:converted.lat, lng:converted.lng, cur:tmp['bm:RS_SV_ARRET_P_ACTU'][0], next:tmp['bm:RS_SV_ARRET_P_SUIV'][0], terminus: tmp['bm:TERMINUS'][0],orientation: orientation});
						 modelNexPos.push({"line": lines[k].id, "vehicleId": tmp['bm:GID'][0], "direction": 1, "speed": tmp['bm:VITESSE'][0], "position": converted});
					     }
					 } else {
					     console.log("No data to fill vehicle info for line " + lines[k].id + " in sens RETOUR");
					 }
				     } else {
					 console.log("No data to fill vehicle info for line " + lines[k].id + " in sens RETOUR");
				     }
				 });
			     }
			     catch(err){
				 throw err;
			     }
			 });
			 response.on('error', function(err) {
			     throw err;
			 });
		     }
		    );*/
	}(i));
    }
    // vehiculePos.updateModel(modelNexPos);
    modelNexPos = [];
}, false);


app.get('/', function (req, res) {
    res.send('Hello World!');
});


app.get('/data/startJob', function (req, res) {
    job.start();
});


app.get('/data/stopJob', function(){
    job.stop();
});

app.get('/getLines', function (req, res) {
    res.send(lines);
});

app.get('/data/stations', function (req, res) {
    var id = req.query.id;
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8089');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8100');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    res.send(stations[id]);

});

app.get('/data/polylines', function (req, res) {
    var id = req.query.id;
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8089');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8100');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    res.send(polylines[id]);
});


app.get('/data/transports', function (req, res) {
    var id = req.query.id;
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8089');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8100');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    res.send(transports[id]);
});


app.get('/data/lines', function (req, res) {
    var q = req.query.q;

    /*    var result = data.filter(function(obj) {
	  return obj.text.toLowerCase().indexOf(req.query.q.toLowerCase()) !== -1;
	  });*/
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8089');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8100');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    function filterLines(line){
	return (line.text.search(new RegExp(q, "i")) > -1);
    }
    
    res.send(lines.filter(filterLines));
});

app.get('/data/directions', function (req, res) {
    var line = req.query.line;
    var q = req.query.q;
    console.log("line");
    console.log(line);
    console.log(q);
    function filterDirections(direction){
	return (direction.name.search(new RegExp(q, "i")) > -1);
    }
    for(var i = 0; i < lines.length; i++){
	if(line == lines[i].id){
	    res.send({results:lines[i].dir.filter(filterDirections)});
	}
    }
});

/* app.get('/data/stations', function(req, res){ */
/* 	var line = req.query.line; */
/* 	var q = req.query.q; */
/* 	function filterStations(station){ */
/* 		return (station.name.search(new RegExp(q, "i")) > -1); */
/* 	} */
/* 	for(var i = 0; i < lines.length; i++){ */
/* 		if(line == lines[i].id) { */
/* 			res.send({results:lines[i].stops.filter(filterStations)}); */
/* 		} */
/* 	} */
/* }); */


app.get('/data/stationsPosition', function(req, res) {
    var lineId = req.query.id;
    function filterLineById(line){
	return (line.id == lineId);
    }
    res.send({results:lines.filter(filterLineById)[0].stops});
});


app.get('/data/getVehicle', function(req, res) {
    var lineId = req.query.id;
    var sens = req.query.sens;
    function filterLineById(line){
	return (line.id == lineId);
    }

    var data = lines.filter(filterLineById)[0];
    console.log("For line " + req.query.id + " there is " + data.dir[0].vehicules.length + " vehicle in sens " + data.dir[0].sens + "; and " + data.dir[1].vehicules.length + " vehicules in sens " + data.dir[1].sens);

    var ret = {};
    if(data.dir[0].sens == sens)
	ret = data.dir[0];
    else if(data.dir[1].sens == sens)
	ret = data.dir[1];

    
    // vehiculePos.guessNextPosition(ret.vehicules, sens, lineId,
    // 	function() {
    res.send({results: ret});
    // });
    
});

app.get('/data/metadata', function(req, res) {
    var version = req.query.version;
    if (version!=undefined){
        res.send({
            sameVersion:true,
            forceUpgrade:false,
            recommendUpgrade:false
        });
    }else{
        res.send({result:"error"});
    }
});
