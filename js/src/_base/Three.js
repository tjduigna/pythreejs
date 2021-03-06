var _ = require('underscore');
var widgets = require("@jupyter-widgets/base");
var Promise = require('bluebird');
var $ = require('jquery');
var ndarray = require('ndarray');
var dataserializers = require('jupyter-dataserializers');

var THREE = require('three');

var Enums = require('./enums');

var utils = require('./utils');

var version = require('../../package.json').version;


var ThreeModel = widgets.WidgetModel.extend({

    defaults: function() {
        return _.extend(widgets.WidgetModel.prototype.defaults.call(this), {
            _model_name: this.constructor.model_name,
            _model_module: this.constructor.model_module,
            _model_version: this.constructor.model_module_version
        });
    },

    initialize: function(attributes, options) {
        widgets.WidgetModel.prototype.initialize.apply(this, arguments);

        this.createPropertiesArrays();

        if (options.three_obj) {
            // We are defining the object from a given THREE object!

            // We need to push a default state first, as comm open does
            // not support buffers!
            this.save_changes();

            var obj = options.three_obj;
            delete options.three_obj;

            this.initPromise = Promise.resolve(obj).bind(this).then(this.processNewObj
            ).then(function (obj) {

                // sync in all the properties from the THREE object
                this.syncToModel(true);

                // setup msg, model, and children change listeners
                this.setupListeners();

            });
            return;
        }

        // Instantiate Three.js object
        this.initPromise = this.createThreeObjectAsync().bind(this).then(function() {

            // pull in props created by three
            this.syncToModel();

            // sync the rest from the server to the model
            this.syncToThreeObj(true);

            // setup msg, model, and children change listeners
            this.setupListeners();

        });

    },

    createPropertiesArrays: function() {
        // initialize properties arrays
        this.three_properties = [];
        this.three_nested_properties = [];
        this.datawidget_properties = [];

        this.enum_property_types = {};
        this.props_created_by_three = {};
        this.property_converters = {};
        this.property_assigners = {};
        this.property_mappers = {};
    },

    _listenNested: function(propNames, callback) {
        propNames.forEach(function(propName) {

            // listen to current values in array
            var curr = this.get(propName) || [];
            utils.childModelsNested(curr).forEach(function(childModel) {
                this.listenTo(childModel, 'change', callback);
                this.listenTo(childModel, 'childchange', callback);
            }, this);

            // make sure to (un)hook listeners when array changes
            this.on('change:' + propName, function(model, value, options) {
                var prev = this.previous(propName) || [];
                var curr = value || [];

                var diff = utils.nestedDiff(curr, prev);

                diff.added.forEach(function(childModel) {
                    this.listenTo(childModel, 'change', callback);
                    this.listenTo(childModel, 'childchange', callback);
                }, this);
                diff.removed.forEach(function(childModel) {
                    this.stopListening(childModel);
                }, this);
            }, this);
        }, this);
    },

    setupListeners: function() {

        // Handle changes in three instance props
        this.three_properties.forEach(function(propName) {
            // register listener for current child value
            var curValue = this.get(propName);
            if (curValue) {
                this.listenTo(curValue, 'change', this.onChildChanged.bind(this));
                this.listenTo(curValue, 'childchange', this.onChildChanged.bind(this));
            }

            // make sure to (un)hook listeners when child points to new object
            this.on('change:' + propName, function(model, value, options) {
                var prevModel = this.previous(propName);
                var currModel = value;
                if (prevModel) {
                    this.stopListening(prevModel);
                }
                if (currModel) {
                    this.listenTo(currModel, 'change', this.onChildChanged.bind(this));
                    this.listenTo(currModel, 'childchange', this.onChildChanged.bind(this));
                }
            }, this);
        }, this);

        // Handle changes in three instance nested props (arrays/dicts, possibly nested)
        this._listenNested(this.three_nested_properties, this.onChildChanged.bind(this));

        // Handle changes in data widgets/union properties
        this.datawidget_properties.forEach(function(propName) {
            dataserializers.listenToUnion(this, propName, this.onChildChanged.bind(this), false);
        }, this);

        this.on('change', this.onChange, this);
        this.on('msg:custom', this.onCustomMessage, this);

    },

    processNewObj: function(obj) {

        obj.ipymodelId = this.model_id; // brand that sucker
        obj.ipymodel = this;

        this.obj = obj;
        return obj;

    },

    createThreeObjectAsync: function() {

        var objPromise;

        // call constructor method overridden by every class
        // check for custom async three obj creator
        if (this.constructThreeObjectAsync) {
            objPromise = this.constructThreeObjectAsync();
        } else if (this.constructThreeObject) {
            objPromise = Promise.resolve(this.constructThreeObject());
        } else {
            throw new Error('no THREE construct method exists: this.createThreeObjectAsync');
        }

        return objPromise.bind(this).then(this.processNewObj);

    },

    // Over-ride this method to customize how THREE object is created

    constructThreeObject: function() {},


    //
    // Remote execution of three.js object methods
    //

    onCustomMessage: function(content, buffers) {
        switch(content.type) {
            case 'exec_three_obj_method':
                this.onExecThreeObjMethod(content.method_name, content.args, content.buffers);
                break;
            case 'freeze':
                break;
            case 'print':
                console.log("SERVER: " + JSON.stringify(content.msg));
                break;
            default:
                console.log("ERROR: invalid custom message");
                console.log(content);

        }
    },

    onExecThreeObjMethod: function(methodName, args, buffers) {
        console.log('execThreeObjMethod: ' + methodName +
            '(' + args.map(JSON.stringify).join(',') + ')');

        if (!(methodName in this.obj)) {
            throw new Error('Invalid methodName: ' + methodName);
        }

        // convert serialized args to three.js compatible values
        args = args.map(function(arg) {

            if (Array.isArray(arg)) {

                if (arg.length === 2) {
                    return new THREE.Vector2().fromArray(arg);
                } else if (arg.length === 3) {
                    return new THREE.Vector3().fromArray(arg);
                } else if (arg.length === 4) {
                    return new THREE.Vector4().fromArray(arg);
                } else if (arg.length === 9) {
                    return new THREE.Matrix3().fromArray(arg);
                } else if (arg.length === 16) {
                    return new THREE.Matrix4().fromArray(arg);
                } else {
                    return arg;
                }

            } else if (typeof arg === 'string' && /IPY_MODEL_/.test(arg)) {

                arg = arg.replace('IPY_MODEL_', '');
                return this.widget_manager.get_model(arg).then(function(model) {
                    return model.obj;
                });

            } else {
                return arg;
            }

        }, this);

        return Promise.all(args).bind(this).then(function(args) {

            var retVal = this.obj[methodName].apply(this.obj, args);

            this.syncToModel(true);

            if (retVal !== null && retVal !== undefined) {

                if (retVal.ipymodel) {
                    retVal = retVal.ipymodel;
                }

                console.log('sending return value to server...');
                this.send({
                    type: "exec_three_obj_method_retval",
                    method_name: methodName,
                    ret_val: retVal,
                }, this.callbacks(), null);
            }

        });

    },

    //
    // Data-binding methods for syncing between model and three.js object
    //

    onChange: function(model, options) {
        if (options !== 'pushFromThree') {
            this.syncToThreeObj();
            // Also sync back out any generated properties:
            this.syncToModel();
        }
    },

    onChildChanged: function(model, options) {
        console.log('child changed: ' + model.model_id);
        // Propagate up hierarchy:
        this.trigger('childchange', this);
    },

    // push data from model to three object
    syncToThreeObj: function(force) {

        _.each(this.property_converters, function(converterName, propName) {
            if (!force && !this.hasChanged(propName)) {
                // Only set changed properties unless forced
                return;
            }
            assigner = this[this.property_assigners[propName]] || this.assignDirect;
            assigner = assigner.bind(this);
            if (!converterName) {
                assigner(this.obj, propName, this.get(propName));
                return;
            }

            converterName = converterName + "ModelToThree";
            var converterFn = this[converterName];
            if (!converterFn) {
                throw new Error('invalid converter name: ' + converterName);
            }
            assigner(this.obj, propName, converterFn.bind(this)(this.get(propName), propName));
        }, this);

        // mappers are used for more complicated conversions between model and three props
        // see: DataTexture
        _.each(this.property_mappers, function(mapperName, dataKey) {
            if (!mapperName) {
                throw new Error('invalid mapper name: ' + mapperName);
            }

            mapperName = mapperName + "ModelToThree";
            var mapperFn = this[mapperName];
            if (!mapperFn) {
                throw new Error('invalid mapper name: ' + mapperName);
            }

            mapperFn.bind(this)();
        }, this);
    },

    // push data from three object to model
    syncToModel: function(syncAllProps) {

        syncAllProps = syncAllProps === null ? false : syncAllProps;

        // Collect all the keys to set in one go
        var toSet = {};

        _.each(this.property_converters, function(converterName, propName) {
            if (!syncAllProps && !(propName in this.props_created_by_three)) {
                return;
            }

            if (!converterName) {
                toSet[propName] = this.obj[propName];
                return;
            }

            converterName = converterName + 'ThreeToModel';
            var converterFn = this[converterName];
            if (!converterFn) {
                throw new Error('invalid converter name: ' + converterName);
            }

            toSet[propName] = converterFn.bind(this)(this.obj[propName], propName);
        }, this);

        if (toSet) {
            // Apply all direct changes at once
            this.set(toSet, 'pushFromThree');
        }

        // mappers are used for more complicated conversions between model and three props
        // see: DataTexture
        _.each(this.property_mappers, function(mapperName, dataKey) {
            if (!mapperName) {
                throw new Error('invalid mapper name: ' + mapperName);
            }

            mapperName = mapperName + 'ThreeToModel';
            var mapperFn = this[mapperName];
            if (!mapperFn) {
                throw new Error('invalid mapper name: ' + mapperName);
            }

            mapperFn.bind(this)(dataKey);
        }, this);

        this.save_changes();
    },

    //
    // Conversions
    //

    assignDirect: function(obj, key, value) {
        obj[key] = value;
    },

    /**
     * Check if array exists, if so replace content. Otherwise assign value.
     */
    assignArray: function(obj, key, value) {
        var existing = obj[key];
        if (existing !== null && existing !== undefined) {
            existing.splice(0, existing.length, ...value);
        } else {
            obj[key] = value;
        }
    },

    // Float
    convertFloatModelToThree: function(v, propName) {
        if (typeof v === 'string' || v instanceof String) {
            v = v.toLowerCase();
            if (v === 'inf') {
                return Infinity;
            } else if (v === '-inf') {
                return -Infinity;
            } else if (v === 'nan') {
                return NaN;
            }
        }
        return v;
    },

    convertFloatThreeToModel: function(v, propName) {
        if (isFinite(v)) { // Most common first
            return v;
        } else if (isNaN(v)) {
            return 'nan';
        } else if (v === Infinity) {
            return 'inf';
        } else if (v === -Infinity) {
            return '-inf';
        }
        return v;
    },

    // Bool
    convertBoolModelToThree: function(v, propName) {
        return v;
    },

    convertBoolThreeToModel: function(v, propName) {
        // Coerce falsy/truthy:
        return !!v;
    },

    // Enum
    convertEnumModelToThree: function(e, propName) {
        return THREE[e];
    },

    convertEnumThreeToModel: function(e, propName) {
        var enumType = this.enum_property_types[propName];
        var enumValues = Enums[enumType];
        var enumValueName = enumValues[this.obj[propName]];
        return enumValueName;
    },

    // Vectors
    convertVectorModelToThree: function(v, propName) {
        var result;
        switch(v.length) {
            case 2: result = new THREE.Vector2(); break;
            case 3: result = new THREE.Vector3(); break;
            case 4: result = new THREE.Vector4(); break;
            default:
                throw new Error('model vector has invalid length: ' + v.length);
        }
        result.fromArray(v);
        return result;
    },

    convertVectorThreeToModel: function(v, propName) {
        return v.toArray();
    },

    assignVector: function(obj, key, value) {
        obj[key].copy(value);
    },

    // Euler
    convertEulerModelToThree: function(v, propName) {
        return new THREE.Euler().fromArray(v);
    },

    convertEulerThreeToModel: function(v, propName) {
        return v.toArray();
    },

    assignEuler: function(obj, key, value) {
        obj[key].copy(value);
    },

    // Vector Array
    convertVectorArrayModelToThree: function(varr, propName) {
        return varr.map(function(v) {
            return this.convertVectorModelToThree(v, propName);
        }, this);
    },

    convertVectorArrayThreeToModel: function(varr, propName) {
        return varr.map(function(v) {
            return this.convertVectorThreeToModel(v, propName);
        }, this);
    },

    // Color Array
    convertColorArrayModelToThree: function(carr, propName) {
        return carr.map(function(c) {
            return this.convertColorModelToThree(c, propName);
        }, this);
    },

    convertColorArrayThreeToModel: function(carr, propName) {
        return carr.map(function(c) {
            return this.convertColorThreeToModel(c, propName);
        }, this);
    },

    // Faces
    convertFaceModelToThree: function(f, propName) {
        var normal = f[3];
        if (normal !== undefined && normal !== null) {
            if (Array.isArray(normal) && normal.length > 0 && Array.isArray(normal[0])) {
                normal = normal.map(function (value) {
                    return this.convertVectorModelToThree(value);
                }, this);
            } else {
                normal = this.convertVectorModelToThree(normal);
            }
        }
        var color = f[4];
        if (color !== undefined && color !== null) {
            if (Array.isArray(color)) {
                color = color.map(function (value) {
                    return new THREE.Color(value);
                }, this);
            } else {
                color = new THREE.Color(color);
            }
        }
        var result = new THREE.Face3(
            f[0],                                           // a
            f[1],                                           // b
            f[2],                                           // c
            normal,                                         // normal
            color,                                          // color
            f[5]                                            // materialIndex
        );

        return result;
    },

    convertFaceThreeToModel: function(f, propName) {
        return [
            f.a,
            f.b,
            f.c,
            f.normal.toArray(),
            this.convertColorThreeToModel(f.color),
            f.materialIndex,
            this.convertVectorArrayThreeToModel(f.vertexNormals),
            this.convertColorArrayThreeToModel(f.vertexColors),
        ];
    },

    // Face Array
    convertFaceArrayModelToThree: function(farr, propName) {
        return farr.map(function(f) {
            return this.convertFaceModelToThree(f, propName);
        }, this);
    },

    convertFaceArrayThreeToModel: function(farr, propName) {
        return farr.map(function(f) {
            return this.convertFaceThreeToModel(f, propName);
        }, this);
    },

    // Matrices
    convertMatrixModelToThree: function(m, propName) {
        var result;
        switch(m.length) {
            case 9: result = new THREE.Matrix3(); break;
            case 16: result = new THREE.Matrix4(); break;
            default:
                throw new Error('model matrix has invalid length: ' + m.length);
        }
        result.fromArray(m);
        return result;
    },

    convertMatrixThreeToModel: function(m, propName) {
        return m.toArray();
    },

    assignMatrix: function(obj, key, value) {
        obj[key].copy(value);
    },

    // Functions
    convertFunctionModelToThree: function(fnStr, propName) {
        eval('var fn = ' + fnStr);
        return fn;
    },

    convertFunctionThreeToModelToThree: function(fn, propName) {
        return fn.toString();
    },

    // ThreeType
    convertThreeTypeModelToThree: function(model, propName) {
        if (model) {
            return model.obj;
        }
        return null;
    },

    convertThreeTypeThreeToModel: function(threeType, propName) {
        if (!threeType) {
            return threeType;
        }
        return threeType.ipymodel;
    },

    // InitializedThreeType
    convertInitializedThreeTypeModelToThree: function(model, propName) {
        if (model) {
            return model.obj;
        }
        return null;
    },

    convertInitializedThreeTypeThreeToModel: function(threeType, propName) {
        if (threeType.ipymodelId === undefined) {
            var placeholder = this.get(propName);
            threeType.ipymodelId = placeholder.obj.ipymodelId;
            threeType.ipymodel = placeholder;
            placeholder.obj = threeType;
            placeholder.syncToModel();
        }
        return threeType.ipymodel;
    },

    // ThreeTypeArray
    convertThreeTypeArrayModelToThree: function(modelArr, propName) {
        return modelArr.map(function(model) {
            return this.convertThreeTypeModelToThree(model, propName);
        }, this);
    },

    convertThreeTypeArrayThreeToModel: function(threeTypeArr, propName) {
        return threeTypeArr.map(function(threeType) {
            return this.convertThreeTypeThreeToModel(threeType, propName);
        }, this);
    },

    // ThreeTypeDict
    convertThreeTypeDictModelToThree: function(modelDict, propName) {
        return _.mapObject(modelDict, function(model, name) {
            return this.convertThreeTypeModelToThree(model, propName);
        }, this);
    },

    convertThreeTypeDictThreeToModel: function(threeTypeDict, propName) {
        return _.mapObject(threeTypeDict, function(threeType, name) {
            return this.convertThreeTypeThreeToModel(threeType, propName);
        }, this);
    },

    // BufferMorphAttributes
    convertMorphAttributesModelToThree: function(modelDict, propName) {
        return _.mapObject(modelDict, function(arr, name) {
            return arr.map(function(model) {
                return this.convertThreeTypeModelToThree(model, propName);
            }, this);
        }, this);
    },

    convertMorphAttributesThreeToModel: function(threeTypeDict, propName) {
        return _.mapObject(threeTypeDict, function(arr, name) {
            return arr.map(function(model) {
                return this.convertThreeTypeThreeToModel(threeType, propName);
            }, this);
        }, this);
    },

    // ArrayBuffer
    convertArrayBufferModelToThree: function(arr, propName) {
        if (arr instanceof widgets.WidgetModel) {
            return arr.get('array').data
        }
        return arr.data;
    },

    convertArrayBufferThreeToModel: function(arrBuffer, propName) {
        // Never back-convert to a new widget
        return ndarray(arrBuffer);
    },

    // Color
    convertColorModelToThree: function(c, propName) {
        return new THREE.Color(c);
    },

    convertColorThreeToModel: function(c, propName) {
        return "#" + c.getHexString();
    },

}, {
    model_module: 'jupyter-threejs',
    model_name: 'ThreeModel',
    model_module_version: version,
});

module.exports = {
    ThreeModel: ThreeModel,
};
