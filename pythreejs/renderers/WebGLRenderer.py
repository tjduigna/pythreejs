from ipywidgets import Widget, DOMWidget, widget_serialization, Color
from traitlets import Unicode, Int, CInt, Enum, Instance, List, Float, CFloat, Bool, link

from ..enums import ToneMappings

from .._base.Three import RenderableWidget
from ..math.Plane_autogen import Plane

to_json = widget_serialization['to_json']
from_json = widget_serialization['from_json']

class WebGLRenderer(RenderableWidget):
    """WebGLRenderer

    Author: @abelnation
    Date: Wed Aug 31 2016 23:46:30 GMT-0700 (PDT)
    See http://threejs.org/docs/#api/renderers/WebGLRenderer
    """

    _view_name = Unicode('WebGLRendererView').tag(sync=True)
    _model_name = Unicode('WebGLRendererModel').tag(sync=True)

    width = CInt(200)
    height = CInt(200)
    autoClear = Bool(True).tag(sync=True)
    autoClearColor = Bool(True).tag(sync=True)
    clearColor = Unicode('#000000').tag(sync=True)
    clearOpacity = CFloat(1.0).tag(sync=True)
    autoClearDepth = Bool(True).tag(sync=True)
    autoClearStencil = Bool(True).tag(sync=True)
    sortObject = Bool(True).tag(sync=True)
    clippingPlanes = List(Instance(Plane)).tag(sync=True, **widget_serialization)
    localClippingEnabled = Bool(False).tag(sync=True)
    gammaFactor = CFloat(2.0).tag(sync=True)
    gammaInput = Bool(False).tag(sync=True)
    gammaOutput = Bool(False).tag(sync=True)
    physicallyCorrectLights = Bool(False).tag(sync=True)
    toneMapping = Enum(ToneMappings, 'LinearToneMapping').tag(sync=True)
    toneMappingExposure = CFloat(1.0).tag(sync=True)
    toneMappingWhitePoint = CFloat(1.0).tag(sync=True)
    maxMorphTargets = CInt(8).tag(sync=True)
    maxMorphNormals = CInt(4).tag(sync=True)

    def __init__(self, **kwargs):
        super(WebGLRenderer, self).__init__(**kwargs)
        link((self, 'width'), (self, '_width'))
        link((self, 'height'), (self, '_height'))

    def render(self, scene, camera):
        content = {
            "type": "render",
            "scene": to_json(scene, None),
            "camera": to_json(camera, None)
        }
        self.send(content)

    def freeze(self):
        content = {
            "type": "freeze"
        }
        self.send(content)

