#!/usr/bin/env /opt/node/bin/node

var net = require('net');
var _ = require('underscore')

module.exports = {
  config: {socket: '/var/run/haproxy.sock'},
  showStat: function(callback) {
    var self = this;
    var client = net.connect({
      path: self.config.socket
    }, function() {
      client.write('show stat -1 5 -1\n');
    });

    var output = "";
    client.on('data', function(data) {
      output += data;
    });

    client.on('end', function() {
      var rv = self._parseCsv(output);
      self.stats = rv;
      //console.log(JSON.stringify(rv) + "\n\n\n\n\n\n");
      callback(rv);
    });

  },
  showBackendStat: function(backend, callback) {
    var self = this;
    var pxname = backend.split('/')[0];
    var svname = backend.split('/')[1];

    if(!self.stats[pxname] || !self.stats[pxname][svname]) {
      self.showStat(function(data) {
        var rv = data[pxname][svname];
        //console.log(JSON.stringify(rv));
        callback(rv);
      });
    } else {
      var iid = self.stats[pxname][svname].iid;
      var sid = self.stats[pxname][svname].sid;
      var client = net.connect({
        path: self.config.socket
      }, function() {
        client.write('show stat ' + iid + ' 5 ' + sid + '\n');
      });

      var rv;
      var output = "";
      client.on('data', function(data) {
        output += data;
      });

      client.on('end', function() {
        rv = self._parseCsv(output);
        //console.log(JSON.stringify(rv));
        self.stats[pxname][svname] = rv[pxname][svname];
        callback(rv);
      });
    }
  },
  _parseCsv: function(data) {
    var obj = {};
    var lines = data.toString().trim().split('\n');
    _.each(lines, function(line) {
      if (line.length === 0 || line.substr(0,1) === "#") return;
      var fields = line.split(',');
      var pxname = fields[0];
      var svname = fields[1];
      var server = {
        qcur: fields[2],
        qmax: fields[3],
        scur: fields[4],
        smax: fields[5],
        slim: fields[6],
        stot: fields[7],
        bin: fields[8],
        bout: fields[9],
        dreq: fields[10],
        dresp: fields[11],
        ereq: fields[12],
        econ: fields[13],
        eresp: fields[14],
        wretr: fields[15],
        wredis: fields[16],
        status: fields[17],
        weight: fields[18],
        act: fields[19],
        bck: fields[20],
        chkfail: fields[21],
        chkdown: fields[22],
        lastchg: fields[23],
        downtime: fields[24],
        qlimit: fields[25],
        pid: fields[26],
        iid: fields[27],
        sid: fields[28],
        throttle: fields[29],
        lbtot: fields[30],
        tracked: fields[31],
        type: fields[32],
        rate: fields[33],
        rate_lim: fields[34],
        rate_max: fields[35],
        check_status: fields[36],
        check_code: fields[37],
        check_duration: fields[38],
        hrsp_1xx: fields[39],
        hrsp_2xx: fields[40],
        hrsp_3xx: fields[41],
        hrsp_4xx: fields[42],
        hrsp_5xx: fields[43],
        hrsp_other: fields[44],
        hanafail: fields[45],
        req_rate: fields[46],
        req_rate_max: fields[47],
        req_tot: fields[48],
        cli_abrt: fields[49],
        srv_abrt: fields[50]
      };

      if(!obj[pxname]) {
        var pxobj = {};
        pxobj[pxname] = {};
        _.extend(obj, pxobj);
      }
      var svobj = {};
      svobj[svname] = server;
      _.extend(obj[pxname], svobj);
    });
    return obj;
  },

  showInfo: function(callback) {
    var self = this;
    var client = net.connect({
      path: self.config.socket
    }, function() {
      client.write('show info\n');
    });

    client.on('data', function(data) {
      //no idea what we have here
      console.log(data.toString());
    });

    client.on('end', function() {
      self.showStat(callback);
    });

  },

  showHelp: function(callback) {
    var self = this;
    var client = net.connect({
      path: self.config.socket
    }, function() {
      client.write('help\n');
    });

    client.on('data', function(data) {
      console.log(data.toString());
    });

    client.on('end', function() {
      self.showStat(callback);
    });

  },

  showSessions: function(callback) {
    var self = this;
    var client = net.connect({
      path: self.config.socket
    }, function() {
      client.write('show sess\n');
    });

    client.on('data', function(data) {
      //no idea what we have here
      console.log(data.toString());
    });

    client.on('end', function() {
      self.showStat(callback);
    });

  },

  updateBackend: function(backend, data, callback) {
    var self = this, data = {};
    data[backend] = data;
    updateBackends(data,callback);
  },

  updateBackends: function (data, callback) {
    var self = this;

    var doUpdate = function () {
      var command = "", stats = "";
      _.each(data, function(value,key) {
        var backend = key;
        if (value.weight) {
          command += "set weight " + backend + " " + value.weight + "\n";
        }
        if (value.enabled === true) {
          command += "enable server  " + backend + "\n";
        }
        if (value.enabled === false) {
          command += "disable server  " + backend + "\n";
        }
        //TODO: try/catch?
        var pxname = backend.split('/')[0];
        var svname = backend.split('/')[1];
        if(self.stats[pxname] && self.stats[pxname][svname]) {
          stats += 'show stat ' + self.stats[pxname][svname].iid + ' 5 ' + self.stats[pxname][svname].sid + '\n';
        }

      });

      var client = net.connect({
         path: self.config.socket
      }, function() {
         //console.log("sending:\n" + command + stats);
         client.write(command + stats);
      });

      var  output = "";
      client.on('data', function(data) {
        output += data;
      });

      client.on('end', function() {
        var rv = self._parseCsv(output);
        _.each(self.stats,function(v,k) {
          _.each(rv,function(v1,k1) {
            if (k === k1) {
              _.each(v1,function(v2,k2) {
                self.stats[k1][k2] = v2;
              });
            }
          });
        });
        callback(rv);
      });
      

    };

    if (!self.stats) {
      self.showStat(function (stats) {
        console.log("pulled stats");
        doUpdate();
      });
    } else {
      doUpdate();
    }



  }

};
