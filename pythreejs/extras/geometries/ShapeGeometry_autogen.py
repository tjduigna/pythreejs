from ipywidgets import Widget, DOMWidget, widget_serialization, Color
from traitlets import Unicode, Int, CInt, Instance, This, Enum, Tuple, List, Dict, Float, CFloat, Bool

from ...enums import *
from ...traits import *

from ...core.Geometry_autogen import Geometry

from ..core.Shape_autogen import Shape

class ShapeGeometry(Geometry):
    """ShapeGeometry
    
    Autogenerated by generate-wrappers.js 
    Date: Thu Oct 20 2016 12:05:52 GMT-0700 (PDT) 
    See http://threejs.org/docs/#Reference/Extras.Geometries/ShapeGeometry 
    """
    
    _view_name = Unicode('ShapeGeometryView').tag(sync=True)
    _model_name = Unicode('ShapeGeometryModel').tag(sync=True)

    shapes = Tuple().tag(sync=True, **widget_serialization)
    curveSegments = CInt(12).tag(sync=True)
    material = CInt(0).tag(sync=True)
