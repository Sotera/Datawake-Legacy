var express = require('express');
var auth = require('http-auth');


var port = 9006;
var bUseAuth = true;

process.argv.forEach(function(val) {
    if (val === '--noAuth') {
        bUseAuth = false;
    } else if (val.indexOf('--port') !== -1) {
        var portPieces = val.split('=');
        if (portPieces && portPieces.length === 2) {
            var strPort = portPieces[1];
            try {
                var numPort = parseInt(strPort);
                port = numPort;
            } catch(err) {
                console.log('Unable to start node on port ' + strPort + '.   Defaulting to ' + port);
            }
        }
    }
});


// Application setup.
var app = express();
if (bUseAuth) {
    console.log('Starting with basic authentication');
    var basic = auth.basic({
            realm: 'Datawake Forensic',
            file: './.htpassword'
        }
    );
    app.use(auth.connect(basic));
} else {
    console.log('Starting with no authentication');
}

// Setup route.
app.use('/',express.static('../server/forensic_v2'));
app.listen(port);
console.log('Listening on port ' + port);
