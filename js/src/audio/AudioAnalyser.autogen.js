//
// This file auto-generated with generate-wrappers.js
// Date: Thu Oct 20 2016 12:05:52 GMT-0700 (PDT)
//

var _ = require('underscore');
var widgets = require('jupyter-js-widgets');

var ThreeModel = require('../_base/Three').ThreeModel;
var ThreeView = require('../_base/Three').ThreeView;


var AudioAnalyserModel = ThreeModel.extend({

    defaults: _.extend({}, ThreeModel.prototype.defaults, {

        _view_name: 'AudioAnalyserView',
        _model_name: 'AudioAnalyserModel',


    }),

    constructThreeObject: function() {

        return new THREE.AudioAnalyser();

    },

    createPropertiesArrays: function() {

        ThreeModel.prototype.createPropertiesArrays.call(this);

    },

});

var AudioAnalyserView = ThreeView.extend({});

module.exports = {
    AudioAnalyserView: AudioAnalyserView,
    AudioAnalyserModel: AudioAnalyserModel,
};