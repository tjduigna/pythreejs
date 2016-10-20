from ipywidgets import Widget, DOMWidget, widget_serialization, Color
from traitlets import Unicode, Int, CInt, Instance, This, Enum, Tuple, List, Dict, Float, CFloat, Bool

from ..enums import *
from ..traits import *

from .._base.Three import ThreeWidget


class Vector2(ThreeWidget):
    """Vector2
    
    Autogenerated by generate-wrappers.js 
    Date: Thu Oct 20 2016 12:05:52 GMT-0700 (PDT) 
    See http://threejs.org/docs/#Reference/Math/Vector2 
    """
    
    _view_name = Unicode('Vector2View').tag(sync=True)
    _model_name = Unicode('Vector2Model').tag(sync=True)

    x = CFloat(0).tag(sync=True)
    y = CFloat(0).tag(sync=True)
