var socketio = require('socket.io');
var XmlStream = require('xml-stream');
var request   = require('request');
var StreamSnitch = require('stream-snitch');

function request_markers(lat, lon, callback) {
    var markers = [];
    request
      .get('http://www.hmdb.org/map.asp?nearby=yes&Latitude=' + lat + '&Longitude=' + lon)
      .on('response', function(response) {
        var snitch = new StreamSnitch(/MarkerID=([0-9]+)/g);
        snitch.on('match', function(match) { markers.push(match[1]); });
        response.pipe(snitch);
        response.on('end', function() {
            console.log("Received marker count: " + markers.length);
            callback(markers);
        });
      });
}

function request_marker_details(markers, isretry, callback) {
    var points = [];
    markers.sort();
    request
      .get('http://www.hmdb.org//gpx/gpx.asp?markers=0,' + markers.join(','))
      .on('response', function(response) {
        var xml = new XmlStream(response);
        xml.preserve('wpt', true);
        xml.on('endElement: wpt', function(item) {
            var point = {
                latitude: Number(item['$']['lat']),
                longitude: Number(item['$']['lon']),
                link: item['link']['$']['href'],
                name: item['name']['$text']
            };
            points.push(point);
        })
      })
      .on('end', function() {
        callback(points);
      })
      .on('error', function(err) {
        var retryTime = 5000;
        console.log("Received error requesting marker information.  Error: " + err);
        if(!isretry) {
            console.log("Will retry requesting marker information in " + retryTime / 1000 + "seconds.");
            setTimeout(function() {
                request_marker_details(markers, 1, callback);
            }, 5000);
        }
      });
}

var datapipe = {
    io: null,
    initialize: function(server) {
        io = socketio(server);

        var client = io
            .of('/points')
            .on('connection', function(socket) {
                var points = [];
                var markers = [];
                var markerseq = 0;
                var timer;
                socket.on('status', function(data) {
                    console.log("Got client status: " + data);
                    var info = JSON.parse(data);
                    markerseq = info.markerseq;
                    if(!timer) {
                        timer = setInterval(function() {
                            if(points.length > markerseq) {
                                socket.emit('point', JSON.stringify(points[markerseq]));
                                markerseq++;
                            }
                        }, 1000);
                    }
                });
                socket.on('client', function(data) {
                    console.log("Received incoming client request.  Info: " + data);
                    var info = JSON.parse(data);
                    if(markers.length == 0) {
                        request_markers(info.lat, info.lon, function(data) {
                            markers = data;
                            request_marker_details(markers, 0, function(data) {
                                points = data;
                            });
                        });
                    } else {
                        request_marker_details(markers, 0, function(data) {
                            points = data;
                        });
                    }
                });
                socket.on('disconnect', function() {
                    console.log("Client disconnected.");
                    if(timer) {
                        clearInterval(timer);
                        timer = null;
                    }
                });               
            });
    }
};

module.exports = datapipe;