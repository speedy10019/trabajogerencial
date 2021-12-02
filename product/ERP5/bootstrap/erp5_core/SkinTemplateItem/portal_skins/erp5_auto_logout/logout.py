from AccessControl import getSecurityManager
portal = context.getPortalObject()
user = getSecurityManager().getUser()
username = user.getId()
if username is not None:
  portal.portal_sessions.manage_delObjects(
    portal.Base_getAutoLogoutSessionKey(
      username=username,
    )
  )
REQUEST = portal.REQUEST
if REQUEST.has_key('portal_skin'):
  portal.portal_skins.clearSkinCookie()
REQUEST.RESPONSE.expireCookie('__ac', path='/')

if getattr(portal.portal_skins, "erp5_oauth_google_login", None):
  REQUEST.RESPONSE.expireCookie('__ac_google_hash', path='/')

if getattr(portal.portal_skins, "erp5_oauth_facebook_login", None):
  REQUEST.RESPONSE.expireCookie('__ac_facebook_hash', path='/')

if getattr(portal.portal_skins, "erp5_openid_connect_client", None):
  REQUEST.RESPONSE.expireCookie('__ac_openidconnect_hash', path='/')

# PAS logout, if user is from a PAS user folder (which is the acquisition parent of the user)
getattr(
  user,
  'resetCredentials',
  lambda **kw: None,
)(
  request=REQUEST,
  response=REQUEST.RESPONSE,
)

return REQUEST.RESPONSE.redirect(REQUEST.URL1 + '/logged_out')
