'use strict';

var util = require('util');
var logger = require('fluent-logger');
var pm2 = require('pm2');
var pmx = require('pmx');
var conf = pmx.initModule();

var VM_INSTANCE_ID = conf.VM_INSTANCE_ID || '';
var VM_PRIVATE_IP = conf.VM_PRIVATE_IP || '';

var FLUENTD_PREFIX_TAG = conf.FLUENTD_PREFIX_TAG || 'vm';
var FLUENTD_TAG = [FLUENTD_PREFIX_TAG, VM_INSTANCE_ID, VM_PRIVATE_IP].join('.');
var FLUENTD_HOST = conf.FLUENTD_HOST || 'localhost';
var FLUENTD_PORT = parseInt(conf.FLUENTD_PORT || '24224');
var FLUENTD_TIMEOUT = parseFloat(conf.FLUENTD_TIMEOUT || '3.0');
var FLUENTD_RECONNECT_INTERVAL =
    parseInt(conf.FLUENTD_RECONNECT_INTERVAL || 6000);

logger.configure(FLUENTD_TAG, {
    host: FLUENTD_HOST,
    port: FLUENTD_PORT,
    timeout: FLUENTD_TIMEOUT,
    reconnectInterval: FLUENTD_RECONNECT_INTERVAL
});

pm2.launchBus(function(err, bus) {
    console.log('[PM2] Log streaming started');
    bus.on('log:out', function (packet) {
        var data = {
            log: packet.data,
            vm_id: VM_INSTANCE_ID,
            vm_private_ip: VM_PRIVATE_IP,
            source: 'stdout'
        };
        logger.emit(packet.process.name, data);
    });

    bus.on('log:err', function (packet) {
        var data = {
            log: packet.data,
            vm_id: VM_INSTANCE_ID,
            vm_private_ip: VM_PRIVATE_IP,
            source: 'stderr'
        };
        logger.emit(packet.process.name, data);
    });

    bus.on('*', function(event, _data){
        if (event === 'process:event' && _data.event === 'online') {
            var msg = util.format('Process %s restarted %s',
                                  _data.process.name,
                                  _data.process.restart_time);
            var data = {
                log: msg,
                vm_id: VM_INSTANCE_ID,
                vm_private_ip: VM_PRIVATE_IP,
                source: 'stdout'
            };
            logger.log('pm2', data);
        }
    });
});
