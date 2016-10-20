//
// This file auto-generated with generate-wrappers.js
// Date: Thu Oct 20 2016 12:05:52 GMT-0700 (PDT)
//

var _ = require('underscore');
var widgets = require('jupyter-js-widgets');

var TextureModel = require('./Texture').TextureModel;
var TextureView = require('./Texture').TextureView;


var CanvasTextureModel = TextureModel.extend({

    defaults: _.extend({}, TextureModel.prototype.defaults, {

        _view_name: 'CanvasTextureView',
        _model_name: 'CanvasTextureModel',


    }),

    constructThreeObject: function() {

        return new THREE.CanvasTexture();

    },

    createPropertiesArrays: function() {

        TextureModel.prototype.createPropertiesArrays.call(this);

    },

});

var CanvasTextureView = TextureView.extend({});

module.exports = {
    CanvasTextureView: CanvasTextureView,
    CanvasTextureModel: CanvasTextureModel,
};