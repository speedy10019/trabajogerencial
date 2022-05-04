from Products.PortalTransforms.interfaces import itransform
from zope.interface import implementer
from Products.ERP5OOo.transforms.oood_commandtransform import OOOdCommandTransform, OOoDocumentDataStream


@implementer(itransform)
class OdpToHtml:
  """Transforms odp to html by using Cloudooo"""

  __name__ = 'odp_to_html'
  inputs   = ('application/vnd.oasis.opendocument.presentation',)
  output = 'text/html'

  tranform_engine = OOOdCommandTransform.__module__

  def name(self):
    return self.__name__

  def __getattr__(self, attr):
    if attr == 'inputs':
      return self.config['inputs']
    if attr == 'output':
      return self.config['output']
    raise AttributeError(attr)

  def convert(self, orig, data, cache=None, filename=None, context=None, **kwargs):
    data = str(orig)
    odp = OOOdCommandTransform(context, filename, data, self.inputs[0])
    html = odp.convertTo('html')
    if cache is not None:
      cache.setData(html)
      return cache
    else:
      stream = OOoDocumentDataStream()
      stream.setData(html)
      return stream

def register():
  return OdpToHtml()
