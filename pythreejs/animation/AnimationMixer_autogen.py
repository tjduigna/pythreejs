from ipywidgets import Widget, DOMWidget, widget_serialization, Color
from traitlets import Unicode, Int, CInt, Instance, This, Enum, Tuple, List, Dict, Float, CFloat, Bool

from ..enums import *
from ..traits import *

from .._base.Three import ThreeWidget


class AnimationMixer(ThreeWidget):
    """AnimationMixer
    
    Autogenerated by generate-wrappers.js 
    Date: Thu Oct 20 2016 12:05:52 GMT-0700 (PDT) 
    See http://threejs.org/docs/#Reference/Animation/AnimationMixer 
    """
    
    _view_name = Unicode('AnimationMixerView').tag(sync=True)
    _model_name = Unicode('AnimationMixerModel').tag(sync=True)

