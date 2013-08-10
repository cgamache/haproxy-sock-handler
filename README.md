node_haproxy
============

node.js haproxy socket access module

Haproxy can be partially controlled by sending messages to a socket. Enable the socket control by specifying

>global 
>     ...
>     stats socket /var/run/haproxy.sock
>     ...

Configuration
-------------

var haproxy = require('haproxy');

haproxy.config.socket = '/path/to/haproxy.sock';


The default configured value is '/var/run/haproxy.sock'

Methods
-------

* showStat(cb)

returns stats object

* showBackendStat(backend, callback)

returns stats on specified backend

* showInfo(cb)

returns general haproxy info

* showHelp(cb)

returns socket help text

* updateBackend(backend, data, callback)

sets weight/up/down/maint for specified backend

* updateBackends(data, callback)

sets weight/up/down/maint for many backends

Data
----

See https://code.google.com/p/haproxy-docs/wiki/StatisticsMonitoring#CSV_format for info on returned data
